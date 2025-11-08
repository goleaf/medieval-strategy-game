import { getTroopSystemConfig } from "./config"
import type { TroopSystemConfig, UnitCosts } from "./types"

export interface SettlementPrerequisitesInput {
  settlersAvailable: number
  culturePoints: number
  expansionSlots: number
  config?: TroopSystemConfig
}

export interface SettlementCheckResult {
  ok: boolean
  settlersRequired: number
  cultureRequired: number
  missing: string[]
}

export interface SettlerArrival {
  id: string
  arrivalAt: Date
  hasRequirements: boolean
}

export interface SettlerRaceResult {
  winnerId?: string
  orderedResults: Array<{ id: string; success: boolean }>
}

export interface SettlementResolution {
  success: boolean
  reason?: string
  settlersConsumed: number
  loyaltyGranted?: number
  foundingCost: UnitCosts
}

function cloneCost(cost: UnitCosts): UnitCosts {
  return { wood: cost.wood, clay: cost.clay, iron: cost.iron, crop: cost.crop }
}

export function checkSettlementPrerequisites(input: SettlementPrerequisitesInput): SettlementCheckResult {
  const config = input.config ?? getTroopSystemConfig()
  const settlersRequired = config.settlement.settlersPerVillage
  const cultureRequired = config.settlement.requiredCulturePoints
  const missing: string[] = []

  if (input.settlersAvailable < settlersRequired) {
    missing.push(`Need ${settlersRequired} settlers`)
  }
  if (input.culturePoints < cultureRequired) {
    missing.push(`Need ${cultureRequired} culture points`)
  }
  if (input.expansionSlots <= 0) {
    missing.push("No free expansion slot")
  }

  return {
    ok: missing.length === 0,
    settlersRequired,
    cultureRequired,
    missing,
  }
}

export function resolveSettlerRace(arrivals: SettlerArrival[]): SettlerRaceResult {
  const ordered = arrivals.slice().sort((a, b) => a.arrivalAt.getTime() - b.arrivalAt.getTime())
  let winnerId: string | undefined
  const orderedResults = ordered.map((arrival) => {
    const success = winnerId === undefined && arrival.hasRequirements
    if (success) winnerId = arrival.id
    return { id: arrival.id, success }
  })
  return { winnerId, orderedResults }
}

export function resolveSettlementOutcome(
  prerequisites: SettlementCheckResult,
  tileAvailable: boolean,
  config?: TroopSystemConfig,
): SettlementResolution {
  const cfg = config ?? getTroopSystemConfig()
  if (!tileAvailable) {
    return {
      success: false,
      reason: "Tile already occupied",
      settlersConsumed: 0,
      foundingCost: cloneCost(cfg.settlement.foundingResourceCost),
    }
  }
  if (!prerequisites.ok) {
    return {
      success: false,
      reason: prerequisites.missing.join("; "),
      settlersConsumed: 0,
      foundingCost: cloneCost(cfg.settlement.foundingResourceCost),
    }
  }

  return {
    success: true,
    settlersConsumed: prerequisites.settlersRequired,
    loyaltyGranted: cfg.settlement.loyaltyMax,
    foundingCost: cloneCost(cfg.settlement.foundingResourceCost),
  }
}
