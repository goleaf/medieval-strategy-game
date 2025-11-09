import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { ArmyService } from "@/lib/game-services/army-service"
import { prisma } from "@/lib/db"
import { SitterPermissions } from "@/lib/utils/sitter-permissions"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import type { AccountActorType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return errorResponse("Unauthorized", 401)

    const json = await req.json()
    const items: Array<{ troopId: string; quantity: number }> = Array.isArray(json?.items) ? json.items : []
    if (!items.length) return errorResponse("No items provided", 400)

    // Sitter enforcement once for the batch
    const sitterContext = await SitterPermissions.getSitterContext(auth)
    if (sitterContext.isSitter) {
      const permissionCheck = await SitterPermissions.enforcePermission(
        req,
        sitterContext.sitterId!,
        sitterContext.ownerId!,
        'dismissTroops'
      )
      if (permissionCheck) return permissionCheck
    }

    // Validate ownership and run dismissals
    for (const entry of items) {
      const troop = await prisma.troop.findUnique({ where: { id: entry.troopId }, include: { village: true } })
      if (!troop) return errorResponse(`Troop not found: ${entry.troopId}`, 404)
      if (troop.village.playerId !== auth.playerId) return errorResponse("Forbidden", 403)
      const qty = Number(entry.quantity)
      if (!Number.isFinite(qty) || qty <= 0) return errorResponse("Invalid quantity", 400)
      await ArmyService.dismissTroops(troop.villageId, troop.id, qty)
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined
    const ua = req.headers.get("user-agent") || undefined
    if (sitterContext.isSitter) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "SITTER" as AccountActorType,
        actorUserId: auth.userId,
        actorPlayerId: sitterContext.sitterId,
        actorLabel: "Sitter",
        action: "TROOPS_DISMISS_BATCH",
        metadata: { count: items.length, items },
        ipAddress: ip,
        userAgent: ua,
      })
    } else if (auth.isDual && auth.dualFor) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "DUAL" as AccountActorType,
        actorUserId: auth.userId,
        actorLabel: "Dual",
        action: "TROOPS_DISMISS_BATCH",
        metadata: { count: items.length, items },
        ipAddress: ip,
        userAgent: ua,
      })
    }

    return successResponse({ ok: true, dismissed: items.length })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

