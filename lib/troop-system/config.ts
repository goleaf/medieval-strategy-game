import baseConfig from "@/config/unit-system.json"

import type { TroopSystemConfig, UnitDefinition } from "./types"

type PartialConfig = Partial<TroopSystemConfig>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source as T
  }
  const output: Record<string, unknown> = { ...target }
  for (const key of Object.keys(source)) {
    const sourceValue = (source as Record<string, unknown>)[key]
    if (sourceValue === undefined) continue
    if (Array.isArray(sourceValue)) {
      output[key] = sourceValue.slice()
    } else if (isPlainObject(sourceValue)) {
      const baseValue = (target as Record<string, unknown>)[key]
      output[key] = deepMerge(isPlainObject(baseValue) ? baseValue : {}, sourceValue)
    } else {
      output[key] = sourceValue
    }
  }
  return output as T
}

const DEFAULT_CONFIG = baseConfig as TroopSystemConfig

export function getTroopSystemConfig(overrides?: PartialConfig): TroopSystemConfig {
  if (!overrides) return DEFAULT_CONFIG
  const clone =
    typeof structuredClone === "function"
      ? structuredClone(DEFAULT_CONFIG)
      : (JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as TroopSystemConfig)
  return deepMerge(clone, overrides)
}

export function getUnitDefinition(unitType: string, config?: TroopSystemConfig): UnitDefinition | undefined {
  const cfg = config ?? DEFAULT_CONFIG
  return cfg.units[unitType]
}

export function requireUnitDefinition(unitType: string, config?: TroopSystemConfig): UnitDefinition {
  const definition = getUnitDefinition(unitType, config)
  if (!definition) {
    throw new Error(`Unknown unit type: ${unitType}`)
  }
  return definition
}
