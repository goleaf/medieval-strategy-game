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
    const troopId = String(json.troopId || "")
    const quantity = Number(json.quantity || 0)
    if (!troopId || !Number.isFinite(quantity) || quantity <= 0) {
      return errorResponse("Invalid payload", 400)
    }

    const troop = await prisma.troop.findUnique({
      where: { id: troopId },
      include: { village: true },
    })
    if (!troop) return errorResponse("Troop not found", 404)
    if (troop.village.playerId !== auth.playerId) return errorResponse("Forbidden", 403)

    // Sitter enforcement: dismissing troops requires specific permission
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

    await ArmyService.dismissTroops(troop.villageId, troopId, quantity)

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined
    const ua = req.headers.get("user-agent") || undefined
    if (sitterContext.isSitter) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "SITTER" as AccountActorType,
        actorUserId: auth.userId,
        actorPlayerId: sitterContext.sitterId,
        actorLabel: "Sitter",
        action: "TROOPS_DISMISS",
        metadata: { troopId, quantity },
        ipAddress: ip,
        userAgent: ua,
      })
    } else if (auth.isDual && auth.dualFor) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "DUAL" as AccountActorType,
        actorUserId: auth.userId,
        actorLabel: "Dual",
        action: "TROOPS_DISMISS",
        metadata: { troopId, quantity },
        ipAddress: ip,
        userAgent: ua,
      })
    }

    return successResponse({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

