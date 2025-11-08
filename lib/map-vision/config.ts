import { type AttributeFreshnessEntry, type AttributeKey } from "./types"

const HOUR_MS = 60 * 60 * 1000

export const VISION_DEFAULTS = {
  villagePassiveRadius: 3,
  oasisPassiveRadius: 1,
  reinforcementPassiveRadius: 1,
  heroHomeBonus: 1,
  tileMemoryHours: 48,
  passiveSourceClassPersonal: "personal-passive",
  passiveSourceClassAlliance: "alliance-passive",
  reinforcementSourceClass: "personal-reinforcement",
  allianceReinforcementSourceClass: "alliance-reinforcement",
  staleLabelThresholdHours: 1,
}

export const WATCHTOWER_BONUS_LEVELS = [5, 10, 15, 20]
export const MAX_PASSIVE_RADIUS = VISION_DEFAULTS.villagePassiveRadius + WATCHTOWER_BONUS_LEVELS.length + VISION_DEFAULTS.heroHomeBonus

export const ATTRIBUTE_FRESHNESS_RULES: Record<AttributeKey, { staleAfterHours: number; expireAfterHours: number | null }> = {
  owner: { staleAfterHours: 24, expireAfterHours: 48 },
  population: { staleAfterHours: 2, expireAfterHours: 24 },
  wall: { staleAfterHours: 2, expireAfterHours: 24 },
  oasis: { staleAfterHours: 24, expireAfterHours: 48 },
  special: { staleAfterHours: 24, expireAfterHours: 48 },
}

export const POPULATION_BANDS = [
  { id: "P0", label: "<50", min: 0, max: 49 },
  { id: "P1", label: "50-99", min: 50, max: 99 },
  { id: "P2", label: "100-249", min: 100, max: 249 },
  { id: "P3", label: "250-499", min: 250, max: 499 },
  { id: "P4", label: "500-999", min: 500, max: 999 },
  { id: "P5", label: "1000-1999", min: 1000, max: 1999 },
  { id: "P6", label: "2000+", min: 2000, max: null },
] as const

export const WALL_BANDS = [
  { id: "W0", label: "≤5", min: 0, max: 5 },
  { id: "W1", label: "6-10", min: 6, max: 10 },
  { id: "W2", label: "11-15", min: 11, max: 15 },
  { id: "W3", label: "16-20", min: 16, max: null },
] as const

export type AttributeStatus = "FRESH" | "STALE" | "UNKNOWN"

export function getAttributeStatus(entry: AttributeFreshnessEntry | undefined, key: AttributeKey, now = new Date()): AttributeStatus {
  if (!entry) return "UNKNOWN"
  const rules = ATTRIBUTE_FRESHNESS_RULES[key]
  if (!rules) return "UNKNOWN"
  const ageMs = now.getTime() - new Date(entry.seenAt).getTime()
  if (ageMs <= rules.staleAfterHours * HOUR_MS) {
    return "FRESH"
  }
  if (rules.expireAfterHours && ageMs > rules.expireAfterHours * HOUR_MS) {
    return "UNKNOWN"
  }
  return "STALE"
}

export function calculateWatchtowerBonus(level: number | null | undefined): number {
  if (!level) return 0
  return WATCHTOWER_BONUS_LEVELS.reduce((bonus, threshold) => {
    return bonus + (level >= threshold ? 1 : 0)
  }, 0)
}

export function populationToBand(population: number | undefined | null) {
  if (population === null || population === undefined) return null
  return POPULATION_BANDS.find((band) => population >= band.min && (band.max === null || population <= band.max)) ?? POPULATION_BANDS.at(-1) ?? null
}

export function wallLevelToBand(level: number | undefined | null) {
  if (level === null || level === undefined) return null
  return WALL_BANDS.find((band) => level >= band.min && (band.max === null || level <= band.max)) ?? WALL_BANDS.at(-1) ?? null
}

export function getTileMemoryExpiry(now = new Date(), hours = VISION_DEFAULTS.tileMemoryHours) {
  return new Date(now.getTime() + hours * HOUR_MS)
}
