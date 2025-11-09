import { type NextRequest } from "next/server"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"
import { NotificationService } from "@/lib/game-services/notification-service"
import { NOTIFICATION_PRIORITY_ORDER, NOTIFICATION_TYPE_IDS } from "@/lib/config/notification-types"

export const GET = withMetrics("GET /api/notifications", async (req: NextRequest) => {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const priority = req.nextUrl.searchParams.get("priority")
    const type = req.nextUrl.searchParams.get("type")
    const includeRead = req.nextUrl.searchParams.get("includeRead") === "true"
    const includeMuted = req.nextUrl.searchParams.get("includeMuted") === "true"
    const limit = req.nextUrl.searchParams.get("limit")

    const normalizedPriority =
      priority && NOTIFICATION_PRIORITY_ORDER.includes(priority as (typeof NOTIFICATION_PRIORITY_ORDER)[number])
        ? (priority as (typeof NOTIFICATION_PRIORITY_ORDER)[number])
        : "ALL"

    const normalizedType =
      type && NOTIFICATION_TYPE_IDS.includes(type as (typeof NOTIFICATION_TYPE_IDS)[number])
        ? (type as (typeof NOTIFICATION_TYPE_IDS)[number])
        : "ALL"

    const feed = await NotificationService.getFeed(playerId, {
      priority: normalizedPriority,
      type: normalizedType,
      includeRead,
      includeMuted,
      limit: limit ? Number(limit) : undefined,
    })

    return successResponse(feed)
  } catch (error) {
    return serverErrorResponse(error)
  }
})
