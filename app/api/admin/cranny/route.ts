import { prisma } from "@/lib/db"
import { CrannyService } from "@/lib/game-services/cranny-service"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError, notFoundResponse } from "@/lib/utils/api-response"
import { z } from "zod"

const getCrannyStatsSchema = z.object({
  villageId: z.string().optional(),
  playerId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
})

const updateCrannyLevelSchema = z.object({
  buildingId: z.string(),
  newLevel: z.number().min(0).max(100),
})

// GET /api/admin/cranny - Get cranny statistics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const validated = getCrannyStatsSchema.parse({
      villageId: searchParams.get("villageId"),
      playerId: searchParams.get("playerId"),
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    })

    const where: any = {
      type: "CRANNY" as const
    }

    if (validated.villageId) {
      where.villageId = validated.villageId
    }

    if (validated.playerId) {
      where.village = {
        playerId: validated.playerId
      }
    }

    const [crannies, totalCount] = await Promise.all([
      prisma.building.findMany({
        where,
        include: {
          village: {
            include: {
              player: {
                include: {
                  tribe: true
                }
              }
            }
          }
        },
        orderBy: { level: "desc" },
        take: validated.limit,
        skip: validated.offset,
      }),
      prisma.building.count({
        where
      })
    ])

    // Calculate protection for each cranny
    const crannyStats = await Promise.all(
      crannies.map(async (cranny) => {
        const protection = await CrannyService.calculateTotalProtection(cranny.villageId)
        return {
          id: cranny.id,
          villageId: cranny.villageId,
          villageName: cranny.village.name,
          playerName: cranny.village.player.playerName,
          tribe: cranny.village.player.tribe?.name || "No Tribe",
          level: cranny.level,
          capacity: CrannyService.calculateCrannyCapacity(cranny.level),
          totalProtection: protection.wood, // All resources have same protection
          createdAt: cranny.createdAt,
        }
      })
    )

    return successResponse({
      crannies: crannyStats,
      pagination: {
        total: totalCount,
        limit: validated.limit,
        offset: validated.offset,
        hasMore: validated.offset + validated.limit < totalCount
      }
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

// POST /api/admin/cranny - Update cranny level (admin action)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = updateCrannyLevelSchema.parse(body)

    const building = await prisma.building.findUnique({
      where: { id: validated.buildingId },
      include: { village: true }
    })

    if (!building) {
      return notFoundResponse("Building not found")
    }

    if (building.type !== "CRANNY") {
      return errorResponse("Building is not a cranny", 400)
    }

    // Update the cranny level
    await prisma.building.update({
      where: { id: validated.buildingId },
      data: { level: validated.newLevel }
    })

    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminId: "system", // This would need to be the actual admin ID from auth
        action: "UPDATE_CRANNY_LEVEL",
        details: `Updated cranny level from ${building.level} to ${validated.newLevel} in village ${building.village.name}`,
        targetType: "Building",
        targetId: validated.buildingId,
      }
    })

    return successResponse({
      message: "Cranny level updated successfully",
      buildingId: validated.buildingId,
      oldLevel: building.level,
      newLevel: validated.newLevel
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
