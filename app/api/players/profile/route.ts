import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { playerProfileUpdateSchema } from "@/lib/utils/validation"
import {
  errorResponse,
  handleValidationError,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/utils/api-response"
const ONLINE_WINDOW_MS = 10 * 60 * 1000
const SOCIAL_FEED_LIMIT = 15
const FRIENDS_LIMIT = 50

const friendSelect = {
  id: true,
  playerName: true,
  rank: true,
  tribe: { select: { tag: true } },
  lastActiveAt: true,
}

const friendshipInclude = {
  requester: { select: friendSelect },
  addressee: { select: friendSelect },
}

type FriendSummary = {
  id: string
  playerName: string
  rank: number | null
  tribe?: { tag: string | null } | null
  lastActiveAt: Date | null
}

type FriendshipWithRelations = {
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

function calculateVillagePoints(buildings: Array<{ level: number }>) {
  return buildings.reduce((sum, building) => sum + building.level, 0) + 1
}

function buildExpansionHistory(
  villages: Array<{
    id: string
    name: string
    createdAt: Date
    conqueredFromPlayerId: string | null
    foundedByVillageId: string | null
    x: number
    y: number
  }>,
) {
  return villages
    .map((village) => ({
      villageId: village.id,
      name: village.name,
      happenedAt: village.createdAt,
      coordinate: { x: village.x, y: village.y },
      type: village.conqueredFromPlayerId
        ? "CONQUERED"
        : village.foundedByVillageId
          ? "EXPANDED"
          : "FOUNDED",
    }))
    .sort((a, b) => a.happenedAt.getTime() - b.happenedAt.getTime())
}

function mapFriendship(entry: FriendshipWithRelations, perspectivePlayerId: string) {
  const friend =
    entry.requesterId === perspectivePlayerId ? entry.addressee : entry.requester
  return {
    id: entry.id,
    status: entry.status,
    requestedAt: entry.requestedAt,
    respondedAt: entry.respondedAt,
    lastInteractionAt: entry.lastInteractionAt,
    relation: entry.requesterId === perspectivePlayerId ? "OUTBOUND" : "INBOUND",
    friend: {
      id: friend.id,
      playerName: friend.playerName,
      rank: friend.rank,
      tribeTag: friend.tribe?.tag ?? null,
      lastActiveAt: friend.lastActiveAt,
      online: isOnline(friend.lastActiveAt),
    },
  }
}

export async function GET(req: NextRequest) {
  try {
    const viewerAuth = await authenticateRequest(req).catch(() => null)
    const viewerId = viewerAuth?.playerId ?? null

    const params = req.nextUrl.searchParams
    const playerIdParam = params.get("playerId")
    const handleParam = params.get("playerName") ?? params.get("handle")

    const whereClause = playerIdParam
      ? { id: playerIdParam }
      : handleParam
        ? {
            OR: [
              {
                playerName: {
                  equals: handleParam,
                  mode: "insensitive",
                },
              },
              { id: handleParam },
            ],
          }
        : null

    if (!whereClause) {
      return errorResponse("playerId or playerName is required", 400)
    }

    const player = await prisma.player.findFirst({
      where: whereClause,
      include: {
        tribe: { select: { id: true, name: true, tag: true } },
        villages: {
          select: {
            id: true,
            name: true,
            x: true,
            y: true,
            population: true,
            isCapital: true,
            createdAt: true,
            foundedByVillageId: true,
            conqueredFromPlayerId: true,
            buildings: { select: { level: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        badges: {
          select: {
            id: true,
            badgeKey: true,
            title: true,
            description: true,
            icon: true,
            category: true,
            tier: true,
            awardedAt: true,
          },
          orderBy: { awardedAt: "desc" },
          take: 24,
        },
      },
    })

    if (!player) {
      return errorResponse("Player not found", 404)
    }

    const isOwner = viewerId === player.id
    let viewerTribeId: string | null = null

    if (viewerId && !isOwner && player.profileVisibility !== "PUBLIC") {
      const viewerRecord = await prisma.player.findUnique({
        where: { id: viewerId },
        select: { tribeId: true },
      })
      viewerTribeId = viewerRecord?.tribeId ?? null
    }

    const hasTribeAccess =
      player.profileVisibility !== "TRIBE_ONLY" ||
      !player.tribeId ||
      (viewerTribeId !== null && player.tribeId === viewerTribeId)

    const hasFullAccess =
      isOwner ||
      player.profileVisibility === "PUBLIC" ||
      (player.profileVisibility === "TRIBE_ONLY" && hasTribeAccess)

    const villages = player.villages.map((village) => {
      const points = calculateVillagePoints(village.buildings)
      return {
        id: village.id,
        name: village.name,
        x: village.x,
        y: village.y,
        population: village.population,
        isCapital: village.isCapital,
        points,
        createdAt: village.createdAt,
        foundedByVillageId: village.foundedByVillageId,
        conqueredFromPlayerId: village.conqueredFromPlayerId,
      }
    })

    const averageVillagePoints =
      villages.length > 0 ? villages.reduce((sum, entry) => sum + entry.points, 0) / villages.length : 0

    const bounds =
      villages.length > 0
        ? villages.reduce(
            (acc, village) => {
              return {
                minX: Math.min(acc.minX, village.x),
                maxX: Math.max(acc.maxX, village.x),
                minY: Math.min(acc.minY, village.y),
                maxY: Math.max(acc.maxY, village.y),
              }
            },
            { minX: villages[0]!.x, maxX: villages[0]!.x, minY: villages[0]!.y, maxY: villages[0]!.y },
          )
        : { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const expansionHistory = buildExpansionHistory(villages)

    const [
      friendships,
      viewerFriendship,
      viewerNote,
      viewerBlocksTarget,
      targetBlocksViewer,
      endorsements,
      viewerEndorsement,
      mentorshipsAsMentor,
      mentorshipsAsMentee,
      socialFeed,
    ] = await Promise.all([
      prisma.playerFriendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: player.id }, { addresseeId: player.id }],
        },
        include: friendshipInclude,
        orderBy: { lastInteractionAt: "desc" },
        take: FRIENDS_LIMIT,
      }),
      viewerId
        ? prisma.playerFriendship.findFirst({
            where: {
              OR: [
                { requesterId: viewerId, addresseeId: player.id },
                { requesterId: player.id, addresseeId: viewerId },
              ],
            },
          })
        : null,
      viewerId
        ? prisma.playerContactNote.findUnique({
            where: {
              ownerId_targetId: {
                ownerId: viewerId,
                targetId: player.id,
              },
            },
          })
        : null,
      viewerId
        ? prisma.playerBlock.findUnique({
            where: {
              playerId_blockedPlayerId: {
                playerId: viewerId,
                blockedPlayerId: player.id,
              },
            },
          })
        : null,
      viewerId
        ? prisma.playerBlock.findUnique({
            where: {
              playerId_blockedPlayerId: {
                playerId: player.id,
                blockedPlayerId: viewerId,
              },
            },
          })
        : null,
      prisma.playerEndorsement.findMany({
        where: {
          targetId: player.id,
          status: "PUBLISHED",
        },
        include: {
          endorser: {
            select: {
              id: true,
              playerName: true,
              rank: true,
              tribe: { select: { tag: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      viewerId
        ? prisma.playerEndorsement.findFirst({
            where: {
              targetId: player.id,
              endorserId: viewerId,
            },
          })
        : null,
      prisma.playerMentorship.findMany({
        where: {
          mentorId: player.id,
          status: { in: ["ACTIVE", "PENDING"] },
        },
        include: {
          mentee: {
            select: {
              id: true,
              playerName: true,
              rank: true,
            },
          },
        },
      }),
      prisma.playerMentorship.findMany({
        where: {
          menteeId: player.id,
          status: { in: ["ACTIVE", "PENDING"] },
        },
        include: {
          mentor: {
            select: {
              id: true,
              playerName: true,
              rank: true,
            },
          },
        },
      }),
      player.socialFeedOptIn || isOwner
        ? prisma.playerSocialActivity.findMany({
            where: { playerId: player.id },
            orderBy: { createdAt: "desc" },
            take: SOCIAL_FEED_LIMIT,
            include: {
              actor: { select: { id: true, playerName: true } },
            },
          })
        : [],
    ])

    const friendSummaries = friendships.map((entry) => mapFriendship(entry, player.id))

    const viewerContext = viewerId
      ? {
          relationship: viewerFriendship
            ? {
                status: viewerFriendship.status,
                initiatedByViewer: viewerFriendship.requesterId === viewerId,
              }
            : null,
          blockedByViewer: Boolean(viewerBlocksTarget),
          blockedViewer: Boolean(targetBlocksViewer),
          canFriend:
            viewerId !== player.id &&
            player.allowFriendRequests &&
            !viewerBlocksTarget &&
            !targetBlocksViewer,
          canMentor: player.allowMentorship,
          note: viewerNote
            ? {
                id: viewerNote.id,
                stance: viewerNote.stance,
                note: viewerNote.note,
                tags: Array.isArray(viewerNote.tags) ? viewerNote.tags : [],
                updatedAt: viewerNote.updatedAt,
              }
            : null,
          endorsement: viewerEndorsement
            ? {
                id: viewerEndorsement.id,
                status: viewerEndorsement.status,
                strength: viewerEndorsement.strength,
                message: viewerEndorsement.message,
              }
            : null,
        }
      : null

    return successResponse({
      player: {
        id: player.id,
        playerName: player.playerName,
        rank: player.rank,
        totalPoints: player.totalPoints,
        tribe: player.tribe,
        tribeRole: player.tribeRole,
        villagesUsed: player.villagesUsed,
        createdAt: player.createdAt,
        lastActiveAt: player.lastActiveAt,
        profileHeadline: hasFullAccess ? player.profileHeadline : null,
        profileBio: hasFullAccess ? player.profileBio : null,
        countryCode: hasFullAccess ? player.countryCode : null,
        preferredLanguage: hasFullAccess ? player.preferredLanguage : null,
      },
      access: {
        visibility: player.profileVisibility,
        restricted: !hasFullAccess,
      },
      stats: hasFullAccess
        ? {
            od: {
              attacking: player.odAttacking,
              defending: player.odDefending,
              supporting: player.odSupporting,
            },
            troops: {
              killed: player.troopsKilled,
              lost: player.troopsLost,
            },
            battles: {
              wavesSurvived: player.wavesSurvived,
            },
          }
        : null,
      territory: hasFullAccess
        ? {
            villages,
            averageVillagePoints,
            villageCount: villages.length,
            bounds,
            expansionHistory,
          }
        : null,
      social: {
        friends: friendSummaries,
        badges: player.badges,
        endorsements: endorsements.map((endorsement) => ({
          id: endorsement.id,
          message: endorsement.message,
          strength: endorsement.strength,
          createdAt: endorsement.createdAt,
          endorser: endorsement.endorser,
        })),
        mentorships: {
          asMentor: mentorshipsAsMentor.map((entry) => ({
            id: entry.id,
            mentee: entry.mentee,
            status: entry.status,
            startedAt: entry.startedAt,
          })),
          asMentee: mentorshipsAsMentee.map((entry) => ({
            id: entry.id,
            mentor: entry.mentor,
            status: entry.status,
            startedAt: entry.startedAt,
          })),
        },
        socialFeed: socialFeed.map((entry) => ({
          id: entry.id,
          activityType: entry.activityType,
          visibility: entry.visibility,
          summary: entry.summary,
          payload: entry.payload,
          createdAt: entry.createdAt,
          actor: entry.actor,
        })),
        preferences: {
          allowFriendRequests: player.allowFriendRequests,
          allowMentorship: player.allowMentorship,
          socialFeedOptIn: player.socialFeedOptIn,
        },
        viewerContext,
      },
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

    const payload = playerProfileUpdateSchema.parse(await req.json())
    if (payload.playerId !== auth.playerId) {
      return unauthorizedResponse()
    }

    const data: Prisma.PlayerUpdateInput = {}

    if ("profileHeadline" in payload) {
      data.profileHeadline = payload.profileHeadline ?? null
    }
    if ("profileBio" in payload) {
      data.profileBio = payload.profileBio ?? null
    }
    if ("countryCode" in payload) {
      data.countryCode = payload.countryCode ?? null
    }
    if ("preferredLanguage" in payload) {
      data.preferredLanguage = payload.preferredLanguage ?? null
    }
    if ("profileVisibility" in payload && payload.profileVisibility) {
      data.profileVisibility = payload.profileVisibility
    }
    if ("allowFriendRequests" in payload) {
      data.allowFriendRequests = payload.allowFriendRequests
    }
    if ("allowMentorship" in payload) {
      data.allowMentorship = payload.allowMentorship
    }
    if ("socialFeedOptIn" in payload) {
      data.socialFeedOptIn = payload.socialFeedOptIn
    }

    const updated = await prisma.player.update({
      where: { id: auth.playerId },
      data,
      select: {
        id: true,
        profileHeadline: true,
        profileBio: true,
        countryCode: true,
        preferredLanguage: true,
        profileVisibility: true,
        allowFriendRequests: true,
        allowMentorship: true,
        socialFeedOptIn: true,
      },
    })

    return successResponse(updated)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
