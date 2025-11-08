import { prisma } from "@/lib/db"
import { BuildingService } from "@/lib/game-services/building-service"
import { type NextRequest } from "next/server"
import { buildingDemolishSchema, buildingCancelDemolitionSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = buildingDemolishSchema.parse(body)

    const mode = validated.mode || "LEVEL_BY_LEVEL"

    switch (mode) {
      case "LEVEL_BY_LEVEL":
        await BuildingService.startDemolition(validated.buildingId)
        break
      case "INSTANT_COMPLETE":
        await BuildingService.completeDemolitionInstantly(validated.buildingId)
        break
      case "FULL_BUILDING":
        await BuildingService.demolishBuildingInstantly(validated.buildingId)
        break
    }

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

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = buildingCancelDemolitionSchema.parse(body)

    await BuildingService.cancelDemolition(validated.buildingId)

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


