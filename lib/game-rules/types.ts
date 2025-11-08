export type IntelTierId = "tier_a" | "tier_b" | "tier_c" | "tier_d" | "tier_e"

export interface IntelTierDefinition {
  id: IntelTierId
  label: string
  ratioMin: number
  description: string
}

export interface CasualtyProfile {
  attackerLossPct: number
  defenderLossPct: number
}

export interface ResourceBand {
  label: string
  minPct: number
  maxPct: number | null
}

export interface TroopBand {
  label: string
  min: number
  max: number | null
}

export interface SpamThrottleConfig {
  windowSeconds: number
  maxReportsPerWindow: number
  minScoutsPerReport: number
}

export interface ScoutingTechConfig {
  smithyPctPerLevel: number
  heroVisionPct: number
  heroCounterPct: number
  watchtowerPctPerLevel: number
  heroItems?: {
    spyglassPct?: number
    darkCloakPct?: number
  }
}

export interface ScoutingConfig {
  thresholds: {
    failure: number
    partialLow: number
    partialHigh: number
  }
  randomness: {
    boundPct: number
  }
  tierThresholds: IntelTierDefinition[]
  casualties: {
    failure: CasualtyProfile
    partialLow: CasualtyProfile
    partialHigh: CasualtyProfile
    success: CasualtyProfile
  }
  partialFidelity: {
    resourceBands: ResourceBand[]
    troopBands: TroopBand[]
    reinforcementBands: TroopBand[]
    trapBands: TroopBand[]
  }
  spam: SpamThrottleConfig
  oasisIntelEnabled: boolean
  tech: ScoutingTechConfig
}

export type NightPolicyMode = "NONE" | "BONUS" | "TRUCE"
export type NightTrucePolicy = "BLOCK_SEND" | "DELAY_RESOLVE"

export interface NightWindow {
  start: string // HH:MM world time (24h)
  end: string // HH:MM world time (24h)
  label?: string
}

export interface NightScoutingModifiers {
  stealthPct?: number
  alertPct?: number
  watchtowerPct?: number
}

export interface NightPolicyConfig {
  mode: NightPolicyMode
  defenseMultiplier: number
  timezone: string
  windows: NightWindow[]
  trucePolicy: NightTrucePolicy
  scoutingModifiers?: NightScoutingModifiers
}
