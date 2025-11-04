import { prisma } from "@/lib/db"
import { BuildingService } from "@/lib/game-services/building-service"
import { type NextRequest } from "next/server"
import { buildingUpgradeSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError } from "@/lib/utils/api-response"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = buildingUpgradeSchema.parse(body)

    await BuildingService.cancelBuilding(validated.buildingId)

    const building = await prisma.building.findUnique({
      where: { id: validated.buildingId },
      include: { village: true },
    })

    if (!building) {
      return errorResponse("Building not found", 404)
    }

    return successResponse(building)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}


