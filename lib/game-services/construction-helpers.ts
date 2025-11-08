import type { BuildingType, ResourceType } from "@prisma/client"
import type { ConstructionEntityKey } from "@/lib/config/construction"

// Normalizes Prisma building identifiers into construction blueprint keys so downstream
// systems can reuse a single tuning source for upgrade costs and timing.
const BUILDING_BLUEPRINT_MAP: Partial<Record<BuildingType, ConstructionEntityKey>> = {
  HEADQUARTER: "main_building",
  BARRACKS: "barracks",
  STABLES: "stable",
  WORKSHOP: "workshop",
  SMITHY: "smithy",
  MARKETPLACE: "marketplace",
  ACADEMY: "academy",
  RESIDENCE: "residence",
  SNOB: "academy",
  RALLY_POINT: "rally_point",
  WALL: "wall",
  WATCHTOWER: "watchtower",
  TEMPLE: "temple",
  FARM: "farm",
  WAREHOUSE: "warehouse",
  GRANARY: "granary",
  CRANNY: "cranny",
  CITY: "main_building",
}

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
