import { describe, expect, it } from "vitest"
import {
  applyWallBonus,
  canAnnexMoreOases,
  computeCrannyLoot,
  computeExpansionSlots,
  computeRamDrop,
  computeVillageProduction,
  getAnnexSlotLimit,
  getWallMultiplier,
} from "@/lib/balance/subsystem-effects"

describe("subsystem effects helpers", () => {
  it("applies wall multiplier using configured per-level percentage", () => {
    const multiplier = getWallMultiplier(10, "city_wall")
    expect(multiplier).toBeCloseTo(1.4, 3)

    const boostedDefense = applyWallBonus(1000, 10, "city_wall")
    expect(boostedDefense).toBeCloseTo(1400, 3)
  })

  it("reduces wall levels with ram curve and respects wall resistance", () => {
    const cityDrop = computeRamDrop({ survivingRams: 200, wallLevel: 12, wallType: "city_wall" })
    const earthDrop = computeRamDrop({ survivingRams: 200, wallLevel: 12, wallType: "earth_wall" })

    expect(cityDrop).toBeGreaterThan(earthDrop)
    expect(cityDrop).toBeGreaterThan(0)
    expect(earthDrop).toBeGreaterThan(0)
  })

  it("counts expansion slots for residence and palace thresholds", () => {
    const resLevel20 = computeExpansionSlots({ residenceLevel: 20 })
    expect(resLevel20.total).toBe(2)
    expect(resLevel20.unlockedFrom).toBe("residence")

    const palaceLevel16 = computeExpansionSlots({ palaceLevel: 16, isCapital: true })
    expect(palaceLevel16.total).toBe(2)
    expect(palaceLevel16.unlockedFrom).toBe("palace")
  })

  it("computes cranny lootable resources with tribe modifiers", () => {
    const storage = { wood: 2000, clay: 2000, iron: 2000, crop: 2000, food: 2000 }
    const baseProtection = { wood: 1000, clay: 1000, iron: 1000, crop: 1000, food: 1000 }

    const result = computeCrannyLoot({
      storage,
      baseProtection,
      defenderTribe: "GAULS",
      attackerTribe: "TEUTONS",
    })

    expect(result.protected.wood).toBeCloseTo(1340, 0)
    expect(result.lootable.wood).toBeCloseTo(660, 0)
    expect(result.protected.crop).toBeCloseTo(1340, 0)
    expect(result.protected.food).toBeCloseTo(1340, 0)
  })

  it("aggregates village production with hero and oasis bonuses", () => {
    const production = computeVillageProduction({
      villageId: "1",
      fieldOutputPerHour: { wood: 100, clay: 80, iron: 70, crop: 60 },
      annexedOases: [{ resource: "wood", pct: 25 }],
      hero: {
        alive: true,
        homeVillageId: "1",
        resourceBonusStat: 20,
        resourceBonusMode: "wood",
        level: 5,
      },
    })

    expect(production.wood).toBeCloseTo(137.5, 2)
    expect(production.clay).toBeCloseTo(80, 2)
  })

  it("derives annex slot limits from hero mansion level", () => {
    expect(getAnnexSlotLimit(9)).toBe(0)
    expect(getAnnexSlotLimit(10)).toBe(1)
    expect(getAnnexSlotLimit(17)).toBe(2)
    expect(canAnnexMoreOases(17, 1)).toBe(true)
    expect(canAnnexMoreOases(17, 2)).toBe(false)
  })
})
