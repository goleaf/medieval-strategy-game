import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError } from "@/lib/utils/api-response"
import { z } from "zod"

const bulkUpdateSchema = z.object({
  buildingIds: z.array(z.string()),
  newLevel: z.number().min(0).max(100),
})

const bulkDeleteSchema = z.object({
  buildingIds: z.array(z.string()),
})

// POST /api/admin/cranny/bulk - Bulk update cranny levels
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = bulkUpdateSchema.parse(body)

    // Verify all buildings exist and are crannies
    const buildings = await prisma.building.findMany({
      where: {
        id: { in: validated.buildingIds },
        type: "CRANNY" as const
      },
      include: { village: true }
    })

    if (buildings.length !== validated.buildingIds.length) {
      return errorResponse("Some buildings not found or are not crannies", 400)
    }

    // Update all cranny levels in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updates = await Promise.all(
        buildings.map(building =>
          tx.building.update({
            where: { id: building.id },
            data: { level: validated.newLevel },
            include: { village: true }
          })
        )
      )

      // Log admin action
      await tx.auditLog.create({
        data: {
          adminId: "system", // This would need to be the actual admin ID from auth
          action: "BULK_UPDATE_CRANNY_LEVELS",
          details: `Bulk updated ${validated.buildingIds.length} crannies to level ${validated.newLevel}`,
          targetType: "Building",
          targetId: validated.buildingIds.join(","),
        }
      })

      return updates
    })

    return successResponse({
      message: `Successfully updated ${result.length} crannies to level ${validated.newLevel}`,
      updatedBuildings: result.map(b => ({
        id: b.id,
        villageName: b.village.name,
        oldLevel: buildings.find(bb => bb.id === b.id)?.level,
        newLevel: validated.newLevel
      }))
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

// DELETE /api/admin/cranny/bulk - Bulk delete crannies
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = bulkDeleteSchema.parse(body)

    // Verify all buildings exist and are crannies
    const buildings = await prisma.building.findMany({
      where: {
        id: { in: validated.buildingIds },
        type: "CRANNY" as const
      },
      include: { village: true }
    })

    if (buildings.length !== validated.buildingIds.length) {
      return errorResponse("Some buildings not found or are not crannies", 400)
    }

    // Delete all crannies in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const deletes = await Promise.all(
        buildings.map(building =>
          tx.building.delete({
            where: { id: building.id }
          })
        )
      )

      // Log admin action
      await tx.auditLog.create({
        data: {
          adminId: "system", // This would need to be the actual admin ID from auth
          action: "BULK_DELETE_CRANNIES",
          details: `Bulk deleted ${validated.buildingIds.length} crannies`,
          targetType: "Building",
          targetId: validated.buildingIds.join(","),
        }
      })

      return deletes
    })

    return successResponse({
      message: `Successfully deleted ${result.length} crannies`,
      deletedBuildingIds: validated.buildingIds
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
