import { NextRequest } from "next/server"

import { fetchSupportStatus } from "@/lib/reports/queries"
import { errorResponse, successResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  const playerId = new URL(req.url).searchParams.get("playerId")
  if (!playerId) {
    return errorResponse("playerId is required", 400)
  }
  const data = await fetchSupportStatus(playerId)
  return successResponse(data)
}
