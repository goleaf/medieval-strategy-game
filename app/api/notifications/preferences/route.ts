import { type NextRequest } from "next/server"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { NotificationService } from "@/lib/game-services/notification-service"
import { notificationPreferenceUpdateSchema } from "@/lib/utils/validation"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const preferences = await NotificationService.getPreferences(playerId)
    return successResponse(preferences)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = notificationPreferenceUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const { playerId, ...update } = parsed.data
    const preferences = await NotificationService.updatePreferences(playerId, update)
    return successResponse(preferences)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
