import { prisma } from "@/lib/db"
import { VillageDestructionService } from "@/lib/game-services/village-destruction-service"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { requireAdmin } from "@/app/api/admin/middleware"

// GET /api/admin/villages - List villages with destruction status
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return errorResponse("Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const status = searchParams.get("status") // "active", "destroyed", "all"
    const playerName = searchParams.get("playerName")

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status === "active") {
      where.isDestroyed = false
    } else if (status === "destroyed") {
      where.isDestroyed = true
    }

    if (playerName) {
      where.player = {
        playerName: {
          contains: playerName,
          mode: "insensitive"
        }
      }
    }

    const [villages, total] = await Promise.all([
      prisma.village.findMany({
        where,
        include: {
          player: {
            select: {
              playerName: true,
              id: true
            }
          },
          buildings: {
            select: {
              type: true,
              level: true
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.village.count({ where })
    ])

    // Get destruction stats for each village
    const villagesWithStats = await Promise.all(
      villages.map(async (village) => {
        const stats = await VillageDestructionService.getVillageDestructionStats(village.id)
        return {
          ...village,
          destructionStats: stats
        }
      })
    )

    return successResponse({
      villages: villagesWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

// POST /api/admin/villages/destroy - Manually destroy a village (admin only)
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return errorResponse("Unauthorized", 401)

    const body = await req.json()
    const { villageId, reason } = body

    if (!villageId) {
      return errorResponse("Village ID is required", 400)
    }

    // Check if village can be destroyed
    const canDestroy = await VillageDestructionService.canVillageBeDestroyed(villageId)
    if (!canDestroy.canDestroy) {
      return errorResponse(canDestroy.reason || "Village cannot be destroyed", 400)
    }

    // Destroy the village
    await VillageDestructionService.destroyVillage(villageId, admin.userId)

    // Log the admin action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "VILLAGE_DESTRUCTION",
        details: `Admin manually destroyed village ${villageId}. Reason: ${reason || 'No reason provided'}`,
        targetType: "Village",
        targetId: villageId,
      }
    })

    return successResponse({ message: "Village destroyed successfully" })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

