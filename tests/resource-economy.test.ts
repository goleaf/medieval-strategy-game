import { describe, expect, it } from "vitest"
import { getResourceLevelConfig } from "@/lib/config/resource-system"
import {
  ECONOMY_RESOURCES,
  calculateHourlyProduction,
  calculateLootableResources,
  canAfford,
  getFarmPopulationCap,
  getHidingPlaceProtection,
  getWarehouseCapacity,
  hasFarmCapacity,
  roundResourceVector,
  spendResources,
  tickVillageResources,
  type ResourceVector,
} from "@/lib/game-services/resource-economy"

// Shared helper so the tests can create strongly typed resource bundles quickly.
const bundle = (wood: number, clay: number, iron: number): ResourceVector => ({ wood, clay, iron })

describe("resource economy helpers", () => {
  it("computes hourly production with modifiers", () => {
    // Arrange: level data pulled from the shared config for deterministic output.
    const woodLevel = 5
    const clayLevel = 4
    const ironLevel = 3
    const profile = {
      buildingLevels: { wood: woodLevel, clay: clayLevel, iron: ironLevel },
      modifiers: {
        gameSpeed: 2,
        productionFactor: 1.5,
        globalPercentBonus: 0.1,
        perResourcePercentBonus: { wood: 0.2 },
        additionalPercentBonuses: [0.05],
        flatPerHour: { iron: 3 },
      },
    }

    // Act: compute per-hour output.
    const hourly = calculateHourlyProduction(profile)

    // Assert: compare against baseline curve with all multipliers applied.
    const baseWood = getResourceLevelConfig("wood", woodLevel).outputPerHour
    const baseClay = getResourceLevelConfig("clay", clayLevel).outputPerHour
    const baseIron = getResourceLevelConfig("iron", ironLevel).outputPerHour
    const multiplier = 2 * 1.5 * (1 + 0.1) * (1 + 0.05)
    expect(hourly.wood).toBeCloseTo(baseWood * multiplier * (1 + 0.2))
    expect(hourly.clay).toBeCloseTo(baseClay * multiplier)
    expect(hourly.iron).toBeCloseTo(baseIron * multiplier + 3)
  })

  it("ticks production respecting warehouse capacity", () => {
    // Arrange: use a small warehouse so overflow logic is exercised.
    const state = {
      stock: bundle(1100, 100, 100),
      warehouseLevel: 1,
    }
    const profile = {
      buildingLevels: { wood: 5, clay: 5, iron: 5 },
    }

    // Act: simulate one hour of production.
    const result = tickVillageResources(state, profile, 3600 * 12)

    // Assert: wood hits cap while other resources grow normally.
    expect(result.stock.wood).toBe(result.warehouseCapacity)
    expect(result.wasted.wood).toBeGreaterThan(0)
    expect(result.stock.clay).toBeGreaterThan(state.stock.clay)
    expect(result.stock.iron).toBeGreaterThan(state.stock.iron)
  })

  it("applies hiding place protection when calculating loot", () => {
    // Arrange: stash exceeds some resources but not all.
    const stock = bundle(600, 200, 50)

    // Act: compute exposed resources for a level 3 hiding place.
    const exposed = calculateLootableResources(stock, 3)

    // Assert: stash removes the first two entries entirely while leaving iron.
    const stash = getHidingPlaceProtection(3)
    expect(exposed.wood).toBe(Math.max(0, stock.wood - stash))
    expect(exposed.clay).toBe(Math.max(0, stock.clay - stash))
    expect(exposed.iron).toBe(Math.max(0, stock.iron - stash))
  })

  it("handles resource spending and affordability checks", () => {
    // Arrange: create a generous stockpile.
    const stock = bundle(500, 500, 500)
    const cost = bundle(200, 150, 100)

    // Act + Assert: spending succeeds and the helper guards against deficits.
    const updated = spendResources(stock, cost)
    expect(updated).toEqual(bundle(300, 350, 400))
    expect(() => spendResources(bundle(100, 0, 0), cost)).toThrow()
    expect(canAfford(stock, cost)).toBe(true)
    expect(canAfford(bundle(0, 0, 0), cost)).toBe(false)
  })

  it("validates farm capacity before enqueuing population", () => {
    // Arrange: compute cap and ensure helper reacts correctly near the limit.
    const level = 8
    const cap = getFarmPopulationCap(level)

    // Act + Assert: standing population at the cap cannot queue more units.
    expect(hasFarmCapacity(level, cap - 50, 25)).toBe(true)
    expect(hasFarmCapacity(level, cap - 10, 15)).toBe(false)
  })

  it("rounds resource vectors for serialization", () => {
    // Arrange: bundle with floating point precision noise.
    const noisy = bundle(12.34567, 89.9999, 0.0049)

    // Act: round to a single decimal place.
    const rounded = roundResourceVector(noisy, 1)

    // Assert: values are trimmed as expected.
    expect(rounded).toEqual(bundle(12.3, 90, 0))
  })

  it("exposes resource type constants for consumers", () => {
    // Arrange/Act/Assert: ensure the exported list matches the spec order.
    expect(ECONOMY_RESOURCES).toEqual(["wood", "clay", "iron"])
  })

  it("reports warehouse capacity growth", () => {
    // Arrange/Act/Assert: verify monotonic growth and baseline value.
    expect(getWarehouseCapacity(0)).toBeGreaterThan(1000)
    expect(getWarehouseCapacity(5)).toBeGreaterThan(getWarehouseCapacity(1))
  })
})
