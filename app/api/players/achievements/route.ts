import { type NextRequest } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { AchievementService } from "@/lib/game-services/achievement-service"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const playerId = url.searchParams.get("playerId")
    if (!playerId) return errorResponse("playerId required", 400)
    // Visibility checks can be added if needed; achievements are generally public
    const data = await AchievementService.getPlayerAchievements(playerId)
    return successResponse(data)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

