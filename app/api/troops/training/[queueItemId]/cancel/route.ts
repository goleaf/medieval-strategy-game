import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"
import { UnitSystemService } from "@/lib/game-services/unit-system-service"
import { SitterPermissions } from "@/lib/utils/sitter-permissions"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import { type AccountActorType } from "@prisma/client"

export const POST = withMetrics("POST /api/troops/training/[queueItemId]/cancel", async (_req: NextRequest, context: { params: { queueItemId: string } }) => {
  try {
    const auth = await authenticateRequest(_req)
    if (!auth?.playerId) {
      return errorResponse("Unauthorized", 401)
    }

    const queueItemId = context.params.queueItemId
    if (!queueItemId) {
      return errorResponse("Missing queue item id", 400)
    }

    // Enforce sitter permission for resource refunds
    const sitterContext = await SitterPermissions.getSitterContext(auth)
    if (sitterContext.isSitter) {
      const permissionCheck = await SitterPermissions.enforcePermission(
        _req,
        sitterContext.sitterId!,
        sitterContext.ownerId!,
        "useResources",
      )
      if (permissionCheck) return permissionCheck
    }

    const result = await UnitSystemService.cancelTrainingJob(queueItemId)

    // Log sitter/dual actions
    const ip = _req.headers.get("x-forwarded-for") || _req.headers.get("x-real-ip") || undefined
    const ua = _req.headers.get("user-agent") || undefined
    if (sitterContext.isSitter) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "SITTER" as AccountActorType,
        actorUserId: auth.userId,
        actorPlayerId: sitterContext.sitterId,
        actorLabel: "Sitter",
        action: "TROOPS_TRAIN_CANCEL",
        metadata: { queueItemId },
        ipAddress: ip,
        userAgent: ua,
      })
    } else if (auth.isDual && auth.dualFor) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "DUAL" as AccountActorType,
        actorUserId: auth.userId,
        actorLabel: "Dual",
        action: "TROOPS_TRAIN_CANCEL",
        metadata: { queueItemId },
        ipAddress: ip,
        userAgent: ua,
      })
    }

    return successResponse(result)
  } catch (error) {
    return serverErrorResponse(error)
  }
})
