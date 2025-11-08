import subsystemEffectsRaw from "@/config/subsystem-effects.json"

export type ResourceSlug = "wood" | "clay" | "iron" | "crop"

export interface WallBalance {
  def_pct_per_level: number
  ram_resistance_multiplier: number
}

export interface SubsystemEffectsConfig {
  walls: Record<string, WallBalance>
  rams: {
    tech_pct_per_level: number
    alpha: number
    beta: number
    gamma: number
  }
  residence: {
    max_loyalty: number
    slots_levels: number[]
  }
  palace: {
    max_loyalty: number
    slots_levels: number[]
    capital_only: boolean
    capital_field_hardcap_level: number | null
    min_level_destroyable: number
  }
  cranny: {
    protects_crop: boolean
    village_cap: number | null
    tribe_defender_mult: Record<string, number>
    tribe_attacker_penetration_mult: Record<string, number>
  }
  hero: {
    eco_pct_per_point: number
    flat_prod_per_level: number
    attack_aura_pct_per_point: number
    defense_aura_pct_per_point: number
    upkeep_crop_per_hour: number
  }
  oasis: {
    annex_radius_tiles: number
    mansion_slots: Record<string, number>
  }
}

const config = subsystemEffectsRaw as SubsystemEffectsConfig

export function getSubsystemEffectsConfig(): SubsystemEffectsConfig {
  return config
}

export function getWallBalance(wallType: string): WallBalance {
  return config.walls[wallType] ?? config.walls.city_wall
}
