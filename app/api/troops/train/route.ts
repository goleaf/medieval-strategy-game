import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { UnitSystemService } from "@/lib/game-services/unit-system-service"
import { SitterPermissions } from "@/lib/utils/sitter-permissions"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import { type AccountActorType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return errorResponse("Unauthorized", 401)
    }

    const body = await req.json()
    const villageId = String(body.villageId || "")
    const troopType = String(body.troopType || "")
    const quantity = Number(body.quantity || 0)

    if (!villageId || !troopType || !Number.isFinite(quantity) || quantity <= 0) {
      return errorResponse("Invalid payload", 400)
    }

    // Enforce sitter permission for resource usage
    const sitterContext = await SitterPermissions.getSitterContext(auth)
    if (sitterContext.isSitter) {
      const permissionCheck = await SitterPermissions.enforcePermission(
        req,
        sitterContext.sitterId!,
        sitterContext.ownerId!,
        "useResources",
      )
      if (permissionCheck) return permissionCheck
    }

    await UnitSystemService.trainUnits({ villageId, unitTypeId: troopType, count: quantity })

    // Log sitter/dual actions
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined
    const ua = req.headers.get("user-agent") || undefined
    if (sitterContext.isSitter) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "SITTER" as AccountActorType,
        actorUserId: auth.userId,
        actorPlayerId: sitterContext.sitterId,
        actorLabel: "Sitter",
        action: "TROOPS_TRAIN",
        metadata: { villageId, troopType, quantity },
        ipAddress: ip,
        userAgent: ua,
      })
    } else if (auth.isDual && auth.dualFor) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "DUAL" as AccountActorType,
        actorUserId: auth.userId,
        actorLabel: "Dual",
        action: "TROOPS_TRAIN",
        metadata: { villageId, troopType, quantity },
        ipAddress: ip,
        userAgent: ua,
      })
    }

    return successResponse({ ok: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
