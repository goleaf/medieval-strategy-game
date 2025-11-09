// Lightweight in-memory performance metrics for API routes.
// For production, back this with Redis/Timeseries or export to your APM.

import { trackError, trackAction } from "@/lib/admin-utils"
import { NextResponse } from "next/server"

type RouteKey = string

interface RouteStats {
  count: number
  errors: number
  lastMs: number
  samples: number[]
  maxSamples: number
}

const routes: Map<RouteKey, RouteStats> = new Map()

function getOrCreate(label: RouteKey): RouteStats {
  let s = routes.get(label)
  if (!s) {
    s = { count: 0, errors: 0, lastMs: 0, samples: [], maxSamples: 500 }
    routes.set(label, s)
  }
  return s
}

export function startTimer(label: RouteKey) {
  const start = Date.now()
  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return function end(status?: number) {
    const ms = Date.now() - start
    const s = getOrCreate(label)
    s.count += 1
    s.lastMs = ms
    if (typeof status === "number" && status >= 400) s.errors += 1
    s.samples.push(ms)
    if (s.samples.length > s.maxSamples) s.samples.shift()
    // Count this request as an action for ops monitoring
    trackAction()
    return { ms, traceId }
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

export function getMetricsSnapshot() {
  const snapshot: Record<string, any> = {}
  for (const [key, s] of routes.entries()) {
    const sorted = [...s.samples].sort((a, b) => a - b)
    const sum = sorted.reduce((acc, v) => acc + v, 0)
    const avg = sorted.length ? sum / sorted.length : 0
    snapshot[key] = {
      count: s.count,
      errors: s.errors,
      errorRate: s.count ? s.errors / s.count : 0,
      lastMs: s.lastMs,
      avgMs: Math.round(avg),
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    }
  }
  return snapshot
}

export function withMetrics<T extends (...args: any[]) => Promise<any>>(label: RouteKey, handler: T): T {
  return (async (...args: any[]) => {
    const end = startTimer(label)
    try {
      const res = await handler(...args)
      // Prefer NextResponse.status if available; otherwise default to 200
      const status = typeof res?.status === "number" ? res.status : 200
      const { ms, traceId } = end(status)
      try {
        if (res && res.headers && typeof res.headers.set === "function") {
          res.headers.set("X-Trace-Id", traceId)
          res.headers.set("X-Response-Time", `${ms}ms`)
          // Server-Timing for browser devtools
          const existing = res.headers.get("Server-Timing")
          const timing = `total;dur=${ms}`
          res.headers.set("Server-Timing", existing ? `${existing}, ${timing}` : timing)
        }
        if (process.env.METRICS_PERSIST === "true") {
          ;(async () => {
            try {
              const { prisma } = await import("@/lib/db")
              await prisma.$executeRawUnsafe(
                `CREATE TABLE IF NOT EXISTS ApiMetricSample (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  createdAt TEXT NOT NULL,
                  route TEXT NOT NULL,
                  durationMs INTEGER NOT NULL,
                  status INTEGER NOT NULL,
                  traceId TEXT
                );`,
              )
              await prisma.$executeRawUnsafe(
                `INSERT INTO ApiMetricSample (createdAt, route, durationMs, status, traceId) VALUES (?, ?, ?, ?, ?)`,
                new Date().toISOString(),
                label,
                ms,
                status,
                traceId,
              )
            } catch (_err) {
              // ignore
            }
          })()
        }
      } catch (_e) {
        // ignore header errors
      }
      return res
    } catch (err: any) {
      trackError(`API error: ${label}`, String(err?.message || err))
      const { ms, traceId } = end(500)
      // We cannot set headers on thrown responses; swallow here
      throw err
    }
  }) as unknown as T
}
