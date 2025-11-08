import { prisma } from "@/lib/db"
import type { WorldConfig } from "@prisma/client"

import { DEFAULT_NIGHT_POLICY, DEFAULT_SCOUTING_CONFIG } from "./defaults"
import type { NightPolicyConfig, ScoutingConfig } from "./types"
import { mergeCatapultRules } from "@/lib/combat/catapult/rules"
import type { CatapultRules } from "@/lib/combat/catapult/types"

type JsonRecord = Record<string, unknown>

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function deepMerge<T extends Record<string, any>>(target: T, source: JsonRecord): T {
  const result: Record<string, unknown> = { ...target }

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    if (value === null) {
      result[key] = null
      continue
    }
    if (Array.isArray(value)) {
      result[key] = value.map((entry) => (typeof entry === "object" && entry !== null ? clone(entry) : entry))
      continue
    }
    if (typeof value === "object") {
      const base = (result[key] ?? {}) as JsonRecord
      result[key] = deepMerge(
        typeof base === "object" && !Array.isArray(base) && base !== null ? (base as JsonRecord) : {},
        value as JsonRecord,
      )
      continue
    }
    result[key] = value
  }

  return result as T
}

function mergeWithDefaults<T extends Record<string, any>>(defaults: T, overrides?: unknown): T {
  const base = clone(defaults)
  if (!overrides || typeof overrides !== "object") {
    return base
  }
  return deepMerge(base, overrides as JsonRecord)
}

type CachedConfig = {
  expiresAt: number
  payload: WorldConfig | null
}

export class WorldRulesService {
  private static cache: CachedConfig | null = null
  private static readonly TTL_MS = 30_000

  static clearCache(): void {
    this.cache = null
  }

  private static async getWorldConfig(): Promise<WorldConfig | null> {
    const now = Date.now()
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.payload
    }

    const config = await prisma.worldConfig.findFirst()
    this.cache = { payload: config, expiresAt: now + this.TTL_MS }
    return config
  }

  static async getScoutingConfig(): Promise<ScoutingConfig> {
    const worldConfig = await this.getWorldConfig()
    return mergeWithDefaults(DEFAULT_SCOUTING_CONFIG, worldConfig?.scoutingConfig ?? undefined)
  }

  static async getNightPolicyConfig(): Promise<NightPolicyConfig> {
    const worldConfig = await this.getWorldConfig()
    return mergeWithDefaults(DEFAULT_NIGHT_POLICY, worldConfig?.nightPolicyConfig ?? undefined)
  }

  static async getSiegeRules(): Promise<CatapultRules> {
    const worldConfig = await this.getWorldConfig()
    return mergeCatapultRules(
      (worldConfig?.siegeRulesConfig ?? undefined) as Parameters<typeof mergeCatapultRules>[0],
    )
  }
}
