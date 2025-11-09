import { type NextRequest } from "next/server"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"
import { NotificationService } from "@/lib/game-services/notification-service"

export const PATCH = withMetrics("PATCH /api/notifications/mark-all", async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { playerId } = body
    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const updated = await NotificationService.markAllAsRead(playerId)
    return successResponse({ updated })
  } catch (error) {
    return serverErrorResponse(error)
  }
})
