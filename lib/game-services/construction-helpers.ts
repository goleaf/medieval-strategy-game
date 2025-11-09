import type { BuildingType, ResourceType } from "@prisma/client"
import type { ConstructionEntityKey } from "@/lib/config/construction"
import { BUILDING_BLUEPRINT_LOOKUP } from "@/lib/config/building-blueprint-map"

const BUILDING_BLUEPRINT_MAP: Partial<Record<BuildingType, ConstructionEntityKey>> = Object.entries(
  BUILDING_BLUEPRINT_LOOKUP,
).reduce((acc, [type, blueprint]) => {
  acc[type as BuildingType] = blueprint
  return acc
}, {} as Partial<Record<BuildingType, ConstructionEntityKey>>)

const RESOURCE_BLUEPRINT_MAP: Record<ResourceType, ConstructionEntityKey> = {
  WOOD: "wood_field",
  CLAY: "clay_pit",
  IRON: "iron_mine",
  CROP: "crop_field",
}

export type ResourceCost = {
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
}

export function getBlueprintKeyForBuilding(type: BuildingType): ConstructionEntityKey | null {
  return BUILDING_BLUEPRINT_MAP[type] ?? null
}

export function getBlueprintKeyForResource(resource: ResourceType): ConstructionEntityKey {
  return RESOURCE_BLUEPRINT_MAP[resource]
}

export function mapBlueprintCost(cost: {
  wood: number
  clay: number
  iron: number
  crop: number
}): ResourceCost {
  return {
    wood: cost.wood,
    stone: cost.clay,
    iron: cost.iron,
    gold: 0,
    food: cost.crop,
  }
}
