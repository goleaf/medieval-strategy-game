export type SiegeTargetKind = "building" | "resource_field" | "world_wonder" | "wonder_support"

export interface VillageSiegeBuildingSnapshot {
  id: string
  type: string
  level: number
  slot?: number | null
}

export interface VillageSiegeResourceFieldSnapshot {
  id: string
  resource: "wood" | "clay" | "iron" | "crop"
  slot: number
  level: number
}

export type VillageSiegeKind = "standard" | "world_wonder"

export interface VillageSiegeSnapshot {
  villageId: string
  isCapital: boolean
  kind: VillageSiegeKind
  buildings: VillageSiegeBuildingSnapshot[]
  resourceFields: VillageSiegeResourceFieldSnapshot[]
}

export interface FieldTargetingRule {
  enabled: boolean
  allowSlotSelection: boolean
  randomEligible: boolean
  selectionMode: "highest_first" | "even_spread"
  capitalProtection: { mode: "immune" | "floor" | "none"; floorLevel?: number }
  resilienceMultiplier: number
}

export interface CatapultRules {
  version: string
  notes?: string[]
  randomnessPct: number
  shotPower: {
    base: number
    techPctPerLevel: number
    artifactPct?: number
  }
  floors: {
    building: Record<string, number>
    default: number
  }
  targeting: {
    excludedBuildings: string[]
    fieldRule: FieldTargetingRule
  }
  resilience: {
    baseCurve: number[]
    greatBuildingMultiplier: number
    resourceFieldMultiplier: number
    worldWonderMultiplier: number
    overrides: Record<
      string,
      {
        multiplier?: number
        floor?: number
        dropCap?: number
      }
    >
  }
  stonemason: {
    reductionPct: number
    allowedInWonder: boolean
  }
  wonder: {
    dropCapPerWave: number
    allowRandomTargets: boolean
  }
  randomSeedSalt: string
}

export interface CatapultModifiers {
  techLevel?: number
  artifactPct?: number
  eventPct?: number
}

export interface CatapultSelectionInput {
  raw: string
  normalized: string
}

export interface CatapultTargetReference {
  id: string
  label: string
  kind: SiegeTargetKind
  structureId?: string
  resource?: { type: "wood" | "clay" | "iron" | "crop"; slot: number }
  beforeLevel: number
  floorLevel: number
  resilienceMultiplier: number
  wonderDropCap?: number
}

export interface CatapultTargetHit {
  selection?: string
  targetId: string
  targetLabel: string
  targetKind: SiegeTargetKind
  structureId?: string
  resource?: { type: "wood" | "clay" | "iron" | "crop"; slot: number }
  beforeLevel: number
  afterLevel: number
  drop: number
  allocatedShots: number
  shotsUsed: number
  wastedShots: number
  floorApplied?: number
  modifiers: {
    variancePct: number
    stonemasonPct?: number
    artifactPct?: number
    eventPct?: number
  }
  notes?: string[]
}

export interface CatapultDamageResult {
  totalCatapults: number
  totalShots: number
  mode: "random" | "single" | "dual"
  targets: CatapultTargetHit[]
  wastedShots: number
}
