import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    // Find all villages for this player
    const playerVillages = await prisma.village.findMany({
      where: { playerId },
      select: { id: true }
    })

    const villageIds = playerVillages.map(v => v.id)

    // Get attacks sent from player's villages
    const attacks = await prisma.attack.findMany({
      where: {
        fromVillageId: { in: villageIds },
        status: { in: ["IN_PROGRESS", "ARRIVED"] }
      },
      include: {
        fromVillage: { select: { name: true, x: true, y: true } },
        toVillage: { select: { name: true, x: true, y: true } },
        movement: { select: { id: true, status: true, startedAt: true } },
        attackUnits: {
          include: {
            troop: { select: { type: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return successResponse(attacks)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

