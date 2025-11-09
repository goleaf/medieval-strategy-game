import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { playerSocialFeedPostSchema } from "@/lib/utils/validation"
import {
  errorResponse,
  handleValidationError,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/utils/api-response"

const actorSelect = {
  id: true,
  playerName: true,
}

export async function GET(req: NextRequest) {
  try {
    const viewer = await authenticateRequest(req).catch(() => null)
    const viewerId = viewer?.playerId ?? null

    const params = req.nextUrl.searchParams
    const playerId = params.get("playerId")
    if (!playerId) {
      return errorResponse("playerId is required", 400)
    }
    const limit = Math.min(Number.parseInt(params.get("limit") || "15", 10), 50)

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        socialFeedOptIn: true,
      },
    })
    if (!player) {
      return errorResponse("Player not found", 404)
    }

    const isOwner = viewerId === playerId
    if (!player.socialFeedOptIn && !isOwner) {
      return successResponse({ entries: [] })
    }

    let viewerIsFriend = false
    if (viewerId && viewerId !== playerId) {
      const friendship = await prisma.playerFriendship.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: playerId, addresseeId: viewerId },
            { requesterId: viewerId, addresseeId: playerId },
          ],
        },
      })
      viewerIsFriend = Boolean(friendship)
    }

    const visibilityFilter = isOwner
      ? {}
      : viewerIsFriend
        ? { visibility: { in: ["PUBLIC", "FRIENDS"] } }
        : { visibility: "PUBLIC" }

    const entries = await prisma.playerSocialActivity.findMany({
      where: {
        playerId,
        ...visibilityFilter,
      },
      include: {
        actor: { select: actorSelect },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return successResponse({ entries })
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
    const payload = playerSocialFeedPostSchema.parse(await req.json())
    if (payload.actorId !== auth.playerId) {
      return unauthorizedResponse()
    }
    if (payload.playerId !== payload.actorId) {
      return errorResponse("You can only post updates to your own feed.", 400)
    }

    const entry = await prisma.playerSocialActivity.create({
      data: {
        playerId: payload.playerId,
        actorId: payload.actorId,
        summary: payload.summary,
        activityType: payload.activityType,
        visibility: payload.visibility ?? "PUBLIC",
        payload: payload.payload ?? {},
      },
      include: {
        actor: { select: actorSelect },
      },
    })

    return successResponse({ entry })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
