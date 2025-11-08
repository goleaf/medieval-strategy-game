import { prisma } from "@/lib/db"
import { TroopService } from "@/lib/game-services/troop-service"
import { UnitSystemService } from "@/lib/game-services/unit-system-service"
import { getUnitDefinition } from "@/lib/troop-system/config"
import { TroopType } from "@prisma/client"
import { type NextRequest } from "next/server"
import { troopTrainSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"

const LEGACY_TROOP_TYPES = new Set(Object.values(TroopType))

function isLegacyTroopType(value: string): value is TroopType {
  return LEGACY_TROOP_TYPES.has(value as TroopType)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = troopTrainSchema.parse(body)

    const unitDefinition = getUnitDefinition(validated.troopType)
    if (unitDefinition) {
      await UnitSystemService.trainUnits({
        villageId: validated.villageId,
        unitTypeId: validated.troopType,
        count: validated.quantity,
      })
    } else if (isLegacyTroopType(validated.troopType)) {
      await TroopService.trainTroops(validated.villageId, validated.troopType, validated.quantity)
    } else {
      return errorResponse("Unknown troop type", 400)
    }

    const updatedVillage = await prisma.village.findUnique({
      where: { id: validated.villageId },
      include: {
        troops: true,
        unitStacks: { include: { unitType: true } },
        trainingQueueItems: { include: { unitType: true }, orderBy: { finishAt: "asc" } },
      },
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
