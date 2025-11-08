import { prisma } from "@/lib/db"
import { authenticateAdmin } from "@/lib/middleware"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(req)
    if (!authResult.success) {
      return errorResponse("Unauthorized", 401)
    }

    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get cancelled buildings stats
    const cancelledBuildings = await prisma.building.findMany({
      where: {
        isBuilding: false,
        completionAt: null,
        queuePosition: null,
        constructionCostWood: 0,
        constructionCostStone: 0,
        constructionCostIron: 0,
        constructionCostGold: 0,
        constructionCostFood: 0,
        updatedAt: { gte: last7Days }
      },
      include: {
        village: {
          include: {
            player: { select: { playerName: true } }
          }
        }
      }
    })

    // Get cancelled movements/attacks stats
    const cancelledMovements = await prisma.movement.findMany({
      where: {
        status: "CANCELLED",
        cancelledAt: { gte: last7Days }
      },
      include: {
        troop: {
          include: {
            village: {
              include: {
                player: { select: { playerName: true } }
              }
            }
          }
        },
        attack: true
      }
    })

    // Calculate stats
    const buildingCancels24h = cancelledBuildings.filter(b => b.updatedAt >= last24Hours).length
    const buildingCancels7d = cancelledBuildings.length

    const movementCancels24h = cancelledMovements.filter(m => m.cancelledAt! >= last24Hours).length
    const movementCancels7d = cancelledMovements.length

    // Get recent cancels
    const recentCancels = [
      ...cancelledBuildings.slice(0, 10).map(b => ({
        type: "BUILDING_CANCEL" as const,
        playerName: b.village.player.playerName,
        villageName: b.village.name,
        details: `Cancelled ${b.type} Level ${b.level} upgrade`,
        timestamp: b.updatedAt
      })),
      ...cancelledMovements.slice(0, 10).map(m => ({
        type: "MOVEMENT_CANCEL" as const,
        playerName: m.troop.village.player.playerName,
        villageName: m.troop.village.name,
        details: `Cancelled ${m.attack?.type || 'Movement'} to (${m.toX}, ${m.toY})`,
        timestamp: m.cancelledAt!
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20)

    return successResponse({
      stats: {
        buildingCancels: {
          last24h: buildingCancels24h,
          last7d: buildingCancels7d
        },
        movementCancels: {
          last24h: movementCancels24h,
          last7d: movementCancels7d
        },
        totalCancels: {
          last24h: buildingCancels24h + movementCancels24h,
          last7d: buildingCancels7d + movementCancels7d
        }
      },
      recentCancels
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}


