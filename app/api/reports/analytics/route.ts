import { NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { computeReportAnalytics } from "@/lib/reports/analytics"
import { withMetrics } from "@/lib/utils/metrics"

export const GET = withMetrics("GET /api/reports/analytics", async (req: NextRequest) => {
  const playerId = new URL(req.url).searchParams.get("playerId")
  if (!playerId) return errorResponse("playerId is required", 400)
  const payload = await computeReportAnalytics(playerId)
  return successResponse(payload)
})
