import { type NextRequest } from "next/server"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { NotificationService } from "@/lib/game-services/notification-service"

export async function PATCH(req: NextRequest) {
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
}
