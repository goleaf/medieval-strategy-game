import { prisma } from "@/lib/db"
import { TroopService } from "@/lib/game-services/troop-service"
import { type NextRequest } from "next/server"
import { troopTrainSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = troopTrainSchema.parse(body)

    await TroopService.trainTroops(validated.villageId, validated.troopType, validated.quantity)

    const updatedVillage = await prisma.village.findUnique({
      where: { id: validated.villageId },
      include: { troops: true },
    })

    if (!updatedVillage) {
      return notFoundResponse()
    }

    return successResponse(updatedVillage)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
