import type { AttackType } from "@prisma/client"
import type { Mission } from "@/lib/troop-system/types"

import { WorldRulesService } from "@/lib/game-rules/world-rules"
import type { NightPolicyConfig, NightWindow, NightPolicyMode } from "@/lib/game-rules/types"

type WindowTiming = {
  window: NightWindow
  startMinutes: number
  endMinutes: number
  wraps: boolean
}

type LocalTimeSnapshot = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  minutesOfDay: number
}

export interface NightState {
  config: NightPolicyConfig
  active: boolean
  mode: NightPolicyMode
  activeWindow?: NightWindow
  windowBounds?: { start: Date; end: Date }
  nextTransition?: Date
  defenseMultiplier: number
}

export interface ArrivalPolicyResult {
  allowed: boolean
  reason?: string
  delayedUntil?: Date
  state: NightState
}

export const HOSTILE_MISSIONS: Mission[] = ["attack", "raid", "siege", "admin_attack", "scout"]

export function attackTypeToMission(type: AttackType): Mission {
  switch (type) {
    case "RAID":
      return "raid"
    case "SCOUT":
      return "scout"
    case "CONQUEST":
      return "admin_attack"
    default:
      return "attack"
  }
}

export function formatWorldTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

const TZ_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  if (!TZ_FORMATTERS.has(timeZone)) {
    TZ_FORMATTERS.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    )
  }
  return TZ_FORMATTERS.get(timeZone)!
}

function tzParts(date: Date, timeZone: string): Record<string, string> {
  const parts: Record<string, string> = {}
  for (const part of getFormatter(timeZone).formatToParts(date)) {
    if (part.type === "literal") continue
    parts[part.type] = part.value
  }
  return parts
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const parts = tzParts(date, timeZone)
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return asUTC - date.getTime()
}

function utcToZoned(date: Date, timeZone: string): LocalTimeSnapshot {
  const parts = tzParts(date, timeZone)
  const hour = Number(parts.hour)
  const minute = Number(parts.minute)
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
  }
}

function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  minutes: number,
): Date {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const base = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const offset = getTimezoneOffsetMs(base, timeZone)
  const utcTs = base.getTime() - offset
  // Recompute once in case offset changes across the adjustment window
  const adjusted = new Date(utcTs)
  const secondOffset = getTimezoneOffsetMs(adjusted, timeZone)
  if (secondOffset !== offset) {
    return new Date(base.getTime() - secondOffset)
  }
  return adjusted
}

function parseMinutes(value: string): number {
  const [h, m] = value.split(":").map((part) => Number(part))
  if (Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Invalid time window value "${value}". Expected HH:MM`)
  }
  return h * 60 + m
}

function buildWindows(config: NightPolicyConfig): WindowTiming[] {
  return config.windows.map((window) => {
    const startMinutes = parseMinutes(window.start)
    const endMinutes = parseMinutes(window.end)
    return { window, startMinutes, endMinutes, wraps: startMinutes > endMinutes }
  })
}

function shiftLocalDate(snapshot: LocalTimeSnapshot, dayOffset: number): { year: number; month: number; day: number } {
  const base = new Date(Date.UTC(snapshot.year, snapshot.month - 1, snapshot.day + dayOffset))
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  }
}

function resolveWindowBounds(
  snapshot: LocalTimeSnapshot,
  timing: WindowTiming,
  timeZone: string,
): { start: Date; end: Date } {
  const computeDate = (minutes: number, dayOffset: number) => {
    const target = shiftLocalDate(snapshot, dayOffset)
    return zonedTimeToUtc(timeZone, target.year, target.month, target.day, minutes)
  }

  if (!timing.wraps) {
    return {
      start: computeDate(timing.startMinutes, 0),
      end: computeDate(timing.endMinutes, snapshot.minutesOfDay >= timing.endMinutes ? 1 : 0),
    }
  }

  const withinFirstSegment = snapshot.minutesOfDay >= timing.startMinutes
  return {
    start: computeDate(timing.startMinutes, withinFirstSegment ? 0 : -1),
    end: computeDate(timing.endMinutes, withinFirstSegment ? 1 : 0),
  }
}

function findNextTransition(
  snapshot: LocalTimeSnapshot,
  timings: WindowTiming[],
  timeZone: string,
  reference: Date,
): { at: Date; type: "start" | "end"; window: NightWindow } | null {
  const offsets = [0, 1]
  let best: { at: Date; type: "start" | "end"; window: NightWindow } | null = null

  for (const timing of timings) {
    for (const offset of offsets) {
      const startLocal = shiftLocalDate(snapshot, offset)
      const startDate = zonedTimeToUtc(timeZone, startLocal.year, startLocal.month, startLocal.day, timing.startMinutes)
      if (startDate >= reference && (!best || startDate < best.at)) {
        best = { at: startDate, type: "start", window: timing.window }
      }

      const endLocal = shiftLocalDate(snapshot, offset)
      const endDate = zonedTimeToUtc(timeZone, endLocal.year, endLocal.month, endLocal.day, timing.endMinutes)
      if (endDate >= reference && (!best || endDate < best.at)) {
        best = { at: endDate, type: "end", window: timing.window }
      }
    }
  }

  return best
}

export class NightPolicyService {
  static async evaluate(timestamp: Date = new Date()): Promise<NightState> {
    const config = await WorldRulesService.getNightPolicyConfig()
    const timings = buildWindows(config)
    const snapshot = utcToZoned(timestamp, config.timezone)
    let activeWindow: NightWindow | undefined
    let windowBounds: { start: Date; end: Date } | undefined

    for (const timing of timings) {
      const inWindow = timing.wraps
        ? snapshot.minutesOfDay >= timing.startMinutes || snapshot.minutesOfDay < timing.endMinutes
        : snapshot.minutesOfDay >= timing.startMinutes && snapshot.minutesOfDay < timing.endMinutes
      if (inWindow) {
        activeWindow = timing.window
        windowBounds = resolveWindowBounds(snapshot, timing, config.timezone, timestamp)
        break
      }
    }

    const nextTransition = timings.length
      ? findNextTransition(snapshot, timings, config.timezone, timestamp)?.at
      : undefined

    const active = Boolean(activeWindow) && config.mode !== "NONE"
    const defenseMultiplier = active && config.mode === "BONUS" ? config.defenseMultiplier : 1

    return {
      config,
      active,
      mode: config.mode,
      activeWindow,
      windowBounds,
      nextTransition,
      defenseMultiplier,
    }
  }

  static async evaluateArrival(timestamp: Date, mission: Mission): Promise<ArrivalPolicyResult> {
    const state = await this.evaluate(timestamp)
    const hostile = HOSTILE_MISSIONS.includes(mission)

    if (!hostile || state.config.mode !== "TRUCE" || !state.active || !state.windowBounds) {
      return { allowed: true, state }
    }

    if (state.config.trucePolicy === "BLOCK_SEND") {
      return {
        allowed: false,
        reason: "Night truce blocks hostile arrivals during the active window.",
        state,
        delayedUntil: state.windowBounds.end,
      }
    }

    return {
      allowed: true,
      reason: "Arrival delayed until night truce ends.",
      delayedUntil: state.windowBounds.end,
      state,
    }
  }
}
