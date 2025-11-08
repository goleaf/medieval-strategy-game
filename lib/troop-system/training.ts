import { getTroopSystemConfig, requireUnitDefinition } from "./config"
import type { TrainingOrder, TroopSystemConfig, UnitCosts } from "./types"

export interface TrainingQueueItem extends TrainingOrder {
  unitType: string
}

export interface TrainingEnqueueInput {
  unitType: string
  count: number
  buildingType: TrainingOrder["building"]
  buildingLevel: number
  existingQueue?: TrainingQueueItem[]
  startAt?: Date
  serverSpeedOverride?: number
  config?: TroopSystemConfig
}

export interface TrainingEnqueueResult {
  order: TrainingQueueItem
  unitDurationSeconds: number
  totalDurationSeconds: number
  totalCost: UnitCosts
}

function resolveStartTime(queue: TrainingQueueItem[] | undefined, explicitStart: Date | undefined): Date {
  if (queue && queue.length > 0) {
    const last = queue[queue.length - 1]
    return last.finishAt
  }
  return explicitStart ?? new Date()
}

function getBuildingMultiplier(
  buildingType: TrainingOrder["building"],
  level: number,
  config: TroopSystemConfig,
): number {
  const table = config.globals.buildingSpeedMultipliers[buildingType]
  if (!table) return 1
  const safeLevel = Math.max(0, Math.min(level, table.length - 1))
  return table[safeLevel] || 1
}

function validateBuildingRequirement(
  unitType: string,
  buildingType: TrainingOrder["building"],
  buildingLevel: number,
  config: TroopSystemConfig,
): void {
  const definition = requireUnitDefinition(unitType, config)
  const requiredLevel = definition.buildingReq[buildingType]
  if (requiredLevel && buildingLevel < requiredLevel) {
    throw new Error(`${unitType} requires ${buildingType} level ${requiredLevel}`)
  }
  const allowedRoles = config.training.queues[buildingType] ?? []
  if (!allowedRoles.includes(definition.role)) {
    throw new Error(`${unitType} cannot be trained in ${buildingType}`)
  }
}

function multiplyCost(cost: UnitCosts, multiplier: number): UnitCosts {
  return {
    wood: Math.round(cost.wood * multiplier),
    clay: Math.round(cost.clay * multiplier),
    iron: Math.round(cost.iron * multiplier),
    crop: Math.round(cost.crop * multiplier),
  }
}

export function enqueueTraining(input: TrainingEnqueueInput): TrainingEnqueueResult {
  if (input.count <= 0) {
    throw new Error("Training count must be greater than zero")
  }
  const config = input.config ?? getTroopSystemConfig()
  validateBuildingRequirement(input.unitType, input.buildingType, input.buildingLevel, config)

  const definition = requireUnitDefinition(input.unitType, config)
  const serverSpeed = input.serverSpeedOverride ?? config.globals.serverSpeed
  const multiplier = getBuildingMultiplier(input.buildingType, input.buildingLevel, config)
  const unitDurationSeconds = definition.trainTimeSec / Math.max(1, serverSpeed) / Math.max(1, multiplier)
  const totalDurationSeconds = unitDurationSeconds * input.count
  const startAt = resolveStartTime(input.existingQueue, input.startAt)
  const finishAt = new Date(startAt.getTime() + totalDurationSeconds * 1000)

  const totalCost = multiplyCost(definition.cost, input.count)
  const order: TrainingQueueItem = {
    unitType: input.unitType,
    count: input.count,
    building: input.buildingType,
    startAt,
    finishAt,
  }

  return { order, unitDurationSeconds, totalDurationSeconds, totalCost }
}
