import type { Mission, TroopSystemConfig, UnitDefinition } from "./types"
import { getTroopSystemConfig, requireUnitDefinition } from "./config"

export interface Coordinate {
  x: number
  y: number
}

export interface StackCount {
  unitType: string
  count: number
}

export interface TravelComputationInput {
  from: Coordinate
  to: Coordinate
  stacks: StackCount[]
  mission: Mission
  departAt?: Date
  config?: TroopSystemConfig
}

export interface TravelComputationResult {
  distance: number
  slowestSpeed: number
  durationHours: number
  departAt: Date
  arriveAt: Date
}

function resolveUnitDefinition(unitType: string, config: TroopSystemConfig): UnitDefinition {
  return requireUnitDefinition(unitType, config)
}

export function calculateDistance(from: Coordinate, to: Coordinate): number {
  const dx = from.x - to.x
  const dy = from.y - to.y
  return Math.sqrt(dx * dx + dy * dy)
}

function determineSlowestSpeed(stacks: StackCount[], mission: Mission, config: TroopSystemConfig): number {
  const meaningfulStacks = stacks.filter((stack) => stack.count > 0)
  if (meaningfulStacks.length === 0) {
    throw new Error("Cannot calculate speed for an empty stack")
  }
  const scoutOnly = mission === "scout"
  let slowest = Number.POSITIVE_INFINITY
  for (const stack of meaningfulStacks) {
    const definition = resolveUnitDefinition(stack.unitType, config)
    if (scoutOnly && definition.role !== "scout") {
      continue
    }
    slowest = Math.min(slowest, definition.speedTilesPerHour)
  }
  if (!Number.isFinite(slowest)) {
    // Either no scouts were provided for scout mission or filtering removed all units
    slowest = Math.min(
      ...meaningfulStacks.map((stack) => resolveUnitDefinition(stack.unitType, config).speedTilesPerHour),
    )
  }
  return slowest
}

export function computeTravel({
  from,
  to,
  stacks,
  mission,
  departAt,
  config: providedConfig,
}: TravelComputationInput): TravelComputationResult {
  const config = providedConfig ?? getTroopSystemConfig()
  if (stacks.length === 0) {
    throw new Error("Stacks cannot be empty when calculating travel time")
  }

  const distance = calculateDistance(from, to)
  const slowestSpeed = determineSlowestSpeed(stacks, mission, config)
  const durationHours = distance / (slowestSpeed || 1) / Math.max(1, config.globals.serverSpeed)
  const depart = departAt ?? new Date()
  const arrive = new Date(depart.getTime() + durationHours * 3600 * 1000)

  return {
    distance,
    slowestSpeed,
    durationHours,
    departAt: depart,
    arriveAt: arrive,
  }
}
