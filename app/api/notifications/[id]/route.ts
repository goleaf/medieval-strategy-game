import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { NotificationService } from "@/lib/game-services/notification-service"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json()
    const { playerId } = body
    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    await NotificationService.markAsRead(params.id, playerId)

    return successResponse({ success: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}



