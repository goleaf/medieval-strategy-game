// Lightweight in-memory performance metrics for API routes.
// For production, back this with Redis/Timeseries or export to your APM.

import { trackError } from "@/lib/admin-utils"

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
  return function end(status?: number) {
    const ms = Date.now() - start
    const s = getOrCreate(label)
    s.count += 1
    s.lastMs = ms
    if (typeof status === "number" && status >= 400) s.errors += 1
    s.samples.push(ms)
    if (s.samples.length > s.maxSamples) s.samples.shift()
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
      end(status)
      return res
    } catch (err: any) {
      trackError(`API error: ${label}`, String(err?.message || err))
      end(500)
      throw err
    }
  }) as unknown as T
}

