import { getTroopSystemConfig } from "./config"
import type { TroopSystemConfig } from "./types"

export type ScoutIntelLevel = "resources_only" | "troops_in_village" | "troops_in_oases" | "buildings_and_levels"

export interface ScoutMissionInput {
  attackingScouts: number
  defendingScouts: number
  attackTechLevel?: number
  defenseTechLevel?: number
  rng?: () => number
  config?: TroopSystemConfig
}

export interface ScoutMissionResult {
  success: boolean
  attackerLosses: number
  defenderLosses: number
  intelLevel: ScoutIntelLevel | null
  detectionChance: number
}

function smithyMultiplier(level: number | undefined, perLevel: number): number {
  return 1 + Math.max(0, level ?? 0) * (perLevel / 100)
}

function determineIntelLevel(scoutsRemaining: number): ScoutIntelLevel {
  if (scoutsRemaining >= 50) return "buildings_and_levels"
  if (scoutsRemaining >= 20) return "troops_in_oases"
  if (scoutsRemaining >= 10) return "troops_in_village"
  return "resources_only"
}

export function resolveScoutMission(input: ScoutMissionInput): ScoutMissionResult {
  const config = input.config ?? getTroopSystemConfig()
  const perLevel = config.globals.smithy.perLevelPct
  const attScore = input.attackingScouts * smithyMultiplier(input.attackTechLevel, perLevel)
  const defScore = input.defendingScouts * smithyMultiplier(input.defenseTechLevel, perLevel)
  const detectionChance = attScore <= 0 ? 0 : attScore / Math.max(attScore + defScore, 1)
  const rng = input.rng ?? Math.random
  const success = attScore > 0 && rng() <= detectionChance

  let attackerLosses: number
  let defenderLosses: number
  let intelLevel: ScoutIntelLevel | null = null

  if (success) {
    attackerLosses = Math.max(0, Math.floor(input.attackingScouts * 0.1))
    defenderLosses = Math.max(0, Math.floor(input.defendingScouts * 0.25))
    const survivors = Math.max(0, input.attackingScouts - attackerLosses)
    intelLevel = determineIntelLevel(survivors)
  } else {
    attackerLosses = input.attackingScouts
    defenderLosses = Math.max(0, Math.floor(input.defendingScouts * 0.05))
  }

  return {
    success,
    attackerLosses,
    defenderLosses,
    intelLevel,
    detectionChance,
  }
}
