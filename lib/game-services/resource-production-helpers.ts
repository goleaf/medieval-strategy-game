import {
  getMaxDefinedLevel,
  getResourceLevelConfig,
  type ResourceType as ConfigResourceType,
} from "@/lib/config/resource-system"
import type {
  Hero,
  ResourceProductionModifier,
  ResourceType as PrismaResourceType,
  Troop,
  TroopBalance,
  VillageResourceField,
} from "@prisma/client"

export const RESOURCE_ENUMS: PrismaResourceType[] = ["WOOD", "CLAY", "IRON", "CROP"]

export const RESOURCE_ENUM_TO_CONFIG: Record<PrismaResourceType, ConfigResourceType> = {
  WOOD: "wood",
  CLAY: "clay",
  IRON: "iron",
  CROP: "crop",
}

export function calculateFieldProduction(fields: VillageResourceField[]): Record<PrismaResourceType, number> {
  return fields.reduce<Record<PrismaResourceType, number>>((acc, field) => {
    if (!acc[field.resourceType]) {
      acc[field.resourceType] = 0
    }

    if (field.level <= 0) {
      return acc
    }

    const slug = RESOURCE_ENUM_TO_CONFIG[field.resourceType]
    try {
      const cappedLevel = Math.min(field.level, getMaxDefinedLevel(slug))
      const config = getResourceLevelConfig(slug, cappedLevel)
      acc[field.resourceType] += config.outputPerHour
    } catch {
      // Ignore undefined config levels
    }

    return acc
  }, {
    WOOD: 0,
    CLAY: 0,
    IRON: 0,
    CROP: 0,
  })
}

export function getHeroBonuses(hero?: Hero | null): Record<ConfigResourceType | "all", number> {
  if (!hero) {
    return {
      wood: 0,
      clay: 0,
      iron: 0,
      crop: 0,
      all: 0,
    }
  }

  return {
    wood: hero.woodBonusPercent,
    clay: hero.clayBonusPercent,
    iron: hero.ironBonusPercent,
    crop: hero.cropBonusPercent,
    all: hero.allResourceBonus,
  }
}

export function partitionModifiers(modifiers: ResourceProductionModifier[]) {
  const now = new Date()
  const resource: Record<PrismaResourceType, number> = {
    WOOD: 0,
    CLAY: 0,
    IRON: 0,
    CROP: 0,
  }
  let cropConsumptionReduction = 0

  modifiers
    .filter((modifier) => !modifier.expiresAt || modifier.expiresAt > now)
    .forEach((modifier) => {
      if (modifier.scope === "NET_CROP_CONSUMPTION") {
        cropConsumptionReduction += modifier.percent
        return
      }

      if (modifier.scope === "ALL_RESOURCES") {
        RESOURCE_ENUMS.forEach((type) => {
          resource[type] += modifier.percent
        })
        return
      }

      if (modifier.scope === "SINGLE_RESOURCE" && modifier.resourceType) {
        resource[modifier.resourceType] += modifier.percent
      }
    })

  cropConsumptionReduction = Math.min(0.9, Math.max(0, cropConsumptionReduction))

  return { resource, cropConsumptionReduction }
}

export function calculateCropConsumption(
  troops: Troop[],
  lookup: Map<TroopBalance["troopType"], TroopBalance>,
): number {
  return troops.reduce((total, troop) => {
    const upkeep = lookup.get(troop.type)?.cropUpkeep ?? 1
    return total + troop.quantity * upkeep
  }, 0)
}
