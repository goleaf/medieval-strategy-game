import type { CombatConfig, CombatEnvironment } from "@/lib/combat/travian-resolver"

/**
 * Computes the morale multiplier for the attacking army based on world settings
 * and the encounter configuration. The function mirrors the in-game behaviour
 * documented by InnoGames: attackers larger than their target have their power
 * scaled down while underdogs never receive a boost above 100%.
 */
export function calculateMoraleMultiplier(
  environment: CombatEnvironment,
  config: CombatConfig,
): number {
  // Morale configuration lives on the combat config alongside other scalars.
  const { morale, size_floor: sizeFloor } = config
  const { attackerSize, defenderSize, mission, defenderAccountAgeDays } = environment

  // Scout-only missions ignore morale according to the official ruleset.
  if (mission === "scout") {
    return 1
  }

  // Barbarian or abandoned villages surface as missing defender size. These
  // targets are always fought at full morale regardless of the attacker.
  if (defenderSize == null || defenderSize <= 0) {
    return 1
  }

  // Worlds can set a points floor so brand-new accounts do not trigger extreme
  // ratios. We clamp both sides to that floor before comparing them.
  const safeAttackerSize = Math.max(sizeFloor, attackerSize ?? sizeFloor)
  const safeDefenderSize = Math.max(sizeFloor, defenderSize)

  // If the attacker is not larger there is no morale penalty to apply.
  if (safeAttackerSize <= safeDefenderSize) {
    return 1
  }

  // Base morale follows the official Tribal Wars formula `(defender / attacker)^k`.
  // The exponent (k) is configurable so worlds can tune the overall slope.
  const ratio = safeDefenderSize / safeAttackerSize
  const baseMorale = Math.pow(ratio, morale.exponent)

  // Enforce the configured min/max bounds; defaults keep morale between 30% and 100%.
  const boundedMorale = clamp(baseMorale, morale.min_att_mult, morale.max_att_mult)

  // Worlds may optionally raise the floor for long-lived but low-point defenders.
  // The effect interpolates linearly up to the configured target floor.
  const timeFloor = morale.time_floor
  if (!timeFloor?.enabled || defenderAccountAgeDays == null) {
    return boundedMorale
  }

  const progress = clamp(
    defenderAccountAgeDays / Math.max(1, timeFloor.full_effect_days),
    0,
    1,
  )
  const targetFloor = clamp(timeFloor.floor, morale.min_att_mult, morale.max_att_mult)
  const dynamicFloor = morale.min_att_mult + (targetFloor - morale.min_att_mult) * progress

  return Math.max(boundedMorale, dynamicFloor)
}

/**
 * Helper clamp used by the morale calculations to stay within configured bounds.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
