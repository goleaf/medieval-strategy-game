import { prisma } from "@/lib/db"
import { VillageService } from "@/lib/game-services/village-service"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { authenticateRequest } from "@/app/api/auth/middleware"

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return errorResponse("Authentication required", 401)
    }

    // Ensure the player has at least one village
    const village = await VillageService.ensurePlayerHasVillage(auth.playerId)

    if (!village) {
      return errorResponse("Failed to create village", 500)
    }

    // Return the village with all relations
    const villageWithRelations = await prisma.village.findUnique({
      where: { id: village.id },
      include: {
        buildings: true,
        troops: true,
        continent: true,
        player: {
          select: {
            beginnerProtectionUntil: true,
          },
        },
      },
    })

    if (!villageWithRelations) {
      return errorResponse("Village created but not found", 500)
    }

    // Add protection status
    const isProtected = await ProtectionService.isVillageProtected(villageWithRelations.id)
    const protectionHoursRemaining = await ProtectionService.getProtectionTimeRemaining(villageWithRelations.playerId)

    return successResponse({
      ...villageWithRelations,
      isProtected,
      protectionHoursRemaining,
    }, 201)
  } catch (error) {
    return serverErrorResponse(error)
  }
}


