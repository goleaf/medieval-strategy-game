import { prisma } from "@/lib/db"
import { BuildingService } from "@/lib/game-services/building-service"
import { buildingUpgradeSchema } from "@/lib/utils/validation"
import { errorResponse, handleValidationError, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { type NextRequest } from "next/server"

const GOLD_COST_PER_BUILDING = 2

const hasActiveGoldClubMembership = (
  player?: { hasGoldClubMembership: boolean; goldClubExpiresAt: Date | null } | null,
): boolean => {
  if (!player?.hasGoldClubMembership) return false
  if (!player.goldClubExpiresAt) return true
  return player.goldClubExpiresAt > new Date()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { buildingId } = buildingUpgradeSchema.parse(body)

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        village: {
          include: {
            player: {
              select: {
                hasGoldClubMembership: true,
                goldClubExpiresAt: true,
              },
            },
          },
        },
      },
    })

    if (!building || !building.village) {
      return errorResponse("Building not found", 404)
    }

    if (!building.isBuilding || !building.completionAt) {
      return errorResponse("This building is not currently under construction", 400)
    }

    if (!hasActiveGoldClubMembership(building.village.player)) {
      return errorResponse("Premium membership required to speed up construction", 403)
    }

    if (building.village.gold < GOLD_COST_PER_BUILDING) {
      return errorResponse("Insufficient gold", 400)
    }

    await prisma.village.update({
      where: { id: building.villageId },
      data: {
        gold: { decrement: GOLD_COST_PER_BUILDING },
      },
    })

    await BuildingService.completeBuilding(building.id)

    return successResponse({
      buildingId,
      remainingGold: building.village.gold - GOLD_COST_PER_BUILDING,
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
