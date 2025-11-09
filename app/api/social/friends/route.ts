import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { playerFriendActionSchema } from "@/lib/utils/validation"
import {
  errorResponse,
  handleValidationError,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/utils/api-response"
const ONLINE_WINDOW_MS = 10 * 60 * 1000

const playerSummarySelect = {
  id: true,
  playerName: true,
  rank: true,
  lastActiveAt: true,
  tribe: { select: { tag: true } },
}

const friendshipInclude = {
  requester: { select: playerSummarySelect },
  addressee: { select: playerSummarySelect },
}

type FriendSummary = {
  id: string
  playerName: string
  rank: number | null
  tribe?: { tag: string | null } | null
  lastActiveAt: Date | null
}

type FriendshipRecord = {
  id: string
  requesterId: string
  addresseeId: string
  status: string
  requestedAt: Date
  respondedAt: Date | null
  lastInteractionAt: Date | null
  requester: FriendSummary
  addressee: FriendSummary
}

function isOnline(lastActiveAt: Date | null | undefined) {
  if (!lastActiveAt) return false
  return Date.now() - lastActiveAt.getTime() < ONLINE_WINDOW_MS
}

function toFriendshipDto(entry: FriendshipRecord, perspectiveId: string) {
  const other = entry.requesterId === perspectiveId ? entry.addressee : entry.requester
  return {
    id: entry.id,
    status: entry.status,
    requestedAt: entry.requestedAt,
    respondedAt: entry.respondedAt,
    lastInteractionAt: entry.lastInteractionAt,
    relation: entry.requesterId === perspectiveId ? "OUTBOUND" : "INBOUND",
    friend: {
      id: other.id,
      playerName: other.playerName,
      rank: other.rank,
      tribeTag: other.tribe?.tag ?? null,
      lastActiveAt: other.lastActiveAt,
      online: isOnline(other.lastActiveAt),
    },
  }
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

    const includePending = params.get("includePending") === "true"

    const friendships = await prisma.playerFriendship.findMany({
      where: {
        OR: [{ requesterId: playerId }, { addresseeId: playerId }],
        ...(includePending ? {} : { status: "ACCEPTED" }),
      },
      include: friendshipInclude,
      orderBy: { requestedAt: "desc" },
    })

    return successResponse({
      friends: friendships.map((entry) => toFriendshipDto(entry, playerId)),
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

    const payload = playerFriendActionSchema.parse(await req.json())
    if (payload.actorId !== auth.playerId) {
      return unauthorizedResponse()
    }
    if (payload.actorId === payload.targetId) {
      return errorResponse("Cannot perform this action on yourself", 400)
    }

    const [target, actorBlock, targetBlock, existing] = await Promise.all([
      prisma.player.findUnique({
        where: { id: payload.targetId },
        select: {
          id: true,
          allowFriendRequests: true,
        },
      }),
      prisma.playerBlock.findUnique({
        where: {
          playerId_blockedPlayerId: {
            playerId: payload.actorId,
            blockedPlayerId: payload.targetId,
          },
        },
      }),
      prisma.playerBlock.findUnique({
        where: {
          playerId_blockedPlayerId: {
            playerId: payload.targetId,
            blockedPlayerId: payload.actorId,
          },
        },
      }),
      prisma.playerFriendship.findFirst({
        where: {
          OR: [
            { requesterId: payload.actorId, addresseeId: payload.targetId },
            { requesterId: payload.targetId, addresseeId: payload.actorId },
          ],
        },
        include: friendshipInclude,
      }),
    ])

    if (!target) {
      return errorResponse("Target player not found", 404)
    }

    if (actorBlock || targetBlock) {
      return errorResponse("Friendship unavailable while either player is blocked", 403)
    }

    const now = new Date()

    const respondWithFriendship = async (
      recordId: string,
    ): Promise<ReturnType<typeof successResponse>> => {
      const record = await prisma.playerFriendship.findUniqueOrThrow({
        where: { id: recordId },
        include: friendshipInclude,
      })
      return successResponse({ friendship: toFriendshipDto(record, payload.actorId) })
    }

    switch (payload.action) {
      case "REQUEST": {
        if (!target.allowFriendRequests) {
          return errorResponse("This player does not accept friend requests.", 403)
        }

        if (existing) {
          if (existing.status === "ACCEPTED") {
            return errorResponse("You are already friends.", 409)
          }
          if (existing.status === "PENDING" && existing.requesterId === payload.actorId) {
            return errorResponse("Friend request already sent.", 409)
          }
          if (existing.status === "PENDING" && existing.requesterId === payload.targetId) {
            const updated = await prisma.playerFriendship.update({
              where: { id: existing.id },
              data: {
                status: "ACCEPTED",
                respondedAt: now,
                lastInteractionAt: now,
              },
            })
            return respondWithFriendship(updated.id)
          }
        }

        const created = await prisma.playerFriendship.create({
          data: {
            requesterId: payload.actorId,
            addresseeId: payload.targetId,
            status: "PENDING",
            requestedAt: now,
            lastInteractionAt: now,
            note: payload.message ?? null,
          },
        })
        return respondWithFriendship(created.id)
      }
      case "ACCEPT": {
        if (!existing || existing.status !== "PENDING" || existing.requesterId !== payload.targetId) {
          return errorResponse("No incoming friend request to accept.", 404)
        }
        const updated = await prisma.playerFriendship.update({
          where: { id: existing.id },
          data: {
            status: "ACCEPTED",
            respondedAt: now,
            lastInteractionAt: now,
          },
        })
        return respondWithFriendship(updated.id)
      }
      case "DECLINE": {
        if (!existing || existing.status !== "PENDING" || existing.requesterId !== payload.targetId) {
          return errorResponse("No incoming friend request to decline.", 404)
        }
        const updated = await prisma.playerFriendship.update({
          where: { id: existing.id },
          data: {
            status: "DECLINED",
            respondedAt: now,
            lastInteractionAt: now,
          },
        })
        return respondWithFriendship(updated.id)
      }
      case "REMOVE": {
        if (!existing || existing.status !== "ACCEPTED") {
          return errorResponse("You are not currently friends.", 404)
        }
        await prisma.playerFriendship.delete({ where: { id: existing.id } })
        return successResponse({ friendship: null })
      }
      case "CANCEL": {
        if (!existing || existing.status !== "PENDING" || existing.requesterId !== payload.actorId) {
          return errorResponse("No pending friend request to cancel.", 404)
        }
        await prisma.playerFriendship.delete({ where: { id: existing.id } })
        return successResponse({ friendship: null })
      }
      default:
        return errorResponse("Unsupported action", 400)
    }
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
