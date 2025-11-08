import { getSubsystemEffectsConfig } from "@/lib/config/subsystem-effects"

const SUBSYSTEM_EFFECTS = getSubsystemEffectsConfig()
const TRAPPER_CONFIG = SUBSYSTEM_EFFECTS.trapper

export type TrapPriorityTier = (typeof TRAPPER_CONFIG.capture_priority)[number]
export type TrapperEligibilityKey = keyof typeof TRAPPER_CONFIG.eligible_units
export type PrisonerUpkeepPolicy = typeof TRAPPER_CONFIG.prisoner_upkeep_policy

const clampLevel = (level: number) => Math.max(0, Math.min(level, TRAPPER_CONFIG.max_level))

export class TrapperService {
  static getMaxLevel(): number {
    return TRAPPER_CONFIG.max_level
  }

  static getCapacityPerLevel(): number {
    return TRAPPER_CONFIG.capacity_per_level
  }

  static capacityForLevel(level: number): number {
    const effectiveLevel = clampLevel(Math.floor(level))
    return effectiveLevel * this.getCapacityPerLevel()
  }

  static maxCapacity(): number {
    return this.capacityForLevel(this.getMaxLevel())
  }

  static getCapturePriority(): TrapPriorityTier[] {
    return [...TRAPPER_CONFIG.capture_priority]
  }

  static getReleaseCooldownMs(): number {
    return Math.max(0, TRAPPER_CONFIG.release_cooldown_seconds) * 1000
  }

  static getPrisonerUpkeepPolicy(): PrisonerUpkeepPolicy {
    return TRAPPER_CONFIG.prisoner_upkeep_policy
  }

  static isCategoryEligible(category: TrapperEligibilityKey): boolean {
    return Boolean(TRAPPER_CONFIG.eligible_units[category])
  }

  static getEligibleCategories(): Record<TrapperEligibilityKey, boolean> {
    return { ...TRAPPER_CONFIG.eligible_units }
  }
}
