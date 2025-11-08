import { prisma } from "@/lib/db"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { ShipmentService } from "@/lib/game-services/shipment-service"
import { StorageService } from "@/lib/game-services/storage-service"
import { type NextRequest } from "next/server"
import { directResourceSendSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = directResourceSendSchema.safeParse(body)

    if (!validated.success) {
      return errorResponse(validated.error, 400)
    }

    const { fromVillageId, toX, toY, resources } = validated.data

    // Validate that at least one resource is being sent
    const totalResources = resources.wood + resources.stone + resources.iron + resources.gold + resources.food
    if (totalResources === 0) {
      return errorResponse("Must send at least one resource", 400)
    }

    const fromVillage = await prisma.village.findUnique({
      where: { id: fromVillageId },
      include: { player: true },
    })

    if (!fromVillage) {
      return notFoundResponse()
    }

    // Find target village
    const targetVillage = await prisma.village.findUnique({
      where: { x_y: { x: toX, y: toY } },
      include: { player: true },
    })

    if (!targetVillage) {
      return errorResponse("Target village not found", 404)
    }

    // Cannot send resources to your own village
    if (targetVillage.playerId === fromVillage.playerId) {
      return errorResponse("Cannot send resources to your own village", 400)
    }

    // Check beginner protection restrictions
    const isSenderProtected = await ProtectionService.isPlayerProtected(fromVillage.playerId)
    const isReceiverProtected = await ProtectionService.isPlayerProtected(targetVillage.playerId)

    // During beginner protection, players can only send resources to alliance/confederacy members
    if (isSenderProtected || isReceiverProtected) {
      // TODO: Check alliance/confederacy relationship
      // For now, allow direct sending but log this restriction
      console.log(`Beginner protection active: sender=${isSenderProtected}, receiver=${isReceiverProtected}`)
    }

    const canAfford = await StorageService.canAfford(fromVillageId, resources)
    if (!canAfford) {
      return errorResponse("Insufficient resources", 400)
    }

    try {
      const shipment = await ShipmentService.createDirectShipment({
        sourceVillageId: fromVillageId,
        targetVillageId: targetVillage.id,
        bundle: resources,
        createdBy: "PLAYER",
        metadata: { intent: "direct_send" },
      })

      return successResponse(
        {
          message: "Merchants dispatched",
          shipmentId: shipment.id,
          eta: shipment.arriveAt,
          merchantsUsed: shipment.merchantsUsed,
          to: {
            villageName: targetVillage.name,
            x: targetVillage.x,
            y: targetVillage.y,
            playerName: targetVillage.player.playerName,
          },
        },
        200,
      )
    } catch (shipmentError) {
      return errorResponse((shipmentError as Error).message, 400)
    }
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
