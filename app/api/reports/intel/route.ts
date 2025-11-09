import { NextRequest } from "next/server"

import { fetchScoutReports } from "@/lib/reports/intel"
import { errorResponse, successResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  const playerId = new URL(req.url).searchParams.get("playerId")
  if (!playerId) {
    return errorResponse("playerId is required", 400)
  }
  const reports = await fetchScoutReports(playerId)
  return successResponse(reports)
}
