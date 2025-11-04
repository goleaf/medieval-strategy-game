import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { mapQuerySchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    // Get world config for bounds
    const config = await prisma.worldConfig.findFirst()
    const maxX = config?.maxX || 100
    const maxY = config?.maxY || 100

    // Get all villages (for text-based map, we show everything)
    const villages = await prisma.village.findMany({
      include: {
        player: {
          select: {
            playerName: true,
          },
        },
        buildings: {
          select: {
            type: true,
            level: true,
          },
        },
      },
      where: {
        player: {
          isDeleted: false, // Only show villages from active players
        },
      },
    })

    // Calculate village levels (based on buildings)
    const processedVillages = villages.map((village) => {
      const totalBuildingLevels = village.buildings.reduce((sum, b) => sum + b.level, 0)
      const level = Math.max(1, Math.floor(totalBuildingLevels / 3)) // Simple level calculation

      return {
        id: village.id,
        name: village.name,
        playerName: village.player.playerName,
        x: village.x,
        y: village.y,
        isOwn: playerId === village.playerId,
        level,
        population: village.population,
        loyalty: village.loyalty,
      }
    })

    return successResponse({
      villages: processedVillages,
      worldSize: { width: maxX, height: maxY },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
