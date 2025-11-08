import { ProtectionService } from "@/lib/game-services/protection-service"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function POST(req: NextRequest) {
  try {
    const { playerId } = await req.json()

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    // Check if player can extend protection
    const canExtend = await ProtectionService.canExtendProtection(playerId)
    if (!canExtend) {
      return errorResponse("Cannot extend protection. Either you don't have protection or you've already extended it once.", 400)
    }

    // Extend protection
    const extended = await ProtectionService.extendProtection(playerId)
    if (!extended) {
      return errorResponse("Failed to extend protection", 500)
    }

    // Get remaining time
    const timeRemaining = await ProtectionService.getProtectionTimeRemaining(playerId)

    return successResponse({
      message: "Beginner protection extended successfully",
      timeRemainingHours: timeRemaining,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
