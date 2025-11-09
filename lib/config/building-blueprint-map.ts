import { CONSTRUCTION_CONFIG, type ConstructionEntityKey } from "./construction"

const LOOKUP: Record<string, ConstructionEntityKey> = {
  HEADQUARTER: "main_building",
  MARKETPLACE: "market",
  BARRACKS: "barracks",
  STABLES: "stable",
  WORKSHOP: "workshop",
  RALLY_POINT: "rally_point",
  RESIDENCE: "residence",
  ACADEMY: "academy",
  SMITHY: "smithy",
  WALL: "wall",
  WAREHOUSE: "warehouse",
  GRANARY: "granary",
  WATCHTOWER: "watchtower",
  TEMPLE: "church",
  FARM: "farm",
  CRANNY: "hiding_place",
}

export function getBlueprintKeyForType(type: string): ConstructionEntityKey | null {
  const key = LOOKUP[type.toUpperCase()]
  return key ?? null
}

const { buildingBlueprints: CONSTRUCTION_LOOKUP } = CONSTRUCTION_CONFIG

export function getDisplayNameFromType(type: string): string {
  const blueprintKey = getBlueprintKeyForType(type)
  if (blueprintKey) {
    const blueprint = CONSTRUCTION_LOOKUP[blueprintKey]
    if (blueprint?.displayName) {
      return blueprint.displayName
    }
  }
  return formatLabel(type)
}

export function getDisplayNameFromBlueprint(key: ConstructionEntityKey): string {
  const blueprint = CONSTRUCTION_LOOKUP[key]
  if (blueprint?.displayName) {
    return blueprint.displayName
  }
  return formatLabel(key)
}

export function getTypeForBlueprint(key: ConstructionEntityKey): string | null {
  if (!inverseLookup) {
    inverseLookup = Object.entries(LOOKUP).reduce<Record<string, string>>((acc, [type, blueprintKey]) => {
      acc[blueprintKey] = type
      return acc
    }, {})
  }
  return inverseLookup[key] ?? null
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

let inverseLookup: Record<string, string> | null = null

export const BUILDING_BLUEPRINT_LOOKUP = LOOKUP
