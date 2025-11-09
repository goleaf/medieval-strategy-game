import type { BuildingType } from "@prisma/client"

// Piecewise exponential curve for Farm capacity that matches anchor points:
// L1=240, L10=1200, L20=4000, L30=12000
export function farmCapacityForLevel(level: number): number {
  if (level <= 0) return 0
  const clampLevel = Math.min(30, Math.max(1, Math.floor(level)))
  if (clampLevel <= 10) {
    const t = (clampLevel - 1) / 9 // 0..1 across 1..10
    return Math.round(240 * Math.pow(5, t))
  }
  if (clampLevel <= 20) {
    const t = (clampLevel - 10) / 10 // 0..1 across 10..20
    return Math.round(1200 * Math.pow(4000 / 1200, t))
  }
  // 21..30
  const t = (clampLevel - 20) / 10
  return Math.round(4000 * Math.pow(12000 / 4000, t))
}

export function sumFarmCapacity(buildings: Array<{ type: BuildingType; level: number }>): number {
  return buildings
    .filter((b) => b.type === "FARM")
    .reduce((sum, b) => sum + farmCapacityForLevel(b.level), 0)
}

// Per-level population consumption for buildings under construction.
// Mirrors VillageDestructionService contributions. Non-listed types default to 0.
const BUILDING_POP_PER_LEVEL: Partial<Record<BuildingType, number>> = {
  HEADQUARTER: 4,
  BARRACKS: 1,
  STABLES: 1,
  WATCHTOWER: 1,
  WALL: 2,
  EARTH_WALL: 2,
  MAKESHIFT_WALL: 1,
  WAREHOUSE: 0,
  GRANARY: 0,
  SAWMILL: 0,
  QUARRY: 0,
  IRON_MINE: 0,
  TREASURY: 0,
  ACADEMY: 0,
  TEMPLE: 0,
  HOSPITAL: 0,
  FARM: 0,
  SNOB: 0,
  COMMAND_CENTER: 4,
  TRAPPER: 0,
  BREWERY: 0,
  WATERWORKS: 0,
  CITY: 0,
}

export function buildingPopulationPerLevel(type: BuildingType): number {
  return BUILDING_POP_PER_LEVEL[type] ?? 0
}

