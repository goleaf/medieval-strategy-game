import resourceFieldData from "@/config/resource-fields.json"

export type ResourceType = "wood" | "clay" | "iron" | "crop"

export interface ResourceLevelConfig {
  level: number
  outputPerHour: number
  cost: Record<ResourceType, number>
  buildTimeSeconds: number
}

interface ResourceFieldFile {
  version: number
  generatedAt: string
  notes?: string
  resources: Record<
    ResourceType,
    {
      name: string
      levels: ResourceLevelConfig[]
    }
  >
}

const RESOURCE_FIELDS: ResourceFieldFile = resourceFieldData

export const RESOURCE_TYPES: ResourceType[] = ["wood", "clay", "iron", "crop"]

export function getResourceName(resource: ResourceType): string {
  return RESOURCE_FIELDS.resources[resource]?.name ?? resource
}

export function getResourceLevels(resource: ResourceType): ResourceLevelConfig[] {
  const payload = RESOURCE_FIELDS.resources[resource]
  if (!payload) {
    throw new Error(`Unknown resource type: ${resource}`)
  }
  return payload.levels
}

export function getResourceLevelConfig(resource: ResourceType, level: number): ResourceLevelConfig {
  const levels = getResourceLevels(resource)
  const config = levels.find((entry) => entry.level === level)
  if (!config) {
    throw new Error(`Level ${level} is not defined for resource ${resource}`)
  }
  return config
}

export function getMaxDefinedLevel(resource: ResourceType): number {
  const levels = getResourceLevels(resource)
  return levels[levels.length - 1]?.level ?? 0
}

export function getUpgradeCostSummary(resource: ResourceType, level: number): {
  cost: Record<ResourceType, number>
  buildTimeSeconds: number
  outputDelta: number
} {
  const current = getResourceLevelConfig(resource, level)
  const next = getResourceLevelConfig(resource, Math.min(level + 1, getMaxDefinedLevel(resource)))
  return {
    cost: current.cost,
    buildTimeSeconds: current.buildTimeSeconds,
    outputDelta: Math.max(0, next.outputPerHour - current.outputPerHour),
  }
}

export function calculateHourlyProduction(resource: ResourceType, level: number, multipliers: number[]): number {
  const base = getResourceLevelConfig(resource, level).outputPerHour
  return Math.round(base * multipliers.reduce((acc, curr) => acc * (1 + curr), 1))
}

export function summarizeResourceConfig() {
  return RESOURCE_TYPES.map((type) => ({
    type,
    maxLevel: getMaxDefinedLevel(type),
    baseOutput: getResourceLevelConfig(type, 1).outputPerHour,
    topOutput: getResourceLevelConfig(type, getMaxDefinedLevel(type)).outputPerHour,
  }))
}
