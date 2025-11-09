import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { prisma } from "@/lib/db"

function floorToMinute(d: Date) {
  const copy = new Date(d)
  copy.setSeconds(0, 0)
  return copy
}

export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)
  if (!adminAuth) {
    return new Response(JSON.stringify({ success: false, error: "Admin authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const url = new URL(req.url)
  const minutes = Math.max(1, Math.min(24 * 60, Number(url.searchParams.get("minutes") || 60)))
  const routeFilter = url.searchParams.get("route") || undefined

  const to = new Date()
  const from = new Date(Date.now() - minutes * 60 * 1000)

  const where: any = {
    createdAt: { gte: from, lte: to },
  }
  if (routeFilter) {
    where.route = { contains: routeFilter }
  }

  const samples = await prisma.apiMetricSample.findMany({ where, orderBy: { createdAt: "asc" } })

  // Group by route -> minute
  const byRoute: Record<string, Record<string, number[]>> = {}
  for (const s of samples) {
    const route = s.route
    const minuteKey = floorToMinute(s.createdAt).toISOString()
    byRoute[route] ||= {}
    byRoute[route][minuteKey] ||= []
    byRoute[route][minuteKey].push(s.durationMs)
  }

  function pct(values: number[], p: number) {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
    return sorted[idx]
  }

  const series: Array<{ route: string; minute: string; count: number; avg: number; p50: number; p95: number }> = []
  for (const [route, minutesMap] of Object.entries(byRoute)) {
    for (const [minute, durations] of Object.entries(minutesMap)) {
      const count = durations.length
      const sum = durations.reduce((a, b) => a + b, 0)
      series.push({
        route,
        minute,
        count,
        avg: Math.round(sum / count),
        p50: pct(durations, 50),
        p95: pct(durations, 95),
      })
    }
  }

  return NextResponse.json({ success: true, data: { from: from.toISOString(), to: to.toISOString(), series } })
}

