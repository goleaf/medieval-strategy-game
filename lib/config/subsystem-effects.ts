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
  trapper: {
    max_level: number
    capacity_per_level: number
    capture_priority: string[]
    eligible_units: {
      hero: boolean
      siege: boolean
      administrators: boolean
      settlers: boolean
    }
    prisoner_upkeep_policy: "attacker_home" | "defender_home" | "suspended"
    release_cooldown_seconds: number
  }
  roman_build_queue: {
    field_lane_slots: number
    inner_lane_slots: number
    other_tribes_slot_count: number
    payment_policy: "pay_on_queue" | "pay_on_start"
    active_cancel_policy: "disabled" | "linear_refund"
    waiting_cancel_policy: "full_refund" | "partial_refund"
  }
  teuton_raid_focus: {
    cranny_penetration_multiplier: number
    merchant_capacity: number
    merchant_tiles_per_hour: number
    cheap_raider_roi: {
      min_successful_raids: number
      max_successful_raids: number
    }
    fake_attack_population_modifier: number
  }
}

const config = subsystemEffectsRaw as SubsystemEffectsConfig

export function getSubsystemEffectsConfig(): SubsystemEffectsConfig {
  return config
}

export function getWallBalance(wallType: string): WallBalance {
  return config.walls[wallType] ?? config.walls.city_wall
}
