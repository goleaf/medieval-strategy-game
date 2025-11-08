import type { CatapultRules } from "./types"

const BASE_CURVE: number[] = [
  0, // unused index 0
  1,
  1.2,
  1.4,
  1.6,
  1.8,
  2.2,
  2.6,
  3.1,
  3.7,
  4.4,
  5.2,
  6.1,
  7.1,
  8.2,
  9.4,
  10.7,
  12.1,
  13.6,
  15.2,
  17,
]

export const DEFAULT_CATAPULT_RULES: CatapultRules = {
  version: "2024-11-classic",
  notes: [
    "Default: classic world rules (fields disabled, WW cap = 1)",
    "Resilience curve loosely mirrors Travian diminishing returns",
  ],
  randomnessPct: 0.05,
  shotPower: {
    base: 1,
    techPctPerLevel: 0.03,
    artifactPct: 0,
  },
  floors: {
    default: 0,
    building: {
      PALACE: 1,
      RESIDENCE: 1,
      RALLY_POINT: 1,
    },
  },
  targeting: {
    excludedBuildings: ["WALL", "EARTH_WALL"],
    fieldRule: {
      enabled: false,
      allowSlotSelection: false,
      randomEligible: false,
      selectionMode: "highest_first",
      capitalProtection: { mode: "none" },
      resilienceMultiplier: 0.9,
    },
  },
  resilience: {
    baseCurve: BASE_CURVE,
    greatBuildingMultiplier: 2.5,
    resourceFieldMultiplier: 0.9,
    worldWonderMultiplier: 20,
    overrides: {
      GREAT_WAREHOUSE: { multiplier: 2.6 },
      GREAT_GRANARY: { multiplier: 2.6 },
      WORLD_WONDER: { multiplier: 25, floor: 0, dropCap: 1 },
    },
  },
  stonemason: {
    reductionPct: 0.2,
    allowedInWonder: false,
  },
  wonder: {
    dropCapPerWave: 1,
    allowRandomTargets: false,
  },
  randomSeedSalt: "catapult-default",
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  if (!source) return target
  const result: any = Array.isArray(target) ? [...(target as any)] : { ...(target as any) }
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      result[key] = value
      continue
    }
    result[key] = deepMerge(result[key], value as any)
  }
  return result
}

export function mergeCatapultRules(overrides?: DeepPartial<CatapultRules>): CatapultRules {
  if (!overrides) {
    return DEFAULT_CATAPULT_RULES
  }
  const clone = JSON.parse(JSON.stringify(DEFAULT_CATAPULT_RULES)) as CatapultRules
  return deepMerge(clone, overrides)
}
