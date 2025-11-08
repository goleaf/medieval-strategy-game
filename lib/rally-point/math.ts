import type { UnitsComposition, UnitStats } from "./types"

export interface DistancePoint {
  x: number
  y: number
}

export function euclideanDistance(a: DistancePoint, b: DistancePoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function computeSlowestSpeed(units: UnitsComposition, catalog: Record<string, UnitStats>): number {
  const speeds: number[] = []
  for (const [unitId, count] of Object.entries(units)) {
    if (count <= 0) continue
    const stats = catalog[unitId]
    if (!stats) {
      throw new Error(`Missing unit stats for ${unitId}`)
    }
    speeds.push(stats.speed)
  }
  if (speeds.length === 0) {
    throw new Error("Composition must contain at least one unit")
  }
  return Math.min(...speeds)
}

export function travelTimeMs(distance: number, slowestSpeed: number, serverSpeed: number): number {
  if (slowestSpeed <= 0) {
    throw new Error("Slowest speed must be positive")
  }
  const travelHours = distance / (slowestSpeed * serverSpeed)
  const travelMs = travelHours * 60 * 60 * 1000
  return Math.round(travelMs)
}
