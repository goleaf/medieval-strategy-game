import type { GameWorld, Prisma, WorldType as PrismaWorldType } from "@prisma/client"

export type WorldType = PrismaWorldType

type StoredCasualSettings = {
  enabled?: boolean
  dailyPlayLimitMinutes?: number
}

type StoredTimeFloor = {
  enabled?: boolean
  floor?: number
  days?: number
}

type StoredMoraleSettings = {
  enabled?: boolean
  exponent?: number
  minMultiplier?: number
  maxMultiplier?: number
  timeFloor?: StoredTimeFloor
}

type StoredNightBonusSettings = {
  enabled?: boolean
  startHour?: number
  endHour?: number
  defenseMultiplier?: number
}

type StoredBeginnerProtectionSettings = {
  hours?: number
  pointThreshold?: number
}

type StoredNobleSettings = {
  coinCost?: number
}

export type WorldSettingsPayload = {
  unitSpeed?: number
  archersEnabled?: boolean
  churchEnabled?: boolean
  casualMode?: StoredCasualSettings
  morale?: StoredMoraleSettings
  nightBonus?: StoredNightBonusSettings
  beginnerProtection?: StoredBeginnerProtectionSettings
  noble?: StoredNobleSettings
}

export interface WorldSettings {
  worldId?: string
  worldType: WorldType
  speed: number
  unitSpeed: number
  archersEnabled: boolean
  churchEnabled: boolean
  casualModeEnabled: boolean
  dailyPlayTimeLimitMinutes?: number
  morale: {
    enabled: boolean
    exponent: number
    minMultiplier: number
    maxMultiplier: number
    timeFloor?: { enabled: boolean; floor: number; fullEffectDays: number }
  }
  nightBonus: { enabled: boolean; startHour: number; endHour: number; defenseMultiplier: number }
  beginnerProtection: { hours: number; pointThreshold?: number }
  noble: { coinCost: number }
}

const ARCHER_UNIT_TYPES = new Set<string>(["BOWMAN", "STEPPE_ARCHER", "VALKYRIES_BLESSING"])

const BASE_SETTINGS: WorldSettings = {
  worldType: "CLASSIC",
  speed: 1,
  unitSpeed: 1,
  archersEnabled: false,
  churchEnabled: false,
  casualModeEnabled: false,
  dailyPlayTimeLimitMinutes: undefined,
  morale: {
    enabled: true,
    exponent: 1.5,
    minMultiplier: 0.3,
    maxMultiplier: 1,
    timeFloor: { enabled: true, floor: 0.5, fullEffectDays: 7 },
  },
  nightBonus: { enabled: false, startHour: 0, endHour: 6, defenseMultiplier: 1.0 },
  beginnerProtection: { hours: 72, pointThreshold: undefined },
  noble: { coinCost: 28000 },
}

const WORLD_TYPE_PRESETS: Record<WorldType, WorldSettingsPayload> = {
  CLASSIC: {
    archersEnabled: false,
    churchEnabled: false,
    morale: { enabled: false },
    nightBonus: { enabled: false },
  },
  ARCHER: {
    archersEnabled: true,
    morale: { enabled: true },
  },
  CHURCH: {
    churchEnabled: true,
    morale: { enabled: true },
    nightBonus: { enabled: true, startHour: 0, endHour: 6, defenseMultiplier: 1.15 },
  },
  CASUAL: {
    archersEnabled: true,
    churchEnabled: true,
    casualMode: { enabled: true, dailyPlayLimitMinutes: 180 },
    morale: { enabled: true, minMultiplier: 0.4 },
    nightBonus: { enabled: true, startHour: 22, endHour: 6, defenseMultiplier: 1.3 },
    beginnerProtection: { hours: 120, pointThreshold: 1000 },
  },
}

function normalizeJson(value: Prisma.JsonValue | null | undefined): WorldSettingsPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as WorldSettingsPayload
}

function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0
  const normalized = Math.floor(hour)
  if (normalized < 0) return 0
  if (normalized > 23) return 23
  return normalized
}

function mergePayload(base: WorldSettingsPayload, patch?: WorldSettingsPayload): WorldSettingsPayload {
  if (!patch) return base
  const next: WorldSettingsPayload = { ...base }
  if (patch.unitSpeed !== undefined) next.unitSpeed = patch.unitSpeed
  if (patch.archersEnabled !== undefined) next.archersEnabled = patch.archersEnabled
  if (patch.churchEnabled !== undefined) next.churchEnabled = patch.churchEnabled
  if (patch.casualMode) {
    next.casualMode = { ...(next.casualMode ?? {}), ...patch.casualMode }
  }
  if (patch.morale) {
    next.morale = { ...(next.morale ?? {}), ...patch.morale }
    if (patch.morale.timeFloor) {
      next.morale = {
        ...next.morale,
        timeFloor: { ...(next.morale?.timeFloor ?? {}), ...patch.morale.timeFloor },
      }
    }
  }
  if (patch.nightBonus) {
    next.nightBonus = { ...(next.nightBonus ?? {}), ...patch.nightBonus }
  }
  if (patch.beginnerProtection) {
    next.beginnerProtection = { ...(next.beginnerProtection ?? {}), ...patch.beginnerProtection }
  }
  if (patch.noble) {
    next.noble = { ...(next.noble ?? {}), ...patch.noble }
  }
  return next
}

export class WorldSettingsService {
  static derive(world?: Pick<GameWorld, "id" | "speed" | "worldType" | "settings"> | null): WorldSettings {
    const worldType = world?.worldType ?? "CLASSIC"
    const base: WorldSettings = {
      ...BASE_SETTINGS,
      worldId: world?.id,
      worldType,
      speed: world?.speed ?? BASE_SETTINGS.speed,
    }

    const typeDefaults = WORLD_TYPE_PRESETS[worldType] ?? {}
    const stored = normalizeJson(world?.settings)
    const combined = mergePayload(mergePayload({}, typeDefaults), stored)

    return WorldSettingsService.applyPatch(base, combined)
  }

  static serialize(worldType: WorldType, patch?: WorldSettingsPayload | null): Prisma.JsonObject {
    const typeDefaults = WORLD_TYPE_PRESETS[worldType] ?? {}
    const merged = mergePayload({ ...typeDefaults }, patch ?? {})
    if (merged.unitSpeed === undefined) {
      merged.unitSpeed = 1
    }
    return merged as Prisma.JsonObject
  }

  static isArcherUnit(unitType: string): boolean {
    return ARCHER_UNIT_TYPES.has(unitType.toUpperCase())
  }

  private static applyPatch(base: WorldSettings, patch: WorldSettingsPayload): WorldSettings {
    const morale = patch.morale ?? {}
    const timeFloor = morale.timeFloor
    const night = patch.nightBonus ?? {}
    const beginner = patch.beginnerProtection ?? {}
    const noble = patch.noble ?? {}

    return {
      ...base,
      unitSpeed: patch.unitSpeed ?? base.unitSpeed,
      archersEnabled: patch.archersEnabled ?? base.archersEnabled,
      churchEnabled: patch.churchEnabled ?? base.churchEnabled,
      casualModeEnabled: patch.casualMode?.enabled ?? base.casualModeEnabled,
      dailyPlayTimeLimitMinutes:
        patch.casualMode?.dailyPlayLimitMinutes ?? base.dailyPlayTimeLimitMinutes,
      morale: {
        enabled: morale.enabled ?? base.morale.enabled,
        exponent: morale.exponent ?? base.morale.exponent,
        minMultiplier: morale.minMultiplier ?? base.morale.minMultiplier,
        maxMultiplier: morale.maxMultiplier ?? base.morale.maxMultiplier,
        timeFloor:
          morale.enabled === false
            ? undefined
            : timeFloor
              ? {
                  enabled: timeFloor.enabled ?? true,
                  floor: timeFloor.floor ?? base.morale.timeFloor?.floor ?? 0.5,
                  fullEffectDays: timeFloor.days ?? base.morale.timeFloor?.fullEffectDays ?? 7,
                }
              : base.morale.timeFloor,
      },
      nightBonus: {
        enabled: night.enabled ?? base.nightBonus.enabled,
        startHour: clampHour(night.startHour ?? base.nightBonus.startHour),
        endHour: clampHour(night.endHour ?? base.nightBonus.endHour),
        defenseMultiplier: night.defenseMultiplier ?? base.nightBonus.defenseMultiplier,
      },
      beginnerProtection: {
        hours: beginner.hours ?? base.beginnerProtection.hours,
        pointThreshold: beginner.pointThreshold ?? base.beginnerProtection.pointThreshold,
      },
      noble: {
        coinCost: noble.coinCost ?? base.noble.coinCost,
      },
    }
  }
}
