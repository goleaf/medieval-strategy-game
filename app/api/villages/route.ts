import { prisma } from "@/lib/db"
import { VillageService } from "@/lib/game-services/village-service"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { type NextRequest } from "next/server"
import { villageSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const villages = await prisma.village.findMany({
      where: { playerId },
      include: {
        buildings: {
          include: {
            research: {
              select: {
                isResearching: true,
              },
            },
          },
        },
        troops: true,
        continent: true,
        player: {
          select: {
            beginnerProtectionUntil: true,
          },
        },
      },
    })

    // Add protection status to each village
    const villagesWithProtection = await Promise.all(
      villages.map(async (village) => {
        const isProtected = await ProtectionService.isVillageProtected(village.id)
        const protectionHoursRemaining = await ProtectionService.getProtectionTimeRemaining(village.playerId)
        return {
          ...village,
          isProtected,
          protectionHoursRemaining,
        }
      }),
    )

    return successResponse(villagesWithProtection)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = villageSchema.parse(body)

    // Check if position is occupied
    const existing = await prisma.village.findUnique({
      where: { x_y: { x: validated.x, y: validated.y } },
    })

    if (existing) {
      return errorResponse("Position already occupied", 409)
    }

    const village = await VillageService.createVillage(
      validated.playerId,
      validated.continentId,
      validated.name || "New Village",
      validated.x,
      validated.y,
    )

    return successResponse(village, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
