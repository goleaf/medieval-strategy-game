import { prisma } from "@/lib/db"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    // Get player ID from query params or auth (placeholder)
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        beginnerProtectionUntil: true,
        hasExtendedProtection: true,
      },
    })

    if (!player) {
      return notFoundResponse()
    }

    const protectionTimeRemaining = await ProtectionService.getProtectionTimeRemaining(playerId)
    const canExtend = await ProtectionService.canExtendProtection(playerId)

    return successResponse({
      isProtected: protectionTimeRemaining !== null && protectionTimeRemaining > 0,
      protectionTimeRemaining,
      hasExtendedProtection: player.hasExtendedProtection,
      canExtend,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, playerId } = await req.json()

    if (!action || !playerId) {
      return errorResponse("Action and player ID required", 400)
    }

    if (action === "EXTEND") {
      const canExtend = await ProtectionService.canExtendProtection(playerId)
      if (!canExtend) {
        return errorResponse("Cannot extend protection", 400)
      }

      const success = await ProtectionService.extendProtection(playerId)
      if (!success) {
        return errorResponse("Failed to extend protection", 500)
      }

      return successResponse({ message: "Protection extended successfully" })
    }

    return errorResponse("Invalid action", 400)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

