import { getTroopSystemConfig, requireUnitDefinition } from "./config"
import type { TroopSystemConfig } from "./types"

export interface GarrisonStack {
  unitType: string
  count: number
  addedAt?: Date
}

export interface UpkeepComputation {
  totalUpkeep: number
  netCrop: number
}

export interface StarvationRemoval {
  unitType: string
  removed: number
}

export interface StarvationResult {
  removals: StarvationRemoval[]
  remainingDeficit: number
}

export function computeUpkeep(
  stacks: GarrisonStack[],
  grossCrop: number,
  config?: TroopSystemConfig,
): UpkeepComputation {
  const cfg = config ?? getTroopSystemConfig()
  const totalUpkeep = stacks.reduce((sum, stack) => {
    const definition = requireUnitDefinition(stack.unitType, cfg)
    return sum + definition.upkeepCropPerHour * stack.count
  }, 0)
  return {
    totalUpkeep,
    netCrop: grossCrop - totalUpkeep,
  }
}

function sortStacks(
  stacks: GarrisonStack[],
  policy: "oldest_first" | "highest_upkeep_first",
  config: TroopSystemConfig,
): GarrisonStack[] {
  if (policy === "highest_upkeep_first") {
    return stacks
      .slice()
      .sort((a, b) => {
        const aDef = requireUnitDefinition(a.unitType, config)
        const bDef = requireUnitDefinition(b.unitType, config)
        return bDef.upkeepCropPerHour * b.count - aDef.upkeepCropPerHour * a.count
      })
  }
  return stacks
    .slice()
    .sort((a, b) => {
      if (a.addedAt && b.addedAt) {
        return a.addedAt.getTime() - b.addedAt.getTime()
      }
      if (a.addedAt) return -1
      if (b.addedAt) return 1
      return 0
    })
}

export function resolveStarvation(
  deficit: number,
  garrison: GarrisonStack[],
  policy: "oldest_first" | "highest_upkeep_first" | undefined,
  config?: TroopSystemConfig,
): StarvationResult {
  if (deficit <= 0 || garrison.length === 0) {
    return { removals: [], remainingDeficit: 0 }
  }
  const cfg = config ?? getTroopSystemConfig()
  const starvationPolicy = policy ?? cfg.training.starvationPolicy
  const ordered = sortStacks(garrison, starvationPolicy, cfg)
  let remainingDeficit = deficit
  const removals: StarvationRemoval[] = []

  for (const stack of ordered) {
    if (remainingDeficit <= 0) break
    const definition = requireUnitDefinition(stack.unitType, cfg)
    const upkeepPerUnit = definition.upkeepCropPerHour
    if (upkeepPerUnit <= 0 || stack.count <= 0) continue
    const stackUpkeep = upkeepPerUnit * stack.count
    if (stackUpkeep <= remainingDeficit) {
      removals.push({ unitType: stack.unitType, removed: stack.count })
      remainingDeficit -= stackUpkeep
    } else {
      const unitsToRemove = Math.min(stack.count, Math.ceil(remainingDeficit / upkeepPerUnit))
      removals.push({ unitType: stack.unitType, removed: unitsToRemove })
      remainingDeficit = 0
    }
  }

  return { removals, remainingDeficit: Math.max(0, remainingDeficit) }
}
