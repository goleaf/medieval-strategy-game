import { NextRequest } from "next/server"

import { fetchCombatReportDetail } from "@/lib/reports/queries"
import { errorResponse, notFoundResponse, successResponse } from "@/lib/utils/api-response"

interface RouteParams {
  params: { reportId: string }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const playerId = new URL(req.url).searchParams.get("playerId")
  if (!playerId) {
    return errorResponse("playerId is required", 400)
  }
  const { cache } = await import("@/lib/cache")
  const key = `report:${params.reportId}:pid:${playerId}`
  const report = await cache.wrap(key, 365 * 24 * 60 * 60, async () => fetchCombatReportDetail(params.reportId, playerId))
  if (!report) {
    return notFoundResponse()
  }
  const body = JSON.stringify(report)
  const etag = `W/"rep-${params.reportId}-${body.length}"`
  const inm = req.headers.get("if-none-match")
  if (inm === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=31536000" } })
  }
  return new Response(JSON.stringify({ success: true, data: report }), {
    status: 200,
    headers: { ETag: etag, "Cache-Control": "public, max-age=31536000" },
  })
}
