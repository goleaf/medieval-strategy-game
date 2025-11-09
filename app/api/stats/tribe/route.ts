import { NextRequest } from "next/server"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { computeTribeStats } from "@/lib/stats/tribe"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tribeId = url.searchParams.get("tribeId")
  const requesterId = url.searchParams.get("requesterId")
  if (!tribeId) return errorResponse("tribeId is required", 400)
  if (!requesterId) return errorResponse("requesterId is required", 400)
  const range = url.searchParams.get("range") ?? undefined
  const data = await computeTribeStats({ tribeId, requesterId, range })
  return successResponse(data)
}

