import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"

import { InMemoryRallyPointRepository } from "@/lib/rally-point/testing/in-memory-repository"
import { RallyPointEngine } from "@/lib/rally-point"
import { SimpleCombatResolver } from "@/lib/rally-point/combat"
import type { UnitStats } from "@/lib/rally-point"
import { NightPolicyService } from "@/lib/game-services/night-policy-service"
import type { NightState } from "@/lib/game-services/night-policy-service"

const UNIT_CATALOG: Record<string, UnitStats> = {
  INF: { id: "INF", role: "inf", speed: 6, carry: 50, attack: 40, defense: 35, defInf: 35, defCav: 25 },
  CAV: { id: "CAV", role: "cav", speed: 12, carry: 70, attack: 70, defense: 30, defInf: 20, defCav: 40 },
  RAM: { id: "RAM", role: "ram", speed: 5, carry: 0, attack: 30, defense: 20, defInf: 20, defCav: 10, siege: "ram" },
  CAT: {
    id: "CAT",
    role: "catapult",
    speed: 4,
    carry: 0,
    attack: 60,
    defense: 30,
    defInf: 30,
    defCav: 15,
    siege: "catapult",
  },
}

const MOCK_NIGHT_STATE: NightState = {
  config: {
    mode: "NONE",
    defenseMultiplier: 1,
    timezone: "UTC",
    windows: [],
    trucePolicy: "BLOCK_SEND",
  },
  active: false,
  mode: "NONE",
  defenseMultiplier: 1,
}

const START_TIME = new Date("2024-11-10T00:00:00.000Z").getTime()

function createEngine(repo: InMemoryRallyPointRepository) {
  let now = START_TIME
  const engine = new RallyPointEngine(repo, UNIT_CATALOG, new SimpleCombatResolver(UNIT_CATALOG), {
    now: () => new Date(now),
  })
  const advance = (ms: number) => {
    now += ms
  }
  return { engine, advance }
}

describe("RallyPointEngine", () => {
  let repo: InMemoryRallyPointRepository
  let engine: RallyPointEngine
  let advance: (ms: number) => void

beforeEach(() => {
  vi.spyOn(NightPolicyService, "evaluate").mockResolvedValue(MOCK_NIGHT_STATE)
  repo = new InMemoryRallyPointRepository()
  ;({ engine, advance } = createEngine(repo))
})

afterEach(() => {
  vi.restoreAllMocks()
})

  it("rejects siege missions without siege units", async () => {
    const attacker = repo.seedVillage({ id: "A", ownerAccountId: "attacker", x: 0, y: 0 })
    const defender = repo.seedVillage({ id: "D", ownerAccountId: "defender", x: 20, y: 0 })
    repo.seedRallyPoint({ villageId: attacker.id, level: 20, waveWindowMs: 50, options: {} })
    repo.seedGarrison({ villageId: attacker.id, ownerAccountId: attacker.ownerAccountId, unitTypeId: "INF", count: 50 })

    await expect(
      engine.sendMission({
        sourceVillageId: attacker.id,
        sourceAccountId: attacker.ownerAccountId,
        mission: "siege",
        target: { type: "village", villageId: defender.id },
        units: { INF: 20 },
        idempotencyKey: "idem-siege",
      }),
    ).rejects.toThrow(/Siege missions require rams or catapults/)
  })

  it("ignores catapult targeting below rally point level 10", async () => {
    const attacker = repo.seedVillage({ id: "A", ownerAccountId: "attacker", x: 0, y: 0 })
    const defender = repo.seedVillage({ id: "D", ownerAccountId: "defender", x: 10, y: 0 })
    repo.seedRallyPoint({ villageId: attacker.id, level: 5, waveWindowMs: 150, options: {} })
    repo.seedGarrison({ villageId: attacker.id, ownerAccountId: attacker.ownerAccountId, unitTypeId: "CAT", count: 10 })

    const result = await engine.sendMission({
      sourceVillageId: attacker.id,
      sourceAccountId: attacker.ownerAccountId,
      mission: "attack",
      target: { type: "village", villageId: defender.id },
      units: { CAT: 5 },
      catapultTargets: ["warehouse"],
      idempotencyKey: "idem-catapult",
    })

    expect(result.warnings).toContain("Catapult targeting locked until Rally Point level 10")
    expect(result.movement.payload.catapultTargets).toEqual([])
  })

  it("blocks attacks on beginner-protected villages", async () => {
    const attacker = repo.seedVillage({ id: "A", ownerAccountId: "attacker", x: 0, y: 0 })
    const defender = repo.seedVillage({ id: "D", ownerAccountId: "defender", x: 5, y: 0, beginnerProtected: true })
    repo.seedRallyPoint({ villageId: attacker.id, level: 10, waveWindowMs: 150, options: {} })
    repo.seedGarrison({ villageId: attacker.id, ownerAccountId: attacker.ownerAccountId, unitTypeId: "INF", count: 10 })

    await expect(
      engine.sendMission({
        sourceVillageId: attacker.id,
        sourceAccountId: attacker.ownerAccountId,
        mission: "attack",
        target: { type: "village", villageId: defender.id },
        units: { INF: 5 },
        idempotencyKey: "idem-bp",
      }),
    ).rejects.toThrow(/Target under beginner protection/)
  })

  it("uses the slowest unit speed for travel time", async () => {
    const attacker = repo.seedVillage({ id: "A", ownerAccountId: "attacker", x: 0, y: 0 })
    const defender = repo.seedVillage({ id: "D", ownerAccountId: "defender", x: 0, y: 10 })
    repo.seedRallyPoint({ villageId: attacker.id, level: 10, waveWindowMs: 150, options: {} })
    repo.seedGarrison({ villageId: attacker.id, ownerAccountId: attacker.ownerAccountId, unitTypeId: "INF", count: 10 })
    repo.seedGarrison({ villageId: attacker.id, ownerAccountId: attacker.ownerAccountId, unitTypeId: "CAV", count: 10 })

    const result = await engine.sendMission({
      sourceVillageId: attacker.id,
      sourceAccountId: attacker.ownerAccountId,
      mission: "attack",
      target: { type: "village", villageId: defender.id },
      units: { INF: 5, CAV: 5 },
      idempotencyKey: "idem-travel",
    })

    const travelMs = result.movement.arriveAt.getTime() - result.movement.departAt.getTime()
    expect(travelMs).toBe(1000 * 60 * 60 * (10 / 6))
  })

  it("keeps wave landings within the configured precision window", async () => {
    const attacker = repo.seedVillage({ id: "A", ownerAccountId: "attacker", x: 0, y: 0 })
    const defender = repo.seedVillage({ id: "D", ownerAccountId: "defender", x: 5, y: 0 })
    repo.seedRallyPoint({ villageId: attacker.id, level: 20, waveWindowMs: 50, options: {} })
    repo.seedGarrison({ villageId: attacker.id, ownerAccountId: attacker.ownerAccountId, unitTypeId: "INF", count: 40 })

    const arriveAt = new Date(START_TIME + 4 * 60 * 60 * 1000)
    const wave = await engine.sendWaveGroup({
      sourceVillageId: attacker.id,
      sourceAccountId: attacker.ownerAccountId,
      arriveAt,
      tag: "wave",
      members: [
        {
          sourceVillageId: attacker.id,
          sourceAccountId: attacker.ownerAccountId,
          mission: "attack",
          target: { type: "village", villageId: defender.id },
          units: { INF: 10 },
        },
        {
          sourceVillageId: attacker.id,
          sourceAccountId: attacker.ownerAccountId,
          mission: "attack",
          target: { type: "village", villageId: defender.id },
          units: { INF: 10 },
        },
      ],
      idempotencyKey: "idem-wave",
    })

    const [a, b] = wave.movements
    const delta = Math.abs(a.arriveAt.getTime() - b.arriveAt.getTime())
    expect(delta).toBeLessThanOrEqual(50)
  })

  it("processes reinforcements before attacks landing in the same tick", async () => {
    const defender = repo.seedVillage({ id: "D", ownerAccountId: "defender", x: 50, y: 50 })
    const allyVillage = repo.seedVillage({ id: "ALLY", ownerAccountId: "ally", x: 40, y: 40 })
    const enemyVillage = repo.seedVillage({ id: "ENEMY", ownerAccountId: "enemy", x: 60, y: 60 })


    await repo.withTransaction(async (trx) => {
      await trx.createMovement({
        id: "reinforce-move",
        mission: "reinforce",
        ownerAccountId: "ally",
        fromVillageId: allyVillage.id,
        toVillageId: defender.id,
        toTileX: defender.x,
        toTileY: defender.y,
        departAt: new Date(START_TIME - 1000),
        arriveAt: new Date(START_TIME),
        payload: { units: { INF: 5 } },
        status: "en_route",
        createdBy: "player",
        createdAt: new Date(START_TIME - 2000),
        updatedAt: new Date(START_TIME - 2000),
      })
      await trx.createMovement({
        id: "attack-move",
        mission: "attack",
        ownerAccountId: "enemy",
        fromVillageId: enemyVillage.id,
        toVillageId: defender.id,
        toTileX: defender.x,
        toTileY: defender.y,
        departAt: new Date(START_TIME - 1000),
        arriveAt: new Date(START_TIME),
        payload: { units: { INF: 5 } },
        status: "en_route",
        createdBy: "player",
        createdAt: new Date(START_TIME - 2000),
        updatedAt: new Date(START_TIME - 2000),
      })
    })

    advance(2000)
    const results = await engine.resolveDueMovements()
    expect(results[0].movement.mission).toBe("reinforce")
    expect(results[1].movement.mission).toBe("attack")
    const combatReport = results.find((entry) => entry.report)?.report
    expect(combatReport?.battleReport).toBeDefined()
  })

  it("cancels movements within the grace window and refunds units", async () => {
    const attacker = repo.seedVillage({ id: "A", ownerAccountId: "attacker", x: 0, y: 0 })
    const defender = repo.seedVillage({ id: "D", ownerAccountId: "defender", x: 5, y: 0 })
    repo.seedRallyPoint({ villageId: attacker.id, level: 10, waveWindowMs: 150, options: {} })
    repo.seedGarrison({ villageId: attacker.id, ownerAccountId: attacker.ownerAccountId, unitTypeId: "INF", count: 10 })

    const { movement } = await engine.sendMission({
      sourceVillageId: attacker.id,
      sourceAccountId: attacker.ownerAccountId,
      mission: "attack",
      target: { type: "village", villageId: defender.id },
      units: { INF: 5 },
      idempotencyKey: "idem-cancel",
    })

    const cancelled = await engine.cancelMovement(movement.id, attacker.ownerAccountId)
    expect(cancelled).toBe(true)

    const stacks = await repo.withTransaction((trx) => trx.getOwnerGarrison(attacker.id, attacker.ownerAccountId))
    expect(stacks.find((s) => s.unitTypeId === "INF")?.count).toBe(10)
  })

  it("creates recall movements for stationed reinforcements", async () => {
    const host = repo.seedVillage({ id: "H", ownerAccountId: "host", x: 5, y: 5 })
    const home = repo.seedVillage({ id: "O", ownerAccountId: "owner", x: 0, y: 0 })
    repo.seedRallyPoint({ villageId: home.id, level: 10, waveWindowMs: 150, options: {} })
    repo.seedGarrison({ villageId: host.id, ownerAccountId: "owner", unitTypeId: "INF", count: 20 })

    const movement = await engine.recallReinforcements({
      fromVillageId: host.id,
      toVillageId: home.id,
      ownerAccountId: "owner",
      units: { INF: 10 },
      idempotencyKey: "idem-recall",
    })

    expect(movement.mission).toBe("return")
    const stacks = await repo.withTransaction((trx) => trx.getOwnerGarrison(host.id, "owner"))
    expect(stacks.find((s) => s.unitTypeId === "INF")?.count).toBe(10)
  })

  it("stores per-unit tech levels on outgoing missions", async () => {
    const attacker = repo.seedVillage({ id: "A", ownerAccountId: "attacker", x: 0, y: 0 })
    const defender = repo.seedVillage({ id: "D", ownerAccountId: "defender", x: 5, y: 0 })
    repo.seedRallyPoint({ villageId: attacker.id, level: 10, waveWindowMs: 150, options: {} })
    repo.seedGarrison({
      villageId: attacker.id,
      ownerAccountId: attacker.ownerAccountId,
      unitTypeId: "INF",
      count: 20,
      smithyAttackLevel: 4,
      smithyDefenseLevel: 2,
    })

    const { movement } = await engine.sendMission({
      sourceVillageId: attacker.id,
      sourceAccountId: attacker.ownerAccountId,
      mission: "attack",
      target: { type: "village", villageId: defender.id },
      units: { INF: 10 },
      idempotencyKey: "idem-tech",
    })

    expect(movement.payload.techLevels?.INF).toEqual({ attack: 4, defense: 2 })
  })
})
