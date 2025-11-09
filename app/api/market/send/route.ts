import { authenticateRequest } from "@/app/api/auth/middleware"
import { PlayerTradeService } from "@/lib/game-services/player-trade-service"
import { directResourceSendSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, unauthorizedResponse, handleValidationError } from "@/lib/utils/api-response"
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = directResourceSendSchema.parse(await req.json())
    // Enforcement: restrict trading if needed
    {
      const { checkPermission } = await import("@/lib/moderation/enforcement")
      const permission = await checkPermission(auth.playerId, "TRADE")
      if (!permission.allowed) {
        return errorResponse(permission.reason || "Trading restricted", 403)
      }
    }
    const destination = payload.toVillageId
      ? { villageId: payload.toVillageId }
      : { coordinates: { x: payload.toX!, y: payload.toY! } }

    const trade = await PlayerTradeService.initiateDirectTrade({
      playerId: auth.playerId,
      sourceVillageId: payload.fromVillageId,
      destination,
      resources: payload.resources,
    })

    return successResponse({
      message: "Merchants dispatched",
      shipmentId: trade.shipment.id,
      eta: trade.shipment.arriveAt,
      merchantsUsed: trade.shipment.merchantsUsed,
      to: {
        villageId: trade.targetVillage.id,
        villageName: trade.targetVillage.name,
        x: trade.targetVillage.x,
        y: trade.targetVillage.y,
        playerName: trade.targetVillage.player?.playerName ?? "Unknown",
      },
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return errorResponse((error as Error).message, 400)
  }
}
