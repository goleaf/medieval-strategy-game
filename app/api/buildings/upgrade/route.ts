import { prisma } from "@/lib/db"
import { BuildingService } from "@/lib/game-services/building-service"
import { type NextRequest } from "next/server"
import { buildingUpgradeSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { SitterPermissions } from "@/lib/utils/sitter-permissions"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth || !auth.playerId) {
      return errorResponse("Unauthorized", 401)
    }

    const body = await req.json()
    const validated = buildingUpgradeSchema.parse(body)

    // Check sitter permissions for resource usage
    const sitterContext = await SitterPermissions.getSitterContext(auth)
    if (sitterContext.isSitter) {
      const permissionCheck = await SitterPermissions.enforcePermission(
        req,
        sitterContext.sitterId!,
        sitterContext.ownerId!,
        'useResources'
      )
      if (permissionCheck) return permissionCheck
    }

    await BuildingService.upgradeBuilding(validated.buildingId)

    const building = await prisma.building.findUnique({
      where: { id: validated.buildingId },
      include: { village: true },
    })

    if (!building) {
      return notFoundResponse()
    }

    return successResponse(building)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
