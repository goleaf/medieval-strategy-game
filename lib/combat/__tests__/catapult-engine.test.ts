import { describe, expect, it } from "vitest"

import { resolveCatapultDamage } from "@/lib/combat/catapult/engine"
import { DEFAULT_CATAPULT_RULES, mergeCatapultRules } from "@/lib/combat/catapult/rules"
import type { VillageSiegeSnapshot } from "@/lib/combat/catapult/types"

function makeSnapshot(partial?: Partial<VillageSiegeSnapshot>): VillageSiegeSnapshot {
  return {
    villageId: "def",
    isCapital: false,
    kind: "standard",
    buildings: [
      { id: "b-main", type: "HEADQUARTER", level: 12 },
      { id: "b-warehouse", type: "WAREHOUSE", level: 15 },
      { id: "b-palace", type: "PALACE", level: 3 },
    ],
    resourceFields: [
      { id: "f-wood-0", resource: "wood", slot: 0, level: 12 },
      { id: "f-wood-1", resource: "wood", slot: 1, level: 9 },
      { id: "f-crop-0", resource: "crop", slot: 0, level: 13 },
    ],
    ...partial,
  }
}

describe("catapult engine", () => {
  it("drops building levels respecting floors", () => {
    const snapshot = makeSnapshot()
    const result = resolveCatapultDamage({
      catapults: 30,
      mode: "one",
      selections: ["palace"],
      snapshot,
      rules: DEFAULT_CATAPULT_RULES,
      seed: "floor-test",
      shotsSplit: [30],
    })

    expect(result.targets).toHaveLength(1)
    const hit = result.targets[0]
    expect(hit.targetId).toBe("PALACE")
    expect(hit.afterLevel).toBeGreaterThanOrEqual(1) // palace floor
    expect(hit.afterLevel).toBeLessThan(hit.beforeLevel)
  })

  it("supports explicit resource field targeting with capital protection", () => {
    const snapshot = makeSnapshot({ isCapital: true })
    const rules = mergeCatapultRules({
      targeting: {
        fieldRule: {
          enabled: true,
          allowSlotSelection: true,
          randomEligible: false,
          selectionMode: "highest_first",
          capitalProtection: { mode: "floor", floorLevel: 10 },
          resilienceMultiplier: 0.8,
        },
      },
    })
    const result = resolveCatapultDamage({
      catapults: 12,
      mode: "one",
      selections: ["wood:0"],
      snapshot,
      rules,
      seed: "field-test",
      shotsSplit: [12],
    })

    expect(result.targets).toHaveLength(1)
    const hit = result.targets[0]
    expect(hit.targetKind).toBe("resource_field")
    expect(hit.afterLevel).toBeGreaterThanOrEqual(10) // capital protection floor
    expect(hit.beforeLevel).toBeGreaterThan(hit.afterLevel)
  })

  it("falls back to random valid targets when selections are invalid", () => {
    const snapshot = makeSnapshot()
    const result = resolveCatapultDamage({
      catapults: 10,
      mode: "two",
      selections: ["unknown", "also-unknown"],
      snapshot,
      rules: DEFAULT_CATAPULT_RULES,
      seed: "random-test",
      shotsSplit: [5, 5],
    })

    expect(result.targets.length).toBeGreaterThan(0)
  })

  it("enforces world wonder drop caps", () => {
    const snapshot = makeSnapshot({
      kind: "world_wonder",
      buildings: [{ id: "ww", type: "WORLD_WONDER", level: 5 }],
    })
    const result = resolveCatapultDamage({
      catapults: 300,
      mode: "one",
      selections: ["world_wonder"],
      snapshot,
      rules: DEFAULT_CATAPULT_RULES,
      seed: "ww-test",
      shotsSplit: [300],
    })

    expect(result.targets).toHaveLength(1)
    const hit = result.targets[0]
    expect(hit.drop).toBeLessThanOrEqual(1)
    expect(hit.notes?.some((note) => note.includes("drop cap"))).toBeTruthy()
  })
})
