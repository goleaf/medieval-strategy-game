import { NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { computeReportAnalytics } from "@/lib/reports/analytics"

export async function GET(req: NextRequest) {
  const playerId = new URL(req.url).searchParams.get("playerId")
  if (!playerId) return errorResponse("playerId is required", 400)
  const payload = await computeReportAnalytics(playerId)
  return successResponse(payload)
}

