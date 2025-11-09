import { NextRequest } from "next/server"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { computeWorldStats } from "@/lib/stats/world"
import { withMetrics } from "@/lib/utils/metrics"

export const GET = withMetrics("GET /api/stats/world", async (req: NextRequest) => {
  const url = new URL(req.url)
  const worldId = url.searchParams.get("worldId") ?? undefined
  const range = url.searchParams.get("range") ?? undefined
  const data = await computeWorldStats({ worldId, range })
  return successResponse(data)
})
