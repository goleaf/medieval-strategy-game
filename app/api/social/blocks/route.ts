import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { playerBlockActionSchema } from "@/lib/utils/validation"
import {
  errorResponse,
  handleValidationError,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/utils/api-response"

const blockedSelect = {
  id: true,
  playerName: true,
  rank: true,
  tribe: { select: { tag: true } },
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const params = req.nextUrl.searchParams
    const playerId = params.get("playerId") ?? auth.playerId
    if (playerId !== auth.playerId) {
      return unauthorizedResponse()
    }

    const blocks = await prisma.playerBlock.findMany({
      where: { playerId },
      include: {
        blocked: { select: blockedSelect },
      },
      orderBy: { createdAt: "desc" },
    })

    return successResponse({
      blocks: blocks.map((entry) => ({
        id: entry.id,
        reason: entry.reason,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        blockedPlayer: entry.blocked,
      })),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = playerBlockActionSchema.parse(await req.json())
    if (payload.actorId !== auth.playerId) {
      return unauthorizedResponse()
    }
    if (payload.actorId === payload.targetId) {
      return errorResponse("Cannot block yourself.", 400)
    }

    const targetExists = await prisma.player.findUnique({
      where: { id: payload.targetId },
      select: { id: true },
    })
    if (!targetExists) {
      return errorResponse("Target player not found.", 404)
    }

    if (payload.action === "BLOCK") {
      const block = await prisma.playerBlock.upsert({
        where: {
          playerId_blockedPlayerId: {
            playerId: payload.actorId,
            blockedPlayerId: payload.targetId,
          },
        },
        update: {
          reason: payload.reason ?? null,
        },
        create: {
          playerId: payload.actorId,
          blockedPlayerId: payload.targetId,
          reason: payload.reason ?? null,
        },
        include: {
          blocked: { select: blockedSelect },
        },
      })

      await prisma.playerFriendship.deleteMany({
        where: {
          OR: [
            { requesterId: payload.actorId, addresseeId: payload.targetId },
            { requesterId: payload.targetId, addresseeId: payload.actorId },
          ],
        },
      })

      return successResponse({
        block: {
          id: block.id,
          reason: block.reason,
          createdAt: block.createdAt,
          blockedPlayer: block.blocked,
        },
      })
    }

    // UNBLOCK
    await prisma.playerBlock.deleteMany({
      where: {
        playerId: payload.actorId,
        blockedPlayerId: payload.targetId,
      },
    })

    return successResponse({ block: null })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
