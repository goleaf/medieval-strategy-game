import { addDays, subDays, startOfDay } from "date-fns"

export type TimeRangeKey = "24h" | "7d" | "30d" | "all"

export function resolveRange(range: TimeRangeKey | string | null | undefined): { from?: Date; to: Date } {
  const to = new Date()
  switch (range) {
    case "24h":
      return { from: subDays(to, 1), to }
    case "7d":
      return { from: subDays(to, 7), to }
    case "30d":
      return { from: subDays(to, 30), to }
    default:
      return { to }
  }
}

export function dayKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10)
}

export function clampToRange<T extends { createdAt: Date }>(rows: T[], from?: Date, to?: Date): T[] {
  return rows.filter((r) => {
    const t = r.createdAt.getTime()
    if (from && t < from.getTime()) return false
    if (to && t > to.getTime()) return false
    return true
  })
}

