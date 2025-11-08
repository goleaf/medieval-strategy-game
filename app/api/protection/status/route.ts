import { ProtectionService } from "@/lib/game-services/protection-service"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const isProtected = await ProtectionService.isPlayerProtected(playerId)
    const canExtend = await ProtectionService.canExtendProtection(playerId)
    const timeRemaining = await ProtectionService.getProtectionTimeRemaining(playerId)

    return successResponse({
      isProtected,
      canExtend,
      timeRemainingHours: timeRemaining,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
