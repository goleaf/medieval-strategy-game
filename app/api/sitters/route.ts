import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { errorResponse, notFoundResponse, serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()

    const [owner, sitters] = await Promise.all([
      prisma.player.findUnique({ where: { id: auth.playerId } }),
      prisma.sitter.findMany({
        where: { ownerId: auth.playerId, isActive: true },
        include: { sitter: true },
        orderBy: { addedAt: "desc" }
      })
    ])

    if (!owner) return notFoundResponse()

    const data = {
      sitters: sitters.map(s => ({
        id: s.id,
        sitterId: s.sitterId,
        sitterName: s.sitter.playerName,
        lastActiveAt: s.sitter.lastActiveAt,
        permissions: {
          canSendRaids: s.canSendRaids,
          canUseResources: s.canUseResources,
          canBuyAndSpendGold: s.canBuyAndSpendGold,
          canDemolishBuildings: s.canDemolishBuildings,
          canRecallReinforcements: s.canRecallReinforcements,
          canLaunchConquest: s.canLaunchConquest,
          canDismissTroops: s.canDismissTroops,
        },
        addedAt: s.addedAt,
      })),
      inactivityAllowance: owner.inactivityAllowanceDays,
      lastOwnerActivity: owner.lastOwnerActivityAt,
    }

    return successResponse(data)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()

    const body = await req.json()
    const { sitterId, permissions } = body || {}
    if (!sitterId || !permissions) {
      return errorResponse("Missing sitterId or permissions", 400)
    }

    const sitter = await SitterDualService.addSitter(auth.playerId, sitterId, permissions)
    return successResponse({ id: sitter.id })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
