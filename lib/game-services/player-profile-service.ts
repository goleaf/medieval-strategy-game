import { prisma } from "@/lib/db"
import { type ProfileVisibility, type SocialActivityVisibility } from "@prisma/client"

export type PlayerProfileDTO = {
  player: {
    id: string
    playerName: string
    rank: number
    totalPoints: number
    villagesUsed: number
    tribe?: { id: string; name: string; tag: string } | null
    tribeRole?: string | null
    createdAt: string
    lastActiveAt: string
    profileHeadline?: string | null
    profileBio?: string | null
    countryCode?: string | null
    preferredLanguage?: string | null
  }
  access: {
    visibility: ProfileVisibility
    restricted: boolean
  }
  stats: {
    od: { attacking: number; defending: number; supporting: number }
    troops: { killed: number; lost: number }
    battles: { wavesSurvived: number }
  } | null
  territory: {
    villages: Array<{
      id: string
      name: string
      x: number
      y: number
      population: number
      isCapital: boolean
      points: number
      createdAt: string
    }>
    averageVillagePoints: number
    villageCount: number
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
    expansionHistory: Array<{
      villageId: string
      name: string
      type: string
      happenedAt: string
      coordinate: { x: number; y: number }
    }>
  } | null
  social: {
    friends: Array<{
      id: string
      status: string
      relation: string
      requestedAt: string
      respondedAt: string | null
      friend: {
        id: string
        playerName: string
        tribeTag: string | null
        rank: number | null
        lastActiveAt: string | null
        online: boolean
      }
    }>
    badges: Array<{
      id: string
      badgeKey: string
      title: string
      description: string | null
      icon: string | null
      category: string | null
      tier: number
      awardedAt: string
    }>
    endorsements: Array<{
      id: string
      message: string | null
      strength: number
      createdAt: string
      endorser: { id: string; playerName: string; rank: number | null; tribe?: { tag: string | null } | null }
    }>
    mentorships: {
      asMentor: Array<{
        id: string
        status: string
        startedAt: string | null
        mentee: { id: string; playerName: string; rank: number | null }
      }>
      asMentee: Array<{
        id: string
        status: string
        startedAt: string | null
        mentor: { id: string; playerName: string; rank: number | null }
      }>
    }
    socialFeed: Array<{
      id: string
      activityType: string
      visibility: string
      summary: string
      payload: Record<string, unknown> | null
      createdAt: string
      actor?: { id: string; playerName: string } | null
    }>
    preferences: {
      allowFriendRequests: boolean
      allowMentorship: boolean
      socialFeedOptIn: boolean
    }
    viewerContext: {
      relationship: { status: string; initiatedByViewer: boolean } | null
      blockedByViewer: boolean
      blockedViewer: boolean
      canFriend: boolean
      canMentor: boolean
      note: { id: string; stance: string; note: string; tags: string[]; updatedAt: string } | null
      endorsement: { id: string; status: string; strength: number; message: string | null } | null
    } | null
  }
  achievements?: {
    showcase: Array<{
      key: string
      title: string
      description?: string | null
      category: string
      status: string
      progress: number
      target: number
      favorite: boolean
      claimed: boolean
      rarity: string
    }>
  }
}

export class PlayerProfileService {
  static async getProfile(params: { playerId?: string; handle?: string; viewerId?: string | null }): Promise<PlayerProfileDTO | null> {
    const { playerId, handle, viewerId } = params
    const player = await prisma.player.findFirst({
      where: playerId
        ? { id: playerId }
        : handle
          ? { OR: [{ id: handle }, { playerName: handle }] }
          : { id: "__never__" },
      include: {
        tribe: { select: { id: true, name: true, tag: true, leaderId: true } },
      },
    })
    if (!player) return null

    // Determine access restrictions based on visibility
    let restricted = false
    if (player.profileVisibility === "PRIVATE") {
      restricted = viewerId !== player.id
    } else if (player.profileVisibility === "TRIBE_ONLY") {
      if (!viewerId) restricted = true
      else {
        const viewer = await prisma.player.findUnique({ where: { id: viewerId }, select: { tribeId: true } })
        restricted = !viewer || viewer.tribeId !== player.tribeId
      }
    }

    // Basic player info
    const playerDto: PlayerProfileDTO["player"] = {
      id: player.id,
      playerName: player.playerName,
      rank: player.rank,
      totalPoints: player.totalPoints,
      villagesUsed: player.villagesUsed,
      tribe: player.tribe ? { id: player.tribe.id, name: player.tribe.name, tag: player.tribe.tag } : null,
      tribeRole: player.tribeRole ?? null,
      createdAt: player.createdAt.toISOString(),
      lastActiveAt: player.lastActiveAt.toISOString(),
      profileHeadline: player.profileHeadline ?? null,
      profileBio: player.profileBio ?? null,
      countryCode: player.countryCode ?? null,
      preferredLanguage: player.preferredLanguage ?? null,
    }

    // Stats block (null if restricted)
    const stats = restricted
      ? null
      : {
          od: {
            attacking: player.odAttacking,
            defending: player.odDefending,
            supporting: player.odSupporting,
          },
          troops: { killed: player.troopsKilled, lost: player.troopsLost },
          battles: { wavesSurvived: player.wavesSurvived },
        }

    // Territory block (villages + derived metrics)
    let territory: PlayerProfileDTO["territory"] | null = null
    if (!restricted) {
      const villages = await prisma.village.findMany({
        where: { playerId: player.id },
        select: {
          id: true,
          name: true,
          x: true,
          y: true,
          population: true,
          isCapital: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      })
      const mapped = villages.map((v) => ({
        id: v.id,
        name: v.name,
        x: v.x,
        y: v.y,
        population: v.population,
        isCapital: v.isCapital,
        points: v.population, // Use population as points proxy
        createdAt: v.createdAt.toISOString(),
      }))
      const villageCount = mapped.length
      const avgPoints = villageCount ? Math.round(mapped.reduce((sum, v) => sum + v.points, 0) / villageCount) : 0
      const bounds = mapped.length
        ? {
            minX: Math.min(...mapped.map((v) => v.x)),
            maxX: Math.max(...mapped.map((v) => v.x)),
            minY: Math.min(...mapped.map((v) => v.y)),
            maxY: Math.max(...mapped.map((v) => v.y)),
          }
        : { minX: 0, maxX: 0, minY: 0, maxY: 0 }
      const expansionHistory = mapped.map((v) => ({
        villageId: v.id,
        name: v.name,
        type: "FOUNDED",
        happenedAt: v.createdAt,
        coordinate: { x: v.x, y: v.y },
      }))
      territory = {
        villages: mapped,
        averageVillagePoints: avgPoints,
        villageCount,
        bounds,
        expansionHistory,
      }
    }

    // Social block
    const [badges, endorsements, mentorshipsMentor, mentorshipsMentee, feed] = await Promise.all([
      prisma.playerBadge.findMany({
        where: { playerId: player.id },
        orderBy: { awardedAt: "desc" },
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
      }),
      prisma.playerEndorsement.findMany({
        where: { targetId: player.id, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: { endorser: { select: { id: true, playerName: true, rank: true, tribe: { select: { tag: true } } } } },
      }),
      prisma.playerMentorship.findMany({
        where: { mentorId: player.id },
        orderBy: { startedAt: "desc" },
        include: { mentee: { select: { id: true, playerName: true, rank: true } } },
      }),
      prisma.playerMentorship.findMany({
        where: { menteeId: player.id },
        orderBy: { startedAt: "desc" },
        include: { mentor: { select: { id: true, playerName: true, rank: true } } },
      }),
      prisma.playerSocialActivity.findMany({
        where: {
          playerId: player.id,
          visibility: viewerId === player.id ? undefined : ("PUBLIC" as SocialActivityVisibility),
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { id: true, playerName: true } } },
      }),
    ])

    // Friends list - show accepted friendships (both directions)
    const friendships = await prisma.playerFriendship.findMany({
      where: {
        OR: [{ requesterId: player.id }, { addresseeId: player.id }],
        status: "ACCEPTED",
      },
      include: {
        requester: { select: { id: true, playerName: true, rank: true, tribe: { select: { tag: true } }, lastActiveAt: true } },
        addressee: { select: { id: true, playerName: true, rank: true, tribe: { select: { tag: true } }, lastActiveAt: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 50,
    })

    const friends = friendships.map((fr) => {
      const other = fr.requesterId === player.id ? fr.addressee : fr.requester
      const lastActiveAt = other.lastActiveAt?.toISOString() ?? null
      const online = lastActiveAt ? Date.now() - new Date(lastActiveAt).getTime() < 10 * 60 * 1000 : false
      return {
        id: fr.id,
        status: fr.status,
        relation: fr.requesterId === player.id ? "OUTBOUND" : "INBOUND",
        requestedAt: fr.requestedAt.toISOString(),
        respondedAt: fr.respondedAt ? fr.respondedAt.toISOString() : null,
        friend: {
          id: other.id,
          playerName: other.playerName,
          tribeTag: other.tribe?.tag ?? null,
          rank: other.rank ?? null,
          lastActiveAt,
          online,
        },
      }
    })

    // Viewer context
    let viewerContext: PlayerProfileDTO["social"]["viewerContext"] = null
    if (viewerId) {
      const [existingFriend, viewerBlock, targetBlock, existingNote, existingEndorsement] = await Promise.all([
        prisma.playerFriendship.findFirst({
          where: {
            OR: [
              { requesterId: viewerId, addresseeId: player.id },
              { requesterId: player.id, addresseeId: viewerId },
            ],
          },
        }),
        prisma.playerBlock.findUnique({ where: { playerId_blockedPlayerId: { playerId: viewerId, blockedPlayerId: player.id } } }),
        prisma.playerBlock.findUnique({ where: { playerId_blockedPlayerId: { playerId: player.id, blockedPlayerId: viewerId } } }),
        prisma.playerContactNote.findUnique({ where: { ownerId_targetId: { ownerId: viewerId, targetId: player.id } } }),
        prisma.playerEndorsement.findUnique({ where: { endorserId_targetId: { endorserId: viewerId, targetId: player.id } } }),
      ])

      const relationship = existingFriend
        ? {
            status: existingFriend.status,
            initiatedByViewer: existingFriend.requesterId === viewerId,
          }
        : null

      viewerContext = {
        relationship,
        blockedByViewer: Boolean(viewerBlock),
        blockedViewer: Boolean(targetBlock),
        canFriend: player.allowFriendRequests && player.id !== viewerId,
        canMentor: player.allowMentorship && player.id !== viewerId,
        note: existingNote
          ? {
              id: existingNote.id,
              stance: existingNote.stance,
              note: existingNote.note,
              tags: Array.isArray(existingNote.tags) ? (existingNote.tags as string[]) : [],
              updatedAt: existingNote.updatedAt.toISOString(),
            }
          : null,
        endorsement: existingEndorsement
          ? {
              id: existingEndorsement.id,
              status: existingEndorsement.status,
              strength: existingEndorsement.strength,
              message: existingEndorsement.message ?? null,
            }
          : null,
      }
    }

    // Achievement showcase (top 3 favorites)
    const favorites = await prisma.playerAchievement.findMany({
      where: { playerId: player.id, favorite: true },
      include: { achievement: true },
      orderBy: [{ claimedAt: "desc" }, { unlockedAt: "desc" }],
      take: 3,
    })

    const dto: PlayerProfileDTO = {
      player: playerDto,
      access: { visibility: player.profileVisibility, restricted },
      stats,
      territory,
      social: {
        friends,
        badges: badges.map((b) => ({
          id: b.id,
          badgeKey: b.badgeKey,
          title: b.title,
          description: b.description ?? null,
          icon: b.icon ?? null,
          category: b.category ?? null,
          tier: b.tier,
          awardedAt: b.awardedAt.toISOString(),
        })),
        endorsements: endorsements.map((e) => ({
          id: e.id,
          message: e.message ?? null,
          strength: e.strength,
          createdAt: e.createdAt.toISOString(),
          endorser: {
            id: e.endorser.id,
            playerName: e.endorser.playerName,
            rank: e.endorser.rank,
            tribe: { tag: e.endorser.tribe?.tag ?? null },
          },
        })),
        mentorships: {
          asMentor: mentorshipsMentor.map((m) => ({
            id: m.id,
            status: m.status,
            startedAt: m.startedAt ? m.startedAt.toISOString() : null,
            mentee: { id: m.mentee.id, playerName: m.mentee.playerName, rank: m.mentee.rank },
          })),
          asMentee: mentorshipsMentee.map((m) => ({
            id: m.id,
            status: m.status,
            startedAt: m.startedAt ? m.startedAt.toISOString() : null,
            mentor: { id: m.mentor.id, playerName: m.mentor.playerName, rank: m.mentor.rank },
          })),
        },
        socialFeed: feed.map((f) => ({
          id: f.id,
          activityType: f.activityType,
          visibility: f.visibility,
          summary: f.summary,
          payload: (f.payload as Record<string, unknown>) ?? null,
          createdAt: f.createdAt.toISOString(),
          actor: f.actor ? { id: f.actor.id, playerName: f.actor.playerName } : null,
        })),
        preferences: {
          allowFriendRequests: player.allowFriendRequests,
          allowMentorship: player.allowMentorship,
          socialFeedOptIn: player.socialFeedOptIn,
        },
        viewerContext,
      },
      achievements: {
        showcase: favorites.map((f) => ({
          key: f.achievement.key,
          title: f.achievement.title,
          description: f.achievement.description,
          category: f.achievement.category,
          status: f.status,
          progress: f.progress,
          target: f.achievement.targetValue,
          favorite: f.favorite,
          claimed: Boolean(f.claimedAt),
          rarity: "COMMON",
        })),
      },
    }

    return dto
  }
}
