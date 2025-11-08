export type UnitRole = "inf" | "cav" | "scout" | "ram" | "catapult" | "settler" | "admin"

export type Mission =
  | "attack"
  | "raid"
  | "siege"
  | "scout"
  | "reinforce"
  | "return"
  | "settler_found"
  | "admin_attack"

export interface UnitCosts {
  wood: number
  clay: number
  iron: number
  crop: number
}

export interface RequirementMap {
  [buildingOrResearch: string]: number
}

export interface LoyaltyHitConfig {
  min: number
  max: number
}

export interface UnitDefinition {
  role: UnitRole
  attack: number
  defInf: number
  defCav: number
  speedTilesPerHour: number
  carry: number
  upkeepCropPerHour: number
  popCost: number
  trainTimeSec: number
  cost: UnitCosts
  buildingReq: RequirementMap
  researchReq: RequirementMap
  loyaltyHit?: LoyaltyHitConfig
  defAdminMult?: number
}

export interface ArmyStack {
  unitType: string
  role: UnitRole
  count: number
  attack: number
  defInf: number
  defCav: number
  carry: number
  smithyAttackLevel?: number
  smithyDefenseLevel?: number
}

export interface ArmyComposition {
  villageId?: string
  label?: string
  stacks: ArmyStack[]
  heroAttackPct?: number
  heroDefensePct?: number
}

export interface BonusModifier {
  id: string
  source?: string
  multiplier: number
}

export interface WallDefinition {
  defPctPerLevel: number
  ramResistance: number
}

export interface TroopSystemConfig {
  globals: {
    serverSpeed: number
    raidLethalityFactor: number
    lossCurvature: Record<"attack" | "siege" | "raid", number>
    smithy: { perLevelPct: number; maxLevel: number }
    wallTypes: Record<string, WallDefinition>
    buildingSpeedMultipliers: Record<string, number[]>
    culturePointsPerVillage: number
    cranny: {
      basePerLevel: number
      tribeMultiplier: Record<string, number>
      attackerPenetrationPct: number
    }
  }
  training: {
    queues: Record<string, UnitRole[]>
    costPolicy: "deduct_on_queue" | "deduct_on_finish"
    starvationPolicy: "oldest_first" | "highest_upkeep_first"
  }
  missions: {
    combat: Mission[]
    nonCombat: Mission[]
    raidLethalityFactor: number
    defaultLootOrder: Array<keyof UnitCosts>
  }
  siege: {
    ram: {
      techPct: number
      alpha: number
      beta: number
      gamma: number
      raidScaling: number
    }
    catapult: {
      techPct: number
      shotDivisor: number
      levelDivisor: number
      minShots: number
    }
  }
  settlement: {
    settlersPerVillage: number
    requiredCulturePoints: number
    loyaltyMax: number
    loyaltyRegenPerHour: number
    foundingResourceCost: UnitCosts
  }
  administration: {
    loyaltyHit: LoyaltyHitConfig
    blockedFloor: number
    captureFloor: number
  }
  loot: {
    fallbackPriority: Array<keyof UnitCosts>
    crannyTolerance: number
  }
  units: Record<string, UnitDefinition>
}

export interface MovementPayload {
  units: Record<string, number>
  carryReserved?: UnitCosts
  resources?: UnitCosts
  targetBuilding?: string
  rams?: number
  catapults?: number
}

export interface MovementRecord {
  id: string
  mission: Mission
  fromVillageId: string
  toVillageId?: string
  toTileX: number
  toTileY: number
  departAt: Date
  arriveAt: Date
  payload: MovementPayload
  status: "en_route" | "resolved" | "returning" | "cancelled"
}

export interface TrainingOrder {
  unitType: string
  count: number
  startAt: Date
  finishAt: Date
  building: "barracks" | "stable" | "workshop" | "residence" | "palace"
}

export interface TechLevels {
  attackLevel?: number
  defenseLevel?: number
}
