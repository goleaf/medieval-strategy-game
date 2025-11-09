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
    // Rate limit trades: max 30 per hour per player
    try {
      const { rateLimit } = await import("@/lib/security/ratelimit")
      const key = `trade:${auth.playerId}`
      if (!rateLimit({ key, rate: 30, perMs: 60 * 60 * 1000 })) {
        return errorResponse("Too many trades in the last hour. Please try later.", 429)
      }
    } catch {}

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

    // Validate coordinates if using raw coords
    if (!payload.toVillageId) {
      if (
        payload.toX == null ||
        payload.toY == null ||
        payload.toX < 0 ||
        payload.toX > 999 ||
        payload.toY < 0 ||
        payload.toY > 999
      ) {
        return errorResponse("Destination coordinates out of bounds", 400)
      }
    }

    const trade = await PlayerTradeService.initiateDirectTrade({
      playerId: auth.playerId,
      sourceVillageId: payload.fromVillageId,
      destination,
      resources: payload.resources,
    })

    const headers = auth.rotatedToken ? { Authentication: `Bearer ${auth.rotatedToken}` } : undefined
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
    }, 200, headers)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return errorResponse((error as Error).message, 400)
  }
}
