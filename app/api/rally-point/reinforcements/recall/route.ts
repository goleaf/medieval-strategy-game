import { z } from "zod"
import { type NextRequest } from "next/server"

import { getRallyPointEngine } from "@/lib/rally-point/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { SitterPermissions } from "@/lib/utils/sitter-permissions"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import type { AccountActorType } from "@prisma/client"

const recallSchema = z.object({
  fromVillageId: z.string().min(1),
  toVillageId: z.string().min(1),
  ownerAccountId: z.string().min(1),
  units: z.record(z.number().int().nonnegative()),
  idempotencyKey: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return errorResponse("Unauthorized", 401)
    const json = await req.json()
    const parsed = recallSchema.safeParse(json)
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    // Sitter enforcement: treat recall as resource-sensitive
    const sitterContext = await SitterPermissions.getSitterContext(auth)
    if (sitterContext.isSitter) {
      const permissionCheck = await SitterPermissions.enforcePermission(
        req,
        sitterContext.sitterId!,
        sitterContext.ownerId!,
        'recallReinforcements'
      )
      if (permissionCheck) return permissionCheck
    }

    const engine = getRallyPointEngine()
    const movement = await engine.recallReinforcements(parsed.data)
    // Log sitter/dual action
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined
    const ua = req.headers.get("user-agent") || undefined
    if (sitterContext.isSitter) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "SITTER" as AccountActorType,
        actorUserId: auth.userId,
        actorPlayerId: sitterContext.sitterId,
        actorLabel: "Sitter",
        action: "REINFORCEMENTS_RECALL",
        metadata: parsed.data,
        ipAddress: ip,
        userAgent: ua,
      })
    } else if (auth.isDual && auth.dualFor) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "DUAL" as AccountActorType,
        actorUserId: auth.userId,
        actorLabel: "Dual",
        action: "REINFORCEMENTS_RECALL",
        metadata: parsed.data,
        ipAddress: ip,
        userAgent: ua,
      })
    }

    return successResponse({ movement })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
