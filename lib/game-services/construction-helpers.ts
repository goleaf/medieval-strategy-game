import type { BuildingType, ResourceType } from "@prisma/client"
import type { ConstructionEntityKey } from "@/lib/config/construction"

// Keep this lookup in sync with the blueprint definitions in `lib/config/construction.ts` so cost/time
// calculations stay aligned with the design brief for each structure.
const BUILDING_BLUEPRINT_MAP: Partial<Record<BuildingType, ConstructionEntityKey>> = {
  HEADQUARTER: "main_building",
  BARRACKS: "barracks",
  WAREHOUSE: "warehouse",
  GRANARY: "granary",
  ACADEMY: "academy",
  RESIDENCE: "residence",
  SNOB: "residence",
  CITY: "main_building",
  SMITHY: "smithy",
  STABLES: "stable",
  WORKSHOP: "workshop",
  MARKETPLACE: "market",
  RALLY_POINT: "rally_point",
  WALL: "wall",
  FARM: "farm",
  CRANNY: "hiding_place",
  WATCHTOWER: "watchtower",
  TEMPLE: "church",
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
