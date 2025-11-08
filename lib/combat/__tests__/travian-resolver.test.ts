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
      environment: baseEnvironment({ attackerSize: 1_000_000, defenderSize: 1 }),
    })
    expect(report.multipliers.morale).toBeCloseTo(0.3)
    expect(report.attackBreakdown.postMorale).toBeLessThan(report.attackBreakdown.postBonuses)
  })

  it("matches the official 45% example when attacking a target six times smaller", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const report = resolveBattle({
      attacker,
      defender,
      environment: baseEnvironment({ attackerSize: 6000, defenderSize: 1000 }),
    })
    expect(report.multipliers.morale).toBeCloseTo(0.45, 2)
  })

  it("never grants morale bonuses when attacking stronger opponents", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const report = resolveBattle({
      attacker,
      defender,
      environment: baseEnvironment({ attackerSize: 5_000, defenderSize: 50_000 }),
    })
    expect(report.multipliers.morale).toBe(1)
    expect(report.attackBreakdown.postMorale).toBeCloseTo(report.attackBreakdown.postBonuses)
  })

  // The optional time-based morale floor should gently raise the penalty ceiling for older accounts.
  it("raises morale floor for veteran defenders when optional time floor is active", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const report = resolveBattle({
      attacker,
      defender,
      environment: baseEnvironment({
        attackerSize: 1_000_000,
        defenderSize: 1,
        defenderAccountAgeDays: 120,
      }),
      configOverrides: {
        morale: {
          time_floor: { enabled: true, floor: 0.5, full_effect_days: 90 },
        },
      },
    })
    expect(report.multipliers.morale).toBeCloseTo(0.5, 5)
  })

  it("draws symmetric bounded luck for identical seeds", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const env = baseEnvironment({ seed: "seed-1" })
    const reportA = resolveBattle({ attacker, defender, environment: env })
    const reportB = resolveBattle({ attacker, defender, environment: env })
    expect(reportA.luck.attacker).toBeCloseTo(-reportA.luck.defender)
    expect(reportA.luck.attacker).toBeCloseTo(reportB.luck.attacker)
    expect(Math.abs(reportA.luck.attacker)).toBeLessThanOrEqual(reportA.luck.range)
  })

  it("applies wall multiplier strictly with higher levels", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 1000, 50, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 1000, 30, 60, 30)], "def")
    const envLow = baseEnvironment({ wallLevel: 5 })
    const envHigh = baseEnvironment({ wallLevel: 15 })
    const low = resolveBattle({ attacker, defender, environment: envLow })
    const high = resolveBattle({ attacker, defender, environment: envHigh })
    expect(high.defenseBreakdown.postWall).toBeGreaterThan(low.defenseBreakdown.postWall)
  })

  it("computes casualty curve symmetry (winner loses proportionally)", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 5000, 60, 40, 40)], "att")
    const defender = makeArmy([makeStack("def", "inf", 3000, 30, 60, 30)], "def")
    const report = resolveBattle({ attacker, defender, environment: baseEnvironment() })
    expect(report.lossRates.attacker).toBeGreaterThan(0)
    expect(report.lossRates.defender).toBeCloseTo(1)
    const k = (combatBalance as any).curvature_k ?? 1.7
    const expected = Math.pow(report.defenseBreakdown.final / report.attackBreakdown.final, k)
    expect(report.lossRates.attacker).toBeCloseTo(expected, 4)
  })

  it("enforces minimum casualty per unit type on losing side", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 5, 10, 1, 1), makeStack("ram", "ram", 1, 1, 1, 1)], "att")
    const defender = makeArmy([makeStack("def", "inf", 50, 40, 100, 100)], "def")
    const report = resolveBattle({ attacker, defender, environment: baseEnvironment() })
    const ramOutcome = report.attacker.units.find((unit) => unit.unitId === "ram")
    expect(ramOutcome?.casualties).toBeGreaterThanOrEqual(1)
  })

  it("handles empty sides: zero defense wipes without attacker losses", () => {
    const attacker = makeArmy([makeStack("inf", "inf", 100, 50, 40, 40)], "att")
    const defender = makeArmy([], "def")
    const report = resolveBattle({ attacker, defender, environment: baseEnvironment() })
    expect(report.attackerWon).toBe(true)
    expect(report.lossRates.attacker).toBe(0)
    expect(report.lossRates.defender).toBe(1)
  })

  it("handles zero-attackers gracefully", () => {
    const attacker = makeArmy([], "att")
    const defender = makeArmy([makeStack("def", "inf", 100, 30, 60, 30)], "def")
    const report = resolveBattle({ attacker, defender, environment: baseEnvironment() })
    expect(report.attackerWon).toBe(false)
    expect(report.lossRates.attacker).toBe(1)
    expect(report.lossRates.defender).toBe(0)
  })
})
