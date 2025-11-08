import { describe, expect, it } from "vitest"
import { getResourceLevelConfig } from "@/lib/config/resource-system"
import {
  RESOURCE_ENUM_TO_CONFIG,
  calculateCropConsumption,
  calculateFieldProduction,
  partitionModifiers,
} from "@/lib/game-services/resource-production-helpers"
import type {
  ResourceProductionModifier,
  ResourceType,
  Troop,
  TroopBalance,
  VillageResourceField,
} from "@prisma/client"

const now = new Date()

function makeField(resourceType: ResourceType, level: number, slot = 0): VillageResourceField {
  return {
    id: `${resourceType}-${level}-${slot}`,
    villageId: "v1",
    resourceType,
    slot,
    level,
    isUpgrading: false,
    upgradeCompletesAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

function makeModifier(
  overrides: Partial<ResourceProductionModifier>,
): ResourceProductionModifier {
  return {
    id: `mod-${Math.random()}`,
    villageId: "v1",
    scope: "SINGLE_RESOURCE",
    resourceType: "WOOD",
    percent: 0.1,
    sourceType: "HERO",
    sourceId: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: now,
    ...overrides,
  }
}

function makeTroop(type: Troop["type"], quantity: number): Troop {
  return {
    id: `troop-${type}`,
    villageId: "v1",
    type,
    quantity,
    health: 100,
    attack: 10,
    defense: 5,
    speed: 5,
    createdAt: now,
    updatedAt: now,
  }
}

function makeBalance(type: TroopBalance["troopType"], upkeep: number): TroopBalance {
  return {
    id: `balance-${type}`,
    troopType: type,
    costWood: 0,
    costStone: 0,
    costIron: 0,
    costGold: 0,
    costFood: 0,
    health: 100,
    attack: 10,
    defense: 5,
    speed: 5,
    cropUpkeep: upkeep,
    createdAt: now,
    updatedAt: now,
  }
}

describe("resource production helpers", () => {
  it("calculateFieldProduction sums configured outputs", () => {
    const l5 = getResourceLevelConfig("wood", 5).outputPerHour
    const l3 = getResourceLevelConfig("wood", 3).outputPerHour
    const result = calculateFieldProduction([makeField("WOOD", 5, 0), makeField("WOOD", 3, 1)])
    expect(result.WOOD).toBeCloseTo(l5 + l3, 5)
    expect(result.CLAY).toBe(0)
  })

  it("partitionModifiers aggregates and clamps bonuses", () => {
    const modifiers: ResourceProductionModifier[] = [
      makeModifier({ scope: "ALL_RESOURCES", percent: 0.2 }),
      makeModifier({ scope: "SINGLE_RESOURCE", resourceType: "CLAY", percent: 0.15 }),
      makeModifier({ scope: "NET_CROP_CONSUMPTION", percent: 0.05 }),
      makeModifier({ scope: "NET_CROP_CONSUMPTION", percent: 1.0 }),
      makeModifier({
        scope: "SINGLE_RESOURCE",
        resourceType: "IRON",
        percent: 0.1,
        expiresAt: new Date(Date.now() - 1),
      }),
    ]

    const partitioned = partitionModifiers(modifiers)
    expect(partitioned.resource.WOOD).toBeCloseTo(0.2, 5)
    expect(partitioned.resource.CLAY).toBeCloseTo(0.35, 5)
    expect(partitioned.resource.IRON).toBeCloseTo(0.2, 5) // expired modifier ignored
    expect(partitioned.cropConsumptionReduction).toBeCloseTo(0.9, 5) // clamped
  })

  it("calculateCropConsumption sums upkeep using balance lookup", () => {
    const troops = [makeTroop("WARRIOR", 50), makeTroop("SPEARMAN", 25)]
    const lookup = new Map<TroopBalance["troopType"], TroopBalance>([
      ["WARRIOR", makeBalance("WARRIOR", 2)],
      ["SPEARMAN", makeBalance("SPEARMAN", 1)],
    ])

    const consumption = calculateCropConsumption(troops, lookup)
    expect(consumption).toBe(50 * 2 + 25 * 1)
  })
})
