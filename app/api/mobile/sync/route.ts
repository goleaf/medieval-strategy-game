import { NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { NotificationService } from "@/lib/game-services/notification-service"
import { fetchCombatReportList } from "@/lib/reports/queries"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const playerId = body?.playerId as string | undefined
  if (!playerId) return errorResponse("playerId is required", 400)

  const [feed, reports] = await Promise.all([
    NotificationService.getFeed(playerId, { includeRead: false, includeMuted: false, limit: 40 }),
    fetchCombatReportList(playerId),
  ])

  return successResponse({
    serverTime: new Date().toISOString(),
    notifications: feed,
    reports,
  })
}

