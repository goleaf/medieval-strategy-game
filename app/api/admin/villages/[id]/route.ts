import { prisma } from "@/lib/db"
import { VillageDestructionService } from "@/lib/game-services/village-destruction-service"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { requireAdmin } from "@/app/api/admin/middleware"

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/villages/[id] - Get detailed village information including destruction stats
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return errorResponse("Unauthorized", 401)

    const villageId = params.id

    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        player: {
          select: {
            playerName: true,
            id: true,
            totalPoints: true,
            rank: true
          }
        },
        buildings: true,
        troops: true,
        attacksFrom: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            fromVillage: {
              select: {
                name: true,
                player: { select: { playerName: true } }
              }
            }
          }
        },
        attacksTo: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            toVillage: {
              select: {
                name: true,
                player: { select: { playerName: true } }
              }
            }
          }
        }
      }
    })

    if (!village) {
      return notFoundResponse()
    }

    // Get destruction statistics
    const destructionStats = await VillageDestructionService.getVillageDestructionStats(villageId)

    return successResponse({
      village: {
        ...village,
        destructionStats
      }
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

// PUT /api/admin/villages/[id] - Update village properties (admin only)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return errorResponse("Unauthorized", 401)

    const villageId = params.id
    const body = await req.json()
    const { population, isDestroyed, restore } = body

    const village = await prisma.village.findUnique({
      where: { id: villageId }
    })

    if (!village) {
      return notFoundResponse()
    }

    const updates: any = {}

    // Handle population updates
    if (population !== undefined) {
      updates.population = Math.max(0, population)
    }

    // Handle restoration (undestroy village)
    if (restore === true && village.isDestroyed) {
      updates.isDestroyed = false
      updates.destroyedAt = null
      updates.destroyedById = null
      // Restore basic resources
      updates.wood = 1000
      updates.stone = 1000
      updates.iron = 500
      updates.gold = 200
      updates.food = 2000
      updates.population = 50 // Restore basic population

      // Recreate basic buildings if they were destroyed
      await VillageDestructionService.updateVillagePopulation(villageId)
    }

    if (Object.keys(updates).length > 0) {
      await prisma.village.update({
        where: { id: villageId },
        data: updates
      })

      // Log the admin action
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: restore ? "VILLAGE_RESTORATION" : "VILLAGE_UPDATE",
          details: `Admin ${restore ? 'restored' : 'updated'} village ${villageId}. Changes: ${JSON.stringify(updates)}`,
          targetType: "Village",
          targetId: villageId,
        }
      })
    }

    return successResponse({ message: "Village updated successfully" })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

// DELETE /api/admin/villages/[id]/force-destroy - Force destroy a village (bypasses normal checks)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return errorResponse("Unauthorized", 401)

    const villageId = params.id
    const body = await req.json()
    const { reason, bypassChecks } = body

    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { player: true }
    })

    if (!village) {
      return notFoundResponse()
    }

    // If not bypassing checks, verify normal destruction rules
    if (!bypassChecks) {
      const canDestroy = await VillageDestructionService.canVillageBeDestroyed(villageId)
      if (!canDestroy.canDestroy) {
        return errorResponse(canDestroy.reason || "Village cannot be destroyed", 400)
      }
    }

    // Force destroy the village
    await VillageDestructionService.destroyVillage(villageId, admin.userId)

    // Log the admin action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "VILLAGE_FORCE_DESTRUCTION",
        details: `Admin force destroyed village ${villageId} owned by ${village.player.playerName}. Reason: ${reason || 'No reason provided'}. Bypassed checks: ${bypassChecks}`,
        targetType: "Village",
        targetId: villageId,
      }
    })

    return successResponse({ message: "Village force destroyed successfully" })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
