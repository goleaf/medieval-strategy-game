import { getMaxDefinedLevel, getResourceLevelConfig } from "@/lib/config/resource-system"

/**
 * Canonical resource types for the simplified Travian-style economy.
 * The production helpers only care about the three haulable resources described
 * in the gameplay spec: wood, clay, and iron.
 */
export const ECONOMY_RESOURCES = ["wood", "clay", "iron"] as const

export type EconomyResource = (typeof ECONOMY_RESOURCES)[number]

/**
 * Convenience shape used throughout the economy helpers for any value that is
 * keyed per resource (current stock, production deltas, cost vectors, etc.).
 */
export type ResourceVector = Record<EconomyResource, number>

/**
 * Helper map filled with zeroes so consumers can quickly clone an empty vector
 * without re-creating literal objects in hot paths.
 */
export const ZERO_RESOURCE_VECTOR: ResourceVector = {
  wood: 0,
  clay: 0,
  iron: 0,
}

/**
 * Production modifiers that mirror the economy specification:
 * - `gameSpeed` and `productionFactor` are multiplicative scalars.
 * - Percent bonuses are expressed as decimals (e.g., +20% => 0.2) and stack
 *   additively before being transformed into a single multiplier.
 * - `flatPerHour` injects flat production per hour (rare but handy for quests).
 */
export interface ProductionModifiers {
  gameSpeed?: number
  productionFactor?: number
  globalPercentBonus?: number
  flatPerHour?: Partial<ResourceVector>
  perResourcePercentBonus?: Partial<ResourceVector>
  additionalPercentBonuses?: number[]
}

/**
 * Building levels for the three harvesting structures (Timber Camp, Clay Pit,
 * Iron Mine). `0` is allowed for brand-new villages.
 */
export type ResourceBuildingLevels = Partial<Record<EconomyResource, number>>

/**
 * Runtime configuration describing a village when simulating a production tick.
 */
export interface VillageProductionProfile {
  buildingLevels: ResourceBuildingLevels
  modifiers?: ProductionModifiers
}

/**
 * Snapshot of a village’s stockpile alongside structural levels that cap or
 * protect that stock.
 */
export interface VillageEconomyState {
  stock: ResourceVector
  warehouseLevel: number
  hidingPlaceLevel?: number
}

/**
 * Result payload returned by `tickVillageResources`. The function reports the
 * updated stock, the amount produced, and the amount wasted (due to capacity).
 */
export interface TickResult {
  stock: ResourceVector
  produced: ResourceVector
  wasted: ResourceVector
  warehouseCapacity: number
}

/**
 * Re-usable helper that clones a `ResourceVector`. Used instead of
 * `structuredClone` to avoid the extra runtime dependency inside the hot loop.
 */
export function cloneResourceVector(vector: ResourceVector): ResourceVector {
  return {
    wood: vector.wood,
    clay: vector.clay,
    iron: vector.iron,
  }
}

/**
 * Adds the second vector into the first one mutably and returns the mutated
 * vector so the helper can be chained if needed.
 */
export function addInto(target: ResourceVector, delta: ResourceVector): ResourceVector {
  target.wood += delta.wood
  target.clay += delta.clay
  target.iron += delta.iron
  return target
}

/**
 * Subtracts the second vector from the first one mutably.
 */
export function subtractInto(target: ResourceVector, delta: ResourceVector): ResourceVector {
  target.wood -= delta.wood
  target.clay -= delta.clay
  target.iron -= delta.iron
  return target
}

/**
 * Determines the hourly production for each resource given the building levels
 * and active modifiers. Production curves are sourced from
 * `config/resource-fields.json` and capped to the highest defined level so a
 * runaway admin command cannot crash the simulation.
 */
export function calculateHourlyProduction(
  profile: VillageProductionProfile,
): ResourceVector {
  const result: ResourceVector = cloneResourceVector(ZERO_RESOURCE_VECTOR)
  const maxLevels: Record<EconomyResource, number> = {
    wood: getMaxDefinedLevel("wood"),
    clay: getMaxDefinedLevel("clay"),
    iron: getMaxDefinedLevel("iron"),
  }

  for (const resource of ECONOMY_RESOURCES) {
    const level = Math.max(0, Math.min(profile.buildingLevels[resource] ?? 0, maxLevels[resource]))
    if (level === 0) {
      result[resource] = 0
      continue
    }

    const baseConfig = getResourceLevelConfig(resource, level)
    const baseOutput = baseConfig.outputPerHour

    const modifiers = profile.modifiers
    const speedMultiplier = (modifiers?.gameSpeed ?? 1) * (modifiers?.productionFactor ?? 1)
    const additionalPercentMultiplier =
      modifiers?.additionalPercentBonuses?.reduce((product, bonus) => product * (1 + bonus), 1) ?? 1
    const percentMultiplier =
      (1 + (modifiers?.globalPercentBonus ?? 0)) *
      (1 + (modifiers?.perResourcePercentBonus?.[resource] ?? 0)) *
      additionalPercentMultiplier
    const flat = modifiers?.flatPerHour?.[resource] ?? 0

    result[resource] = baseOutput * speedMultiplier * percentMultiplier + flat
  }

  return result
}

/**
 * Ticks resource production forward by `elapsedSeconds`, respecting warehouse
 * capacity and tracking any wasted production for telemetry.
 */
export function tickVillageResources(
  state: VillageEconomyState,
  profile: VillageProductionProfile,
  elapsedSeconds: number,
): TickResult {
  const warehouseCapacity = getWarehouseCapacity(state.warehouseLevel)
  const producedPerHour = calculateHourlyProduction(profile)
  const produced: ResourceVector = cloneResourceVector(ZERO_RESOURCE_VECTOR)
  const wasted: ResourceVector = cloneResourceVector(ZERO_RESOURCE_VECTOR)
  const updatedStock = cloneResourceVector(state.stock)
  const hours = elapsedSeconds / 3600

  for (const resource of ECONOMY_RESOURCES) {
    const gain = producedPerHour[resource] * hours
    produced[resource] = gain

    const nextAmount = updatedStock[resource] + gain
    if (nextAmount > warehouseCapacity) {
      wasted[resource] = nextAmount - warehouseCapacity
      updatedStock[resource] = warehouseCapacity
    } else {
      updatedStock[resource] = nextAmount
    }
  }

  return {
    stock: updatedStock,
    produced,
    wasted,
    warehouseCapacity,
  }
}

/**
 * Applies an upfront resource spend (construction, recruitment, etc.). Throws
 * if the village cannot afford the cost to surface bugs early in dev/test.
 */
export function spendResources(stock: ResourceVector, cost: ResourceVector): ResourceVector {
  if (!canAfford(stock, cost)) {
    throw new Error("Insufficient resources for the requested action")
  }

  const updated = cloneResourceVector(stock)
  subtractInto(updated, cost)
  return updated
}

/**
 * Checks whether a stockpile can pay for a cost vector without mutating state.
 */
export function canAfford(stock: ResourceVector, cost: ResourceVector): boolean {
  return (
    stock.wood >= cost.wood &&
    stock.clay >= cost.clay &&
    stock.iron >= cost.iron
  )
}

/**
 * Calculates how many resources remain exposed after applying the Hiding Place
 * protection. The result is what plundering troops are allowed to steal.
 */
export function calculateLootableResources(
  stock: ResourceVector,
  hidingPlaceLevel: number,
): ResourceVector {
  const stash = getHidingPlaceProtection(hidingPlaceLevel)
  return {
    wood: Math.max(0, stock.wood - stash),
    clay: Math.max(0, stock.clay - stash),
    iron: Math.max(0, stock.iron - stash),
  }
}

/**
 * Determines the stash size per resource for a given Hiding Place level.
 * The curve loosely mirrors Travian’s: a base of 150 at level 1 and a growth
 * factor of 1.23x per level.
 */
export function getHidingPlaceProtection(level: number): number {
  if (level <= 0) {
    return 0
  }
  const BASE_STASH = 150
  const GROWTH_FACTOR = 1.23
  return Math.floor(BASE_STASH * Math.pow(GROWTH_FACTOR, level - 1))
}

/**
 * Computes the warehouse capacity shared across wood, clay, and iron.
 */
export function getWarehouseCapacity(level: number): number {
  const BASE_CAPACITY = 1200
  const GROWTH_FACTOR = 1.2
  if (level <= 0) {
    return BASE_CAPACITY
  }
  return Math.floor(BASE_CAPACITY * Math.pow(GROWTH_FACTOR, level - 1))
}

/**
 * Computes the population cap set by the Farm building. The math uses a
 * baseline of 60 population with a gentle 1.17x growth per level so early
 * upgrades are meaningful without spiking exponentially.
 */
export function getFarmPopulationCap(level: number): number {
  const BASE_POP = 60
  const GROWTH_FACTOR = 1.17
  if (level <= 0) {
    return BASE_POP
  }
  return Math.floor(BASE_POP * Math.pow(GROWTH_FACTOR, level - 1))
}

/**
 * Validates whether a pending action that consumes population can start when
 * considering the current Farm level and used population.
 */
export function hasFarmCapacity(
  farmLevel: number,
  usedPopulation: number,
  additionalPopulation: number,
): boolean {
  const cap = getFarmPopulationCap(farmLevel)
  return usedPopulation + additionalPopulation <= cap
}

/**
 * Utility that turns an arbitrary `ResourceVector` into a serializable plain
 * object with fixed precision to simplify API payloads and logging.
 */
export function roundResourceVector(vector: ResourceVector, precision = 2): ResourceVector {
  const factor = Math.pow(10, precision)
  return {
    wood: Math.round(vector.wood * factor) / factor,
    clay: Math.round(vector.clay * factor) / factor,
    iron: Math.round(vector.iron * factor) / factor,
  }
}
