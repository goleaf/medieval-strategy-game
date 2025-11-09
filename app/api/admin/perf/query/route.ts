import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)
  if (!adminAuth) {
    return new Response(JSON.stringify({ success: false, error: "Admin authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const url = new URL(req.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const route = url.searchParams.get("route") || undefined
  const statusGte = url.searchParams.get("statusGte")
  const statusLte = url.searchParams.get("statusLte")
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") || 200)))
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0))

  const where: any = {}
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }
  if (route) where.route = { contains: route }
  if (statusGte || statusLte) {
    where.status = {}
    if (statusGte) where.status.gte = Number(statusGte)
    if (statusLte) where.status.lte = Number(statusLte)
  }

  const [rows, total] = await Promise.all([
    prisma.apiMetricSample.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
    prisma.apiMetricSample.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      total,
      limit,
      offset,
      rows: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        route: r.route,
        durationMs: r.durationMs,
        status: r.status,
        traceId: r.traceId || null,
      })),
    },
  })
}

