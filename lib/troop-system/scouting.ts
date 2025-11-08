import { createHash } from "node:crypto"

import type { CasualtyProfile, IntelTierDefinition, ScoutingConfig } from "@/lib/game-rules/types"

export type ScoutOutcomeBand = "failure" | "partial_low" | "partial_high" | "full"
export type ScoutFidelity = "none" | "banded" | "exact"

export interface ScoutMissionInput {
  attackingScouts: number
  defendingScouts: number
  attackSmithyLevel?: number
  defenseSmithyLevel?: number
  attackerHeroVision?: number
  defenderHeroCounter?: number
  attackerItemPct?: number
  defenderItemPct?: number
  watchtowerLevel?: number
  nightModifiers?: {
    attackerPct?: number
    defenderPct?: number
    watchtowerPct?: number
  }
  randomSeed: string
  config: ScoutingConfig
}

export interface ScoutMissionResult {
  success: boolean
  band: ScoutOutcomeBand
  ratio: number
  attackerLosses: number
  defenderLosses: number
  attackersSurvived: number
  unlockedTiers: IntelTierDefinition[]
  fidelity: ScoutFidelity
}

function ensurePositive(value: number): number {
  return value <= 0 ? 0 : value
}

function smithyMultiplier(level: number | undefined, pctPerLevel: number): number {
  if (!level || level <= 0) return 1
  return 1 + level * pctPerLevel
}

function heroMultiplier(points: number | undefined, pctPerPoint: number, itemPct = 0): number {
  const heroBonus = (points ?? 0) * pctPerPoint
  return 1 + heroBonus + itemPct
}

function watchtowerMultiplier(level: number | undefined, pctPerLevel: number, extraPct = 0): number {
  const base = level && level > 0 ? level * pctPerLevel : 0
  return 1 + base + extraPct
}

function deterministicRoll(seed: string): number {
  const digest = createHash("sha256").update(seed).digest()
  const value = digest.readUInt32BE(0)
  return value / 0xffffffff
}

function drawDelta(seed: string, bound: number): number {
  if (bound <= 0) return 0
  const roll = deterministicRoll(seed)
  return (roll * 2 - 1) * bound
}

function applyRandomness(value: number, delta: number): number {
  return ensurePositive(value * (1 + delta))
}

function determineBand(ratio: number, thresholds: ScoutingConfig["thresholds"]): ScoutOutcomeBand {
  if (ratio <= thresholds.failure) return "failure"
  if (ratio <= thresholds.partialLow) return "partial_low"
  if (ratio <= thresholds.partialHigh) return "partial_high"
  return "full"
}

function fidelityForBand(band: ScoutOutcomeBand): ScoutFidelity {
  if (band === "failure") return "none"
  if (band === "full") return "exact"
  return "banded"
}

export function resolveScoutMission(input: ScoutMissionInput): ScoutMissionResult {
  const {
    attackingScouts,
    defendingScouts,
    attackSmithyLevel = 0,
    defenseSmithyLevel = 0,
    attackerHeroVision = 0,
    defenderHeroCounter = 0,
    attackerItemPct = 0,
    defenderItemPct = 0,
    watchtowerLevel = 0,
    nightModifiers,
    randomSeed,
    config,
  } = input

  const attackerBase = ensurePositive(attackingScouts)
  const defenderBase = ensurePositive(defendingScouts)
  const smithyPct = config.tech.smithyPctPerLevel

  const attackerMultiplier =
    smithyMultiplier(attackSmithyLevel, smithyPct) *
    heroMultiplier(attackerHeroVision, config.tech.heroVisionPct, attackerItemPct) *
    (1 + (nightModifiers?.attackerPct ?? 0))

  const defenderMultiplier =
    smithyMultiplier(defenseSmithyLevel, smithyPct) *
    heroMultiplier(defenderHeroCounter, config.tech.heroCounterPct, defenderItemPct) *
    watchtowerMultiplier(watchtowerLevel, config.tech.watchtowerPctPerLevel, nightModifiers?.watchtowerPct ?? 0) *
    (1 + (nightModifiers?.defenderPct ?? 0))

  const attackerPower = attackerBase * attackerMultiplier
  const defenderPower = defenderBase * defenderMultiplier

  const bound = config.randomness.boundPct
  const attackerDelta = drawDelta(`${randomSeed}:attacker`, bound)
  const defenderDelta = drawDelta(`${randomSeed}:defender`, bound)

  const adjustedAttacker = applyRandomness(attackerPower, attackerDelta)
  const adjustedDefender = applyRandomness(defenderPower, defenderDelta)

  const ratio = adjustedDefender <= 0 ? Infinity : adjustedAttacker / Math.max(1, adjustedDefender)
  const band = determineBand(ratio, config.thresholds)
  const fidelity = fidelityForBand(band)
  const casualtyBucket: Record<ScoutOutcomeBand | "full", CasualtyProfile> = {
    failure: config.casualties.failure,
    partial_low: config.casualties.partialLow,
    partial_high: config.casualties.partialHigh,
    full: config.casualties.success,
  }
  const casualties = casualtyBucket[band]

  const attackerLosses = Math.min(attackingScouts, Math.round(attackingScouts * casualties.attackerLossPct))
  const defenderLosses = Math.min(defendingScouts, Math.round(defendingScouts * casualties.defenderLossPct))
  const attackersSurvived = Math.max(0, attackingScouts - attackerLosses)

  const unlockedTiers = config.tierThresholds.filter((tier) => ratio >= tier.ratioMin)

  return {
    success: band !== "failure",
    band,
    ratio,
    attackerLosses,
    defenderLosses,
    attackersSurvived,
    unlockedTiers,
    fidelity,
  }
}
