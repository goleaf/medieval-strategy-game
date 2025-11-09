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
  const report = await fetchCombatReportDetail(params.reportId, playerId)
  if (!report) {
    return notFoundResponse()
  }
  return successResponse(report)
}
