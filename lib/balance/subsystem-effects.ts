import { getSubsystemEffectsConfig, getWallBalance, type ResourceSlug } from "@/lib/config/subsystem-effects"

const BALANCE = getSubsystemEffectsConfig()

export const RESOURCES = ["wood", "clay", "iron", "crop"] as const
export type Resource = (typeof RESOURCES)[number]
export type TribeId = string

export type ResourceMap = Record<string, number>

export interface HeroEconomicProfile {
  alive: boolean
  homeVillageId?: string | number | null
  resourceBonusStat: number
  resourceBonusMode?: Resource | "all"
  level: number
  flatResourcePerHour?: number
}

export interface AnnexedOasisBonus {
  resource: Resource
  pct: number
}

export interface VillageProductionInput {
  villageId: string | number
  fieldOutputPerHour: Partial<Record<Resource, number>>
  annexedOases?: AnnexedOasisBonus[]
  hero?: HeroEconomicProfile | null
  refineries?: Partial<Record<Resource, number>>
  serverSpeed?: number
}

export interface CrannyLootInput {
  storage: Record<string, number>
  baseProtection: Record<string, number>
  defenderTribe?: string | null
  attackerTribe?: string | null
}

export interface CrannyLootResult {
  protected: ResourceMap
  lootable: ResourceMap
  multipliers: {
    defender: number
    attacker: number
  }
}

function createResourceMap(initial = 0, keys: string[] = [...RESOURCES]): ResourceMap {
  return keys.reduce((acc, key) => {
    acc[key] = initial
    return acc
  }, {} as ResourceMap)
}

function normalizeTribe(value?: string | null): TribeId | undefined {
  if (!value) return undefined
  return value.toLowerCase()
}

function clamp(value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  return Math.max(min, Math.min(max, value))
}

export function getWallMultiplier(wallLevel: number, wallType = "city_wall"): number {
  if (wallLevel <= 0) return 1
  const wall = getWallBalance(wallType)
  return 1 + (wallLevel * wall.def_pct_per_level) / 100
}

export function applyWallBonus(defenseValue: number, wallLevel: number, wallType = "city_wall"): number {
  if (defenseValue <= 0) return 0
  const wallMultiplier = getWallMultiplier(wallLevel, wallType)
  return defenseValue * wallMultiplier
}

export function computeRamDrop(params: {
  survivingRams: number
  ramTechLevel?: number
  wallLevel: number
  wallType?: string
}): number {
  const { survivingRams, wallLevel } = params
  if (survivingRams <= 0 || wallLevel <= 0) {
    return 0
  }

  const { ram_resistance_multiplier } = getWallBalance(params.wallType ?? "city_wall")
  const ramCfg = BALANCE.rams
  const techMultiplier = 1 + (params.ramTechLevel ?? 0) * ramCfg.tech_pct_per_level
  const power = survivingRams * techMultiplier
  const effective = power / Math.max(0.001, ram_resistance_multiplier)
  const numerator = 1 + effective / (ramCfg.beta + ramCfg.gamma * wallLevel)
  const drop = Math.floor(ramCfg.alpha * Math.log(numerator))
  return clamp(drop, 0, wallLevel)
}

export function computeWallLevelAfterAttack(params: {
  currentLevel: number
  survivingRams: number
  ramTechLevel?: number
  wallType?: string
  isRaid?: boolean
}): { drop: number; newLevel: number } {
  if (params.isRaid) {
    return { drop: 0, newLevel: params.currentLevel }
  }
  const drop = computeRamDrop({
    survivingRams: params.survivingRams,
    ramTechLevel: params.ramTechLevel,
    wallLevel: params.currentLevel,
    wallType: params.wallType,
  })
  return { drop, newLevel: Math.max(0, params.currentLevel - drop) }
}

export function recomputeMaxLoyalty(params: {
  currentLoyalty: number
  residenceLevel?: number
  palaceLevel?: number
  isCapital?: boolean
  baseline?: number
}): { maxLoyalty: number; loyalty: number; source: "palace" | "residence" | "baseline" } {
  const residenceLevel = params.residenceLevel ?? 0
  const palaceLevel = params.palaceLevel ?? 0

  if (residenceLevel > 0 && palaceLevel > 0) {
    throw new Error("Residence and Palace cannot coexist in the same village")
  }

  const baseline = params.baseline ?? 100
  const palaceAllowed = palaceLevel > 0 && (!BALANCE.palace.capital_only || params.isCapital)

  if (palaceAllowed) {
    return {
      maxLoyalty: BALANCE.palace.max_loyalty,
      loyalty: Math.min(clamp(params.currentLoyalty), BALANCE.palace.max_loyalty),
      source: "palace",
    }
  }

  if (residenceLevel > 0) {
    return {
      maxLoyalty: BALANCE.residence.max_loyalty,
      loyalty: Math.min(clamp(params.currentLoyalty), BALANCE.residence.max_loyalty),
      source: "residence",
    }
  }

  return {
    maxLoyalty: baseline,
    loyalty: Math.min(clamp(params.currentLoyalty), baseline),
    source: "baseline",
  }
}

function slotsUnlocked(level: number, thresholds: number[]): number {
  return thresholds.filter((checkpoint) => level >= checkpoint).length
}

export function computeExpansionSlots(params: {
  residenceLevel?: number
  palaceLevel?: number
  isCapital?: boolean
}): { total: number; unlockedFrom: "palace" | "residence" | "none"; milestones: number[] } {
  const residenceLevel = params.residenceLevel ?? 0
  const palaceLevel = params.palaceLevel ?? 0

  if (residenceLevel > 0 && palaceLevel > 0) {
    throw new Error("Residence and Palace cannot coexist in the same village")
  }

  const palaceAllowed = palaceLevel > 0 && (!BALANCE.palace.capital_only || params.isCapital)
  if (palaceAllowed) {
    const total = slotsUnlocked(palaceLevel, BALANCE.palace.slots_levels)
    return { total, unlockedFrom: "palace", milestones: BALANCE.palace.slots_levels.filter((lvl) => palaceLevel >= lvl) }
  }

  if (residenceLevel > 0) {
    const total = slotsUnlocked(residenceLevel, BALANCE.residence.slots_levels)
    return {
      total,
      unlockedFrom: "residence",
      milestones: BALANCE.residence.slots_levels.filter((lvl) => residenceLevel >= lvl),
    }
  }

  return { total: 0, unlockedFrom: "none", milestones: [] }
}

function getDefenderMultiplier(tribe?: string | null): number {
  const key = normalizeTribe(tribe)
  return key ? BALANCE.cranny.tribe_defender_mult[key] ?? 1 : 1
}

function getAttackerMultiplier(tribe?: string | null): number {
  const key = normalizeTribe(tribe)
  return key ? BALANCE.cranny.tribe_attacker_penetration_mult[key] ?? 1 : 1
}

export function computeCrannyLoot(input: CrannyLootInput): CrannyLootResult {
  const { storage, baseProtection } = input
  const crannyCfg = BALANCE.cranny
  const defenderMult = getDefenderMultiplier(input.defenderTribe)
  const attackerMult = getAttackerMultiplier(input.attackerTribe)
  const cap = Number.isFinite(crannyCfg.village_cap ?? NaN) ? (crannyCfg.village_cap as number) : Number.POSITIVE_INFINITY

  const resourceKeys = Array.from(
    new Set([...Object.keys(baseProtection ?? {}), ...Object.keys(storage ?? {}), ...RESOURCES]),
  )

  const protectedMap: ResourceMap = {}
  const lootableMap: ResourceMap = {}

  for (const resource of resourceKeys) {
    const available = Math.max(0, storage[resource] ?? 0)
    let base = Math.max(0, baseProtection[resource] ?? 0)
    const isCropResource = resource === "crop" || resource === "food"
    if (isCropResource && !crannyCfg.protects_crop) {
      base = 0
    }

    let protectedAmount = base * defenderMult * attackerMult
    protectedAmount = clamp(protectedAmount, 0, cap)
    protectedAmount = Math.min(protectedAmount, available)

    protectedMap[resource] = protectedAmount
    lootableMap[resource] = Math.max(0, available - protectedAmount)
  }

  return {
    protected: protectedMap,
    lootable: lootableMap,
    multipliers: {
      defender: defenderMult,
      attacker: attackerMult,
    },
  }
}

function heroAppliesToVillage(hero: HeroEconomicProfile | null | undefined, villageId: string | number): hero is HeroEconomicProfile {
  if (!hero || !hero.alive) return false
  if (hero.homeVillageId == null) return false
  return String(hero.homeVillageId) === String(villageId)
}

function heroMultiplierFor(resource: Resource, hero: HeroEconomicProfile): number {
  const perPoint = BALANCE.hero.eco_pct_per_point
  const allocationMode = hero.resourceBonusMode ?? "all"
  const bonus = 1 + Math.max(0, hero.resourceBonusStat) * perPoint
  if (allocationMode === "all") {
    return bonus
  }
  return allocationMode === resource ? bonus : 1
}

function sumOasisBonuses(oases: AnnexedOasisBonus[] | undefined): ResourceMap {
  const map = createResourceMap()
  if (!oases?.length) {
    return map
  }
  for (const oasis of oases) {
    map[oasis.resource] += oasis.pct
  }
  return map
}

export function computeVillageProduction(input: VillageProductionInput): ResourceMap {
  const result = createResourceMap()
  const oasisBonuses = sumOasisBonuses(input.annexedOases)
  const serverSpeed = input.serverSpeed ?? 1
  const heroEligible = heroAppliesToVillage(input.hero, input.villageId)

  for (const resource of RESOURCES) {
    const fieldsOutput = Math.max(0, input.fieldOutputPerHour[resource] ?? 0)
    const oasisMultiplier = 1 + oasisBonuses[resource] / 100
    const heroMultiplier = heroEligible ? heroMultiplierFor(resource, input.hero!) : 1
    const refineryMultiplier = 1 + Math.max(0, input.refineries?.[resource] ?? 0)
    result[resource] = fieldsOutput * oasisMultiplier * heroMultiplier * refineryMultiplier * serverSpeed
  }

  if (heroEligible) {
    const hero = input.hero!
    const flatPerHour =
      hero.flatResourcePerHour != null ? hero.flatResourcePerHour : hero.level * BALANCE.hero.flat_prod_per_level
    if (flatPerHour > 0) {
      if ((hero.resourceBonusMode ?? "all") === "all") {
        const share = flatPerHour / RESOURCES.length
        for (const resource of RESOURCES) {
          result[resource] += share
        }
      } else {
        result[hero.resourceBonusMode as Resource] += flatPerHour
      }
    }
  }

  return result
}

export function getAnnexSlotLimit(heroMansionLevel: number): number {
  const thresholds = Object.entries(BALANCE.oasis.mansion_slots)
    .map(([level, slots]) => ({ level: Number(level), slots }))
    .sort((a, b) => a.level - b.level)

  let limit = 0
  for (const entry of thresholds) {
    if (heroMansionLevel >= entry.level) {
      limit = entry.slots
    }
  }
  return limit
}

export function canAnnexMoreOases(heroMansionLevel: number, currentlyAnnexed: number): boolean {
  const limit = getAnnexSlotLimit(heroMansionLevel)
  return currentlyAnnexed < limit
}

export function isWithinAnnexRadius(distanceInTiles: number): boolean {
  return distanceInTiles <= BALANCE.oasis.annex_radius_tiles
}

export function mapResourceSlug(slug: ResourceSlug): Resource {
  switch (slug) {
    case "wood":
    case "clay":
    case "iron":
    case "crop":
      return slug
    default:
      return "wood"
  }
}
