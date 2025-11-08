import { DEFAULT_CATAPULT_RULES, mergeCatapultRules } from "./rules"
import type {
  CatapultDamageResult,
  CatapultModifiers,
  CatapultRules,
  CatapultTargetHit,
  CatapultTargetReference,
  CatapultSelectionInput,
  FieldTargetingRule,
  SiegeTargetKind,
  VillageSiegeSnapshot,
} from "./types"

type TargetingMode = "random" | "one" | "two"

export interface CatapultEngineInput {
  catapults: number
  mode: TargetingMode
  selections: string[]
  snapshot?: VillageSiegeSnapshot | null
  rules?: CatapultRules
  seed?: string
  modifiers?: CatapultModifiers
  shotsSplit: number[]
}

const RESOURCE_KEYS = ["wood", "clay", "iron", "crop"] as const

function normalizeSelection(raw: string): CatapultSelectionInput {
  const normalized = raw.trim().toLowerCase()
  return { raw, normalized }
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(a: number) {
  return function next() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type SelectionDescriptor =
  | { type: "building"; buildingType: string }
  | { type: "resource_category"; resource: (typeof RESOURCE_KEYS)[number] }
  | { type: "resource_tile"; resource: (typeof RESOURCE_KEYS)[number]; slot: number }
  | { type: "wonder"; targetId: string }

const BUILDING_SYNONYMS: Record<string, string> = {
  main_building: "HEADQUARTER",
  headquarter: "HEADQUARTER",
  headquarters: "HEADQUARTER",
  barracks: "BARRACKS",
  stable: "STABLES",
  stables: "STABLES",
  workshop: "WORKSHOP",
  rally_point: "RALLY_POINT",
  rp: "RALLY_POINT",
  residence: "RESIDENCE",
  palace: "PALACE",
  warehouse: "WAREHOUSE",
  granary: "GRANARY",
  capitol: "PALACE",
  cranny: "CRANNY",
  bakery: "BAKERY",
  smithy: "SMITHY",
  hospital: "HOSPITAL",
  academy: "ACADEMY",
  townhall: "TOWNHALL",
  town_hall: "TOWNHALL",
  market: "MARKETPLACE",
  marketplace: "MARKETPLACE",
  treasury: "TREASURY",
  temple: "TEMPLE",
  city: "CITY",
  watchtower: "WATCHTOWER",
  waterworks: "WATERWORKS",
  command_center: "COMMAND_CENTER",
  snob: "SNOB",
  farm: "FARM",
  sawmill: "SAWMILL",
  quarry: "QUARRY",
  iron_mine: "IRON_MINE",
  world_wonder: "WORLD_WONDER",
  ww: "WORLD_WONDER",
  wonder: "WORLD_WONDER",
  great_warehouse: "GREAT_WAREHOUSE",
  great_granary: "GREAT_GRANARY",
}

function parseSelection(input: CatapultSelectionInput): SelectionDescriptor | null {
  const raw = input.normalized
  if (!raw) return null

  if (raw.includes(":")) {
    const parts = raw.split(":")
    if (parts.length >= 2) {
      const maybeResource = parts[0]
      const slot = Number(parts[1])
      if (RESOURCE_KEYS.includes(maybeResource as any) && Number.isFinite(slot)) {
        return { type: "resource_tile", resource: maybeResource as any, slot }
      }
    }
    if (raw.startsWith("field:")) {
      const candidates = raw.replace(/^field:/, "")
      if (RESOURCE_KEYS.includes(candidates as any)) {
        return { type: "resource_category", resource: candidates as any }
      }
    }
  }

  if (RESOURCE_KEYS.includes(raw as any)) {
    return { type: "resource_category", resource: raw as any }
  }

  const mapped = BUILDING_SYNONYMS[raw] ?? raw.toUpperCase()
  if (mapped === "WORLD_WONDER") {
    return { type: "wonder", targetId: mapped }
  }
  return { type: "building", buildingType: mapped }
}

function buildTargetPool(snapshot: VillageSiegeSnapshot | null | undefined, rules: CatapultRules): CatapultTargetReference[] {
  if (!snapshot) return []
  const pool: CatapultTargetReference[] = []

  for (const building of snapshot.buildings) {
    if (!building || building.level <= 0) continue
    if (rules.targeting.excludedBuildings.includes(building.type)) continue

    const override = rules.resilience.overrides[building.type]
    const isWonder = building.type === "WORLD_WONDER" || snapshot.kind === "world_wonder"
    let kind: SiegeTargetKind = isWonder ? "world_wonder" : "building"
    if (!isWonder && (building.type === "GREAT_WAREHOUSE" || building.type === "GREAT_GRANARY")) {
      kind = "wonder_support"
    }

    const baseMultiplier =
      override?.multiplier ??
      (building.type.startsWith("GREAT_") ? rules.resilience.greatBuildingMultiplier : 1)

    const resilienceMultiplier =
      kind === "world_wonder"
        ? rules.resilience.worldWonderMultiplier
        : baseMultiplier

    const floor = override?.floor ?? rules.floors.building[building.type] ?? rules.floors.default
    pool.push({
      id: building.type,
      label: titleCase(building.type),
      kind,
      structureId: building.id,
      beforeLevel: building.level,
      floorLevel: floor,
      resilienceMultiplier,
      wonderDropCap: override?.dropCap,
    })
  }

  if (rules.targeting.fieldRule.enabled) {
    for (const field of snapshot.resourceFields) {
      if (!field || field.level <= 0) continue
      pool.push({
        id: `field:${field.resource}:${field.slot}`,
        label: `${titleCase(field.resource)} Field #${field.slot + 1}`,
        kind: "resource_field",
        structureId: field.id,
        resource: { type: field.resource, slot: field.slot },
        beforeLevel: field.level,
        floorLevel: 0,
        resilienceMultiplier: rules.targeting.fieldRule.resilienceMultiplier,
      })
    }
  }

  return pool
}

function findBuildingTarget(pool: CatapultTargetReference[], buildingType: string): CatapultTargetReference | null {
  return pool.find((entry) => entry.kind !== "resource_field" && entry.id === buildingType) ?? null
}

function findResourceTileTarget(
  pool: CatapultTargetReference[],
  resource: (typeof RESOURCE_KEYS)[number],
  slot?: number,
): CatapultTargetReference | null {
  const candidates = pool.filter((entry) => entry.kind === "resource_field" && entry.resource?.type === resource)
  if (!candidates.length) return null
  if (slot != null) {
    return candidates.find((entry) => entry.resource?.slot === slot) ?? null
  }
  return candidates
    .slice()
    .sort((a, b) => {
      if (b.beforeLevel !== a.beforeLevel) return b.beforeLevel - a.beforeLevel
      return (a.resource?.slot ?? 0) - (b.resource?.slot ?? 0)
    })[0]
}

function resolveSelectionToTarget(
  selection: SelectionDescriptor,
  pool: CatapultTargetReference[],
  fieldRule: FieldTargetingRule,
  isCapital: boolean,
): CatapultTargetReference | null {
  if (selection.type === "building" || selection.type === "wonder") {
    return findBuildingTarget(pool, selection.type === "building" ? selection.buildingType : selection.targetId)
  }
  if (!fieldRule.enabled) return null
  if (selection.type === "resource_tile" && !fieldRule.allowSlotSelection) {
    return null
  }
  const target = findResourceTileTarget(
    pool,
    selection.resource,
    selection.type === "resource_tile" ? selection.slot : undefined,
  )
  if (!target) return null
  if (target.kind === "resource_field") {
    const protection = fieldRule.capitalProtection
    if (isCapital) {
      if (protection.mode === "immune") {
        return null
      }
      if (protection.mode === "floor" && protection.floorLevel != null) {
        target.floorLevel = protection.floorLevel
      }
    }
  }
  return target
}

function cloneTarget(target: CatapultTargetReference): CatapultTargetReference {
  return {
    ...target,
    resource: target.resource ? { ...target.resource } : undefined,
  }
}

function randomTarget(
  pool: CatapultTargetReference[],
  rng: () => number,
  allowFields: boolean,
  allowWonder: boolean,
): CatapultTargetReference | null {
  const candidates = pool.filter((entry) => {
    if (entry.beforeLevel <= entry.floorLevel) return false
    if (!allowFields && entry.kind === "resource_field") return false
    if (!allowWonder && entry.kind === "world_wonder") return false
    return true
  })
  if (!candidates.length) return null
  const index = Math.floor(rng() * candidates.length)
  return cloneTarget(candidates[index])
}

function applyDamageToTarget(
  target: CatapultTargetReference,
  allocatedShots: number,
  rules: CatapultRules,
  modifiers: CatapultModifiers | undefined,
  rng: () => number,
  stonemasonActive: boolean,
): CatapultTargetHit {
  const variance = (rng() * 2 - 1) * rules.randomnessPct
  const artifactPct = modifiers?.artifactPct ?? 0
  const eventPct = modifiers?.eventPct ?? 0
  const techLevel = modifiers?.techLevel ?? 0
  const techBonus = techLevel * rules.shotPower.techPctPerLevel

  const shotPower = rules.shotPower.base * (1 + variance + artifactPct + eventPct + techBonus)
  const stonemasonPct =
    target.kind === "world_wonder" && !rules.stonemason.allowedInWonder ? 0 : stonemasonActive ? rules.stonemason.reductionPct : 0
  const effectiveShotPower = shotPower * (1 - stonemasonPct)
  const totalPower = allocatedShots * effectiveShotPower

  const baseCurve = rules.resilience.baseCurve
  let remainingPower = totalPower
  let level = target.beforeLevel
  const floor = target.floorLevel ?? 0
  let drop = 0
  const dropCap = target.wonderDropCap ?? (target.kind === "world_wonder" ? rules.wonder.dropCapPerWave : undefined)

  while (level > floor) {
    const curveIndex = Math.min(level, baseCurve.length - 1)
    const required = baseCurve[curveIndex] * target.resilienceMultiplier
    if (remainingPower + 1e-6 < required) {
      break
    }
    remainingPower -= required
    level -= 1
    drop += 1
    if (dropCap != null && drop >= dropCap) {
      break
    }
  }

  const powerUsed = totalPower - remainingPower
  const shotsUsed = Math.min(allocatedShots, Math.ceil(powerUsed / Math.max(effectiveShotPower, 0.0001)))
  const wastedShots = allocatedShots - shotsUsed
  const afterLevel = Math.max(level, floor)

  const notes: string[] = []
  if (dropCap != null && drop >= dropCap && remainingPower > 0) {
    notes.push(`Reached per-wave drop cap (${dropCap})`)
  }
  let floorApplied: number | undefined
  if (afterLevel <= floor && level < floor) {
    floorApplied = floor
    if (floor > 0) {
      notes.push(`Floor protection at level ${floor}`)
    }
  }

  return {
    targetId: target.id,
    targetLabel: target.label,
    targetKind: target.kind,
    structureId: target.structureId,
    resource: target.resource ? { ...target.resource } : undefined,
    beforeLevel: target.beforeLevel,
    afterLevel,
    drop: target.beforeLevel - afterLevel,
    allocatedShots,
    shotsUsed,
    wastedShots,
    floorApplied,
    modifiers: {
      variancePct: variance,
      artifactPct,
      eventPct,
      stonemasonPct: stonemasonActive ? stonemasonPct : undefined,
    },
    notes: notes.length ? notes : undefined,
  }
}

function dedupeSelections(targets: CatapultTargetReference[]): CatapultTargetReference[] {
  if (targets.length < 2) return targets
  const [first, second] = targets
  if (!second) return targets
  const sameStructure =
    first.structureId && second.structureId && first.structureId === second.structureId && first.kind === second.kind
  if (sameStructure) {
    return [first]
  }
  return targets
}

export function resolveCatapultDamage(input: CatapultEngineInput): CatapultDamageResult {
  const totalShots = input.catapults
  const rules = mergeCatapultRules(input.rules ?? undefined)
  const rngSeed = hashSeed(`${rules.randomSeedSalt}:${input.seed ?? "default"}`)
  const rng = mulberry32(rngSeed)

  if (!input.snapshot || !totalShots) {
    return { totalCatapults: input.catapults, totalShots, mode: "random", targets: [], wastedShots: totalShots }
  }

  const pool = buildTargetPool(input.snapshot, rules)
  const selections = input.selections.map((entry) => parseSelection(normalizeSelection(entry))).filter(Boolean) as SelectionDescriptor[]

  let resolvedTargets: CatapultTargetReference[] = []
  const fieldRule = rules.targeting.fieldRule

  if (input.mode === "random" || !selections.length) {
    const random = randomTarget(pool, rng, fieldRule.randomEligible, rules.wonder.allowRandomTargets)
    if (random) {
      resolvedTargets = [random]
    }
  } else {
    for (const selection of selections.slice(0, input.mode === "two" ? 2 : 1)) {
      const target = resolveSelectionToTarget(selection, pool, fieldRule, input.snapshot.isCapital)
      if (target) {
        resolvedTargets.push(cloneTarget(target))
      }
    }
  }

  if (resolvedTargets.length === 0 && input.mode !== "random") {
    const fallback = randomTarget(pool, rng, fieldRule.randomEligible, rules.wonder.allowRandomTargets)
    if (fallback) {
      resolvedTargets = [fallback]
    }
  }

  resolvedTargets = dedupeSelections(resolvedTargets)

  let shotBuckets = input.shotsSplit.length ? [...input.shotsSplit] : [input.catapults]
  if (resolvedTargets.length === 1 && shotBuckets.length > 1) {
    shotBuckets = [shotBuckets.reduce((sum, value) => sum + value, 0)]
  }

  if (!resolvedTargets.length) {
    return { totalCatapults: input.catapults, totalShots, mode: input.mode === "two" ? "dual" : input.mode === "one" ? "single" : "random", targets: [], wastedShots: totalShots }
  }

  const modeLabel = input.mode === "random" ? "random" : resolvedTargets.length === 2 ? "dual" : "single"
  const stonemasonActive = input.snapshot.buildings.some((b) => b.type === "STONEMASON" && b.level > 0)

  const hits: CatapultTargetHit[] = []
  let accumulatedWaste = 0

  for (let index = 0; index < resolvedTargets.length; index += 1) {
    const target = resolvedTargets[index]
    const shots = shotBuckets[index] ?? shotBuckets[0] ?? totalShots
    if (shots <= 0) {
      continue
    }
    if (target.beforeLevel <= target.floorLevel) {
      hits.push({
        targetId: target.id,
        targetLabel: target.label,
        targetKind: target.kind,
        structureId: target.structureId,
        resource: target.resource ? { ...target.resource } : undefined,
        beforeLevel: target.beforeLevel,
        afterLevel: target.beforeLevel,
        drop: 0,
        allocatedShots: shots,
        shotsUsed: 0,
        wastedShots: shots,
        floorApplied: target.floorLevel,
        modifiers: {
          variancePct: 0,
        },
        notes: ["Target protected by floor"],
      })
      accumulatedWaste += shots
      continue
    }
    const hit = applyDamageToTarget(target, shots, rules, input.modifiers, rng, stonemasonActive)
    hits.push(hit)
    accumulatedWaste += hit.wastedShots
  }

  const totalWaste = Math.min(totalShots, accumulatedWaste)

  return {
    totalCatapults: input.catapults,
    totalShots,
    mode: modeLabel,
    targets: hits,
    wastedShots: totalWaste,
  }
}
