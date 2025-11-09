import { describe, expect, it } from "vitest"

import { buildArmyComposition } from "@/lib/troop-system/army"
import { resolveCombatMission } from "@/lib/troop-system/mission-engine"
import { computeTravel } from "@/lib/troop-system/movement"
import { enqueueTraining } from "@/lib/troop-system/training"
import { resolveSettlerRace, checkSettlementPrerequisites, resolveSettlementOutcome } from "@/lib/troop-system/settlement"
import { resolveScoutMission } from "@/lib/troop-system/scouting"
import { computeUpkeep, resolveStarvation } from "@/lib/troop-system/upkeep"
import { getTroopSystemConfig } from "@/lib/troop-system/config"
import { DEFAULT_SCOUTING_CONFIG } from "@/lib/game-rules/defaults"

describe("troop-system fundamentals", () => {
  it("computes travel speed using slowest unit", () => {
    const travel = computeTravel({
      from: { x: 0, y: 0 },
      to: { x: 6, y: 8 }, // distance 10
      mission: "attack",
      stacks: [
        { unitType: "spear_fighter", count: 100 },
        { unitType: "light_cavalry", count: 50 },
      ],
    })
    expect(travel.distance).toBeCloseTo(10, 5)
    expect(travel.slowestSpeed).toBeCloseTo(3.33, 2)
    expect(travel.durationHours).toBeCloseTo(10 / 3.33, 3)
  })

  it("queues training with building speed multipliers", () => {
    const { order, totalCost, totalDurationSeconds } = enqueueTraining({
      unitType: "spear_fighter",
      count: 10,
      buildingType: "barracks",
      buildingLevel: 5,
    })

    expect(order.startAt).toBeInstanceOf(Date)
    expect(order.finishAt).toBeInstanceOf(Date)
    expect(totalCost.wood).toBe(500)
    expect(totalCost.iron).toBe(100)
    expect(totalDurationSeconds).toBeGreaterThan(0)
  })
})

describe("combat mission engine", () => {
  it("applies siege, loot, and loyalty logic", () => {
    const attacker = buildArmyComposition({
      label: "attacker",
      stacks: [
        { unitType: "spear_fighter", count: 80, tech: { attackLevel: 5 } },
        { unitType: "ram", count: 15, tech: { attackLevel: 3 } },
        { unitType: "catapult", count: 10, tech: { attackLevel: 2 } },
        { unitType: "admin", count: 2, tech: { attackLevel: 1 } },
      ],
    })
    const defender = buildArmyComposition({
      label: "defender",
      stacks: [{ unitType: "spear_fighter", count: 60, tech: { defenseLevel: 3 } }],
    })

    const config = getTroopSystemConfig()
    const travel = computeTravel({
      from: { x: 0, y: 0 },
      to: { x: 3, y: 4 },
      mission: "attack",
      stacks: attacker.stacks.map((stack) => ({ unitType: stack.unitType, count: stack.count })),
      config,
    })

    const result = resolveCombatMission({
      mission: "admin_attack",
      attacker,
      defender,
      wall: { type: "city_wall", level: 10 },
      siege: {
        wall: { type: "city_wall", level: 10 },
        targets: [
          { id: "warehouse", level: 10 },
          { id: "granary", level: 8 },
        ],
        allowDualTargets: true,
      },
      loot: {
        defenderResources: { wood: 5000, clay: 4000, iron: 3000, crop: 2000 },
        crannyLevel: 5,
      },
      loyalty: {
        currentLoyalty: 60,
        captureAllowed: true,
        rng: () => 0.5,
      },
      travel,
    })

    expect(result.battle).toBeDefined()
    if (result.ramResolution) {
      expect(result.ramResolution.levelDrop).toBeGreaterThanOrEqual(0)
    }
    if (result.catapultResolution) {
      expect(result.catapultResolution.targets.length).toBeGreaterThan(0)
    }
    if (result.lootResolution) {
      expect(result.lootResolution.taken.wood).toBeGreaterThanOrEqual(0)
    }
    if (result.loyaltyResolution) {
      expect(result.loyaltyResolution.delta).toBeDefined()
    }
    if (result.returnPlan) {
      expect(result.returnPlan.mission).toBe("return")
    }
  })
})

describe("settlers, scouting, and upkeep", () => {
  it("resolves settler prerequisites and races", () => {
    const prereq = checkSettlementPrerequisites({
      settlersAvailable: 3,
      culturePoints: 2500,
      expansionSlots: 1,
    })
    expect(prereq.ok).toBe(true)

    const race = resolveSettlerRace([
      { id: "later", arrivalAt: new Date(Date.now() + 1000), hasRequirements: true },
      { id: "earlier", arrivalAt: new Date(), hasRequirements: true },
    ])
    expect(race.winnerId).toBe("earlier")

    const outcome = resolveSettlementOutcome(prereq, true)
    expect(outcome.success).toBe(true)
    expect(outcome.loyaltyGranted).toBe(100)
  })

  it("calculates scouting intel tiers", () => {
    const result = resolveScoutMission({
      attackingScouts: 40,
      defendingScouts: 10,
      attackSmithyLevel: 5,
      defenseSmithyLevel: 2,
      randomSeed: "vitest",
      config: DEFAULT_SCOUTING_CONFIG,
    })
    expect(result.success).toBe(true)
    expect(result.unlockedTiers.length).toBeGreaterThanOrEqual(3)
    expect(result.fidelity).toBe("exact")
  })

  it("applies starvation policy when crop deficit occurs", () => {
    const upkeep = computeUpkeep(
      [
        { unitType: "spear_fighter", count: 100 },
        { unitType: "light_cavalry", count: 20 },
      ],
      50,
    )
    expect(upkeep.netCrop).toBeLessThan(0)
    const deficit = Math.abs(upkeep.netCrop)
    const starvation = resolveStarvation(deficit, [
      { unitType: "spear_fighter", count: 100 },
      { unitType: "light_cavalry", count: 20 },
    ])
    expect(starvation.removals.length).toBeGreaterThan(0)
  })
})
