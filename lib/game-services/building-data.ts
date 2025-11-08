import type { BuildingType } from "@prisma/client"

export type LegacyBuildingCosts = Partial<Record<BuildingType, Record<string, number>>>

export const LEGACY_BUILDING_COSTS: LegacyBuildingCosts = {
  HEADQUARTER: { wood: 100, stone: 100, iron: 50, gold: 20, food: 100 },
  MARKETPLACE: { wood: 150, stone: 150, iron: 100, gold: 50, food: 150 },
  BARRACKS: { wood: 200, stone: 100, iron: 150, gold: 0, food: 200 },
  STABLES: { wood: 250, stone: 150, iron: 200, gold: 50, food: 250 },
  WATCHTOWER: { wood: 150, stone: 200, iron: 100, gold: 50, food: 150 },
  WALL: { wood: 50, stone: 300, iron: 50, gold: 0, food: 50 },
  WAREHOUSE: { wood: 300, stone: 200, iron: 100, gold: 0, food: 300 },
  GRANARY: { wood: 200, stone: 150, iron: 50, gold: 0, food: 200 },
  SAWMILL: { wood: 100, stone: 100, iron: 50, gold: 0, food: 100 },
  QUARRY: { wood: 100, stone: 100, iron: 50, gold: 0, food: 100 },
  IRON_MINE: { wood: 100, stone: 100, iron: 100, gold: 0, food: 100 },
  TREASURY: { wood: 200, stone: 200, iron: 200, gold: 100, food: 200 },
  ACADEMY: { wood: 300, stone: 300, iron: 200, gold: 100, food: 300 },
  TEMPLE: { wood: 250, stone: 250, iron: 100, gold: 50, food: 250 },
  HOSPITAL: { wood: 200, stone: 200, iron: 150, gold: 0, food: 200 },
  FARM: { wood: 150, stone: 100, iron: 50, gold: 0, food: 150 },
  SNOB: { wood: 500, stone: 500, iron: 500, gold: 500, food: 500 },
  CITY: { wood: 500, stone: 500, iron: 300, gold: 200, food: 300 },
  EARTH_WALL: { wood: 100, stone: 200, iron: 50, gold: 0, food: 100 },
  BREWERY: { wood: 300, stone: 250, iron: 150, gold: 100, food: 200 },
}

type BuildingBonus = {
  woodProduction?: number
  stoneProduction?: number
  ironProduction?: number
  goldProduction?: number
  foodProduction?: number
  visibility?: number
}

export const BUILDING_BONUSES: Partial<Record<BuildingType, BuildingBonus>> = {
  HEADQUARTER: {},
  MARKETPLACE: {},
  BARRACKS: {},
  STABLES: {},
  WATCHTOWER: { visibility: 2 },
  WALL: {},
  WAREHOUSE: {},
  GRANARY: {},
  SAWMILL: {},
  QUARRY: {},
  IRON_MINE: {},
  TREASURY: {},
  ACADEMY: {},
  TEMPLE: {},
  HOSPITAL: {},
  FARM: {},
  SNOB: {},
  CITY: { woodProduction: 10, stoneProduction: 10, ironProduction: 5, goldProduction: 3, foodProduction: 15 },
  EARTH_WALL: {},
  BREWERY: {},
}

export const LEGACY_BUILDING_TIMES: Partial<Record<BuildingType, number>> = {
  HEADQUARTER: 3600,
  MARKETPLACE: 2700,
  BARRACKS: 2700,
  STABLES: 3600,
  WATCHTOWER: 2700,
  WALL: 2700,
  WAREHOUSE: 2400,
  GRANARY: 2400,
  SAWMILL: 2400,
  QUARRY: 2400,
  IRON_MINE: 2400,
  TREASURY: 3600,
  ACADEMY: 5400,
  TEMPLE: 5400,
  HOSPITAL: 3600,
  FARM: 2400,
  SNOB: 7200,
  CITY: 7200,
  EARTH_WALL: 2700,
  BREWERY: 3600,
}
