import { TrapperService } from "@/lib/game-services/trapper-service"
import type { VillageSiegeSnapshot } from "@/lib/combat/catapult/types"
import type { UnitsComposition, UnitStats, TrapResolutionEntry } from "./types"

const FAST_RAIDER_SPEED = 16
const DEFENSE_FAVOR_THRESHOLD = 1

function cloneUnits(units: UnitsComposition): UnitsComposition {
  return Object.entries(units).reduce<UnitsComposition>((acc, [unitId, count]) => {
    if (count > 0) {
      acc[unitId] = count
    }
    return acc
  }, {})
}

function isInfantry(stats: UnitStats): boolean {
  return stats.role === "inf" || stats.role === "scout"
}

function isCavalry(stats: UnitStats): boolean {
  return stats.role === "cav"
}

function isSiege(stats: UnitStats): boolean {
  return Boolean(stats.siege)
}

function isAdministrator(stats: UnitStats): boolean {
  return stats.role === "admin" || Boolean(stats.isAdministrator)
}

function isSettlerUnit(unitId: string, stats: UnitStats): boolean {
  if (stats.role === "settler") return true
  const normalized = unitId.toUpperCase()
  return normalized.includes("SETTLER")
}

function isFastRaider(stats: UnitStats): boolean {
  return isCavalry(stats) && stats.speed >= FAST_RAIDER_SPEED
}

function isDefensiveCavalry(stats: UnitStats): boolean {
  if (!isCavalry(stats)) return false
  const defense = stats.defInf ?? stats.defense ?? 0
  return defense - stats.attack > DEFENSE_FAVOR_THRESHOLD
}

function matchesPriority(unitId: string, stats: UnitStats, tier: string): boolean {
  switch (tier) {
    case "fast_raiders":
      return isFastRaider(stats)
    case "general_infantry":
      return isInfantry(stats)
    case "defensive_cavalry":
      return isDefensiveCavalry(stats)
    case "heavy_cavalry":
      return isCavalry(stats)
    case "optional_siege":
      return TrapperService.isCategoryEligible("siege") && isSiege(stats)
    case "hero_last":
      return TrapperService.isCategoryEligible("hero") && unitId.toUpperCase().includes("HERO")
    case "administrators":
      return TrapperService.isCategoryEligible("administrators") && isAdministrator(stats)
    case "settlers":
      return TrapperService.isCategoryEligible("settlers") && isSettlerUnit(unitId, stats)
    default:
      return false
  }
}

function sanitizeUnits(units: UnitsComposition): UnitsComposition {
  for (const [unitId, count] of Object.entries(units)) {
    if (count <= 0) {
      delete units[unitId]
    }
  }
  return units
}

export interface TrapCaptureInput {
  attackerUnits: UnitsComposition
  unitCatalog: Record<string, UnitStats>
  freeTraps: number
}

export interface TrapCaptureOutcome {
  updatedUnits: UnitsComposition
  captured: TrapResolutionEntry[]
}

export function applyTrapCapture(params: TrapCaptureInput): TrapCaptureOutcome {
  if (params.freeTraps <= 0) {
    return { updatedUnits: cloneUnits(params.attackerUnits), captured: [] }
  }

  const captureOrder = TrapperService.getCapturePriority()
  const updatedUnits = cloneUnits(params.attackerUnits)
  const captured: TrapResolutionEntry[] = []
  let remainingTraps = params.freeTraps

  for (const tier of captureOrder) {
    if (remainingTraps <= 0) break
    if (tier === "optional_siege" && !TrapperService.isCategoryEligible("siege")) {
      continue
    }
    if (tier === "hero_last" && !TrapperService.isCategoryEligible("hero")) {
      continue
    }

    const candidates = Object.entries(updatedUnits)
      .filter(([unitId, count]) => {
        if (count <= 0) return false
        const stats = params.unitCatalog[unitId]
        if (!stats) return false
        return matchesPriority(unitId, stats, tier)
      })
      .sort((a, b) => {
        const diff = b[1] - a[1]
        if (diff !== 0) return diff
        return a[0].localeCompare(b[0])
      })

    for (const [unitId, count] of candidates) {
      if (remainingTraps <= 0) break
      const captureCount = Math.min(count, remainingTraps)
      if (captureCount <= 0) continue
      updatedUnits[unitId] = count - captureCount
      captured.push({ unitTypeId: unitId, count: captureCount })
      remainingTraps -= captureCount
    }
  }

  return {
    updatedUnits: sanitizeUnits(updatedUnits),
    captured,
  }
}

export function resolveTrapperLevel(snapshot?: VillageSiegeSnapshot | null): number {
  if (!snapshot) return 0
  const trapper = snapshot.buildings.find((building) => building.type === "TRAPPER")
  return trapper?.level ?? 0
}
