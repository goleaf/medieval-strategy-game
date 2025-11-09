import { describe, expect, it } from "vitest"

import combatBalance from "@/config/combat.json"
import type { ArmyInput, CombatEnvironment } from "@/lib/combat/travian-resolver"
import { resolveBattle } from "@/lib/combat/travian-resolver"

function makeStack(
  unitId: string,
  role: "inf" | "cav" | "ram" | "catapult" | "scout" | "admin" | "settler",
  count: number,
  attack: number,
  defInf: number,
  defCav: number,
): ArmyInput["stacks"][number] {
  return {
    unitId,
    unitType: unitId,
    role,
    count,
    attack,
    defInf,
    defCav,
  }
}

function makeArmy(stacks: ArmyInput["stacks"], label: string): ArmyInput {
  return { stacks, label }
}

function baseEnvironment(overrides: Partial<CombatEnvironment> = {}): CombatEnvironment {
  return {
    mission: "attack",
    wallLevel: 0,
    wallType: "city_wall",
    attackerSize: 1,
    defenderSize: 1,
    seed: "detailed-combat-test",
    ...overrides,
  }
}

describe("Travian combat resolver", () => {
  it("weights defender defense by attacker composition", () => {
    const attackerInf = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att-inf")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const reportInf = resolveBattle({
      attacker: attackerInf,
      defender,
      environment: baseEnvironment(),
    })
    expect(reportInf.aggregates.defender.wInf).toBeCloseTo(1)
    expect(reportInf.aggregates.defender.wCav).toBeCloseTo(0)

    const attackerCav = makeArmy([makeStack("cav", "cav", 100, 60, 30, 70)], "att-cav")
    const reportCav = resolveBattle({
      attacker: attackerCav,
      defender,
      environment: baseEnvironment(),
    })
    expect(reportCav.aggregates.defender.wInf).toBeCloseTo(0)
    expect(reportCav.aggregates.defender.wCav).toBeCloseTo(1)
  })

  it("reduces attacker morale when bullying vastly smaller targets", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const report = resolveBattle({
      attacker,
      defender,
      environment: baseEnvironment({ attackerSize: 1_000_000, defenderSize: 1, seed: "morale-small" }),
    })
    expect(report.multipliers.morale).toBeLessThan(0.4)
    expect(report.attackBreakdown.postMorale).toBeLessThan(report.attackBreakdown.postBonuses)
  })

  it("never grants morale bonuses when attacking stronger opponents", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const report = resolveBattle({
      attacker,
      defender,
      environment: baseEnvironment({ attackerSize: 5_000, defenderSize: 50_000, seed: "morale-strong" }),
    })
    expect(report.multipliers.morale).toBe(1)
  })

  it("draws symmetric bounded luck for identical seeds", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const env = baseEnvironment({ seed: "seed-1" })
    const reportA = resolveBattle({ attacker, defender, environment: env })
    const reportB = resolveBattle({ attacker, defender, environment: env })
    expect(reportA.luck.attacker).toBeCloseTo(-reportA.luck.defender)
    expect(reportA.luck.attacker).toBeCloseTo(reportB.luck.attacker)
    expect(Math.abs(reportA.luck.attacker)).toBeLessThanOrEqual(0.25)
  })

  it("reduces wall bonus when rams are present before combat", () => {
    const attacker = makeArmy([makeStack("ram", "ram", 1000, 10, 5, 5), makeStack("inf", "inf", 1000, 50, 40, 40)], "rams")
    const defender = makeArmy([makeStack("def", "inf", 800, 30, 60, 30)], "wall")
    const env = baseEnvironment({ wallLevel: 10, seed: "ram-wall-seed" })
    const report = resolveBattle({ attacker, defender, environment: env })
    expect(report.preCombat?.wallBefore).toBe(10)
    expect(report.preCombat?.wallAfter).toBeLessThan(10)
    expect(report.preCombat?.wallDrop).toBeGreaterThan(0)
    expect(report.multipliers.wall).toBeCloseTo(1 + (report.preCombat?.wallAfter ?? 0) * (combatBalance.walls.city_wall.def_pct_per_level / 100))
  })

  it("records multiple combat rounds until one side collapses", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 1500, 50, 30, 30), makeStack("cav", "cav", 600, 80, 25, 50)], "multi")
    const defender = makeArmy([makeStack("def-inf", "inf", 1200, 30, 70, 40), makeStack("def-cav", "cav", 400, 25, 40, 80)], "def")
    const report = resolveBattle({
      attacker,
      defender,
      environment: baseEnvironment({ seed: "rounds-seed" }),
    })
    expect(report.rounds.length).toBeGreaterThan(1)
    const totalAttackerCasualties = report.attacker.units.reduce((sum, unit) => sum + unit.casualties, 0)
    const totalRecorded = report.rounds.reduce((sum, round) => sum + round.attackerCasualties, 0)
    expect(totalRecorded).toBe(totalAttackerCasualties)
    expect(report.attacker.totalSurvivors + totalAttackerCasualties).toBe(report.attacker.totalInitial)
  })

  it("applies paladin multipliers when paladin stacks are present", () => {
    const attacker = makeArmy([makeStack("PALADIN", "cav", 100, 60, 40, 50)], "pal")
    const defender = makeArmy([makeStack("def", "inf", 50, 30, 60, 30)], "def")
    const report = resolveBattle({
      attacker,
      defender,
      environment: baseEnvironment({ seed: "paladin-seed" }),
    })
    expect(report.multipliers.paladinAttack).toBeGreaterThan(1)
  })

  it("strong attackers still suffer casualties while wiping defenders", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 5000, 70, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 500, 30, 60, 30)], "def")
    const report = resolveBattle({
      attacker,
      defender,
      environment: baseEnvironment({ seed: "wipe-seed" }),
    })
    expect(report.attackerWon).toBe(true)
    expect(report.lossRates.attacker).toBeGreaterThan(0)
    expect(report.lossRates.defender).toBe(1)
  })

  it("handles empty defender armies gracefully", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([], "def")
    const report = resolveBattle({ attacker, defender, environment: baseEnvironment({ seed: "empty-def" }) })
    expect(report.attackerWon).toBe(true)
    expect(report.defender.totalInitial).toBe(0)
    expect(report.lossRates.defender).toBe(0)
  })

  it("handles zero-attackers gracefully", () => {
    const attacker = makeArmy([], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const report = resolveBattle({ attacker, defender, environment: baseEnvironment({ seed: "empty-att" }) })
    expect(report.attackerWon).toBe(false)
    expect(report.attacker.totalInitial).toBe(0)
    expect(report.lossRates.attacker).toBe(0)
  })
})
