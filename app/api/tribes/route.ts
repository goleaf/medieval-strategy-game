import { prisma } from "@/lib/db"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError } from "@/lib/utils/api-response"
import {
  tribeApplicationReviewSchema,
  tribeApplicationSubmitSchema,
  tribeBulkInviteSchema,
  tribeCreateSchema,
  tribeDefaultPermissionSchema,
  tribeInviteResponseSchema,
  tribeInviteSchema,
  tribeJoinSchema,
  tribeMemberRemovalSchema,
  tribeRoleUpdateSchema,
} from "@/lib/utils/validation"
import {
  ALL_TRIBE_PERMISSIONS,
  TRIBE_CREATION_MIN_POINTS,
  TRIBE_CREATION_PREMIUM_COST,
  TRIBE_INVITE_EXPIRY_HOURS,
  TRIBE_LEAVE_COOLDOWN_HOURS,
  getRolePermissionDefaults,
} from "@/lib/config/tribes"
import type { NextRequest } from "next/server"
import type { Player, Prisma, TribeRole } from "@prisma/client"
import { type TribePermissionValue, TRIBE_PERMISSION_VALUES } from "@/lib/tribes/permissions"

const HOUR_IN_MS = 60 * 60 * 1000
const PERMISSION_SET = new Set<TribePermissionValue>(TRIBE_PERMISSION_VALUES as TribePermissionValue[])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = (body.action || "create") as string

    switch (action) {
      case "create":
        return await handleCreate(body)
      case "join":
        return await handleJoin(body)
      case "invite":
        return await handleInvite(body)
      case "bulkInvite":
        return await handleBulkInvite(body)
      case "respondInvite":
        return await handleRespondInvite(body)
      case "apply":
        return await handleApplication(body)
      case "reviewApplication":
        return await handleReviewApplication(body)
      case "leave":
        return await handleLeave(body)
      case "removeMember":
        return await handleRemoveMember(body)
      case "updateRole":
        return await handleRoleUpdate(body)
      case "updateDefaultPermissions":
        return await handleDefaultPermissions(body)
      default:
        return errorResponse("Invalid action", 400)
    }
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const tribeId = req.nextUrl.searchParams.get("tribeId")
    const managerId = req.nextUrl.searchParams.get("managerId")

    if (tribeId) {
      const tribe = await prisma.tribe.findUnique({
        where: { id: tribeId },
        include: {
          leader: { select: { id: true, playerName: true } },
          members: {
            select: {
              id: true,
              playerName: true,
              totalPoints: true,
              villagesUsed: true,
              rank: true,
              lastActiveAt: true,
              tribeRole: true,
              tribeJoinedAt: true,
            },
            orderBy: { totalPoints: "desc" },
          },
          _count: { select: { members: true } },
        },
      })

      if (!tribe) {
        return errorResponse("Tribe not found", 404)
      }

      let managerPermissions: TribePermissionValue[] = []
      if (managerId) {
        const manager = await prisma.player.findUnique({
          where: { id: managerId },
          select: {
            id: true,
            tribeId: true,
            tribeRole: true,
            tribePermissions: true,
          },
        })

        if (manager && manager.tribeId === tribeId) {
          managerPermissions = resolvePermissions(manager, tribe.memberDefaultPermissions)
        }
      }

      const includeInvites = managerPermissions.includes("INVITE_MEMBER") || managerPermissions.includes("VIEW_APPLICATIONS")
      const includeApplications = managerPermissions.includes("VIEW_APPLICATIONS")

      const [pendingInvites, pendingApplications] = await Promise.all([
        includeInvites
          ? prisma.tribeInvite.findMany({
              where: {
                tribeId,
                status: "PENDING",
              },
              include: {
                player: { select: { id: true, playerName: true, totalPoints: true, rank: true } },
                invitedBy: { select: { id: true, playerName: true } },
              },
              orderBy: { createdAt: "desc" },
            })
          : [],
        includeApplications
          ? prisma.tribeApplication.findMany({
              where: { tribeId, status: "PENDING" },
              include: {
                player: {
                  select: {
                    id: true,
                    playerName: true,
                    totalPoints: true,
                    villagesUsed: true,
                    rank: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            })
          : [],
      ])

      return successResponse({
        tribe: {
          ...tribe,
          pendingInvites,
          pendingInviteCount: pendingInvites.length,
          pendingApplications,
          applicationCount: pendingApplications.length,
          memberDefaultPermissions: normalizePermissionJson(tribe.memberDefaultPermissions),
          config: {
            leaveCooldownHours: TRIBE_LEAVE_COOLDOWN_HOURS,
          },
        },
        permissions: managerPermissions,
      })
    }

    const tribes = await prisma.tribe.findMany({
      include: {
        leader: { select: { id: true, playerName: true } },
        _count: { select: { members: true } },
      },
      orderBy: { totalPoints: "desc" },
      take: 100,
    })

    return successResponse({
      tribes,
      requirements: {
        minimumPoints: TRIBE_CREATION_MIN_POINTS,
        premiumCost: TRIBE_CREATION_PREMIUM_COST,
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

async function handleCreate(body: unknown) {
  const validated = tribeCreateSchema.parse(body)

  const leader = await prisma.player.findUnique({
    where: { id: validated.leaderId },
    select: {
      id: true,
      playerName: true,
      tribeId: true,
      totalPoints: true,
      premiumPoints: true,
      tribeRejoinAvailableAt: true,
    },
  })

  if (!leader) {
    return errorResponse("Player not found", 404)
  }

  if (leader.tribeId) {
    return errorResponse("Player already in a tribe", 409)
  }

  if (leader.tribeRejoinAvailableAt && leader.tribeRejoinAvailableAt.getTime() > Date.now()) {
    return errorResponse("Player is on a tribe cooldown", 403)
  }

  const meetsPoints = leader.totalPoints >= TRIBE_CREATION_MIN_POINTS
  const wantsPremiumBypass = validated.usePremiumBypass === true

  if (!meetsPoints && !wantsPremiumBypass) {
    return errorResponse(
      `Need ${TRIBE_CREATION_MIN_POINTS.toLocaleString()} points or premium bypass to create a tribe`,
      403,
    )
  }

  if (wantsPremiumBypass && leader.premiumPoints < TRIBE_CREATION_PREMIUM_COST) {
    return errorResponse("Not enough premium points to create a tribe", 402)
  }

  const defaultPermissions = sanitizePermissions(validated.memberDefaultPermissions || [])

  const tribe = await prisma.$transaction(async (tx) => {
    const created = await tx.tribe.create({
      data: {
        name: validated.name,
        tag: validated.tag.toUpperCase(),
        leaderId: leader.id,
        description: validated.description,
        profileBody: validated.profileBody,
        joinPolicy: validated.joinPolicy || "INVITE_ONLY",
        memberDefaultPermissions: defaultPermissions,
        totalPoints: leader.totalPoints,
      },
    })

    await tx.player.update({
      where: { id: leader.id },
      data: {
        premiumPoints: wantsPremiumBypass ? { decrement: TRIBE_CREATION_PREMIUM_COST } : undefined,
        tribeId: created.id,
        tribeRole: "FOUNDER",
        tribePermissions: null,
        tribeJoinedAt: new Date(),
        tribeRejoinAvailableAt: null,
      },
    })

    return created
  })

  return successResponse(tribe, 201)
}

async function handleJoin(body: unknown) {
  const validated = tribeJoinSchema.parse(body)

  const tribe = await prisma.tribe.findUnique({
    where: { id: validated.tribeId },
    select: {
      id: true,
      joinPolicy: true,
      memberDefaultPermissions: true,
      name: true,
    },
  })

  if (!tribe) {
    return errorResponse("Tribe not found", 404)
  }

  const player = await prisma.player.findUnique({
    where: { id: validated.playerId },
    select: {
      id: true,
      tribeId: true,
      totalPoints: true,
      tribeRejoinAvailableAt: true,
    },
  })

  if (!player) {
    return errorResponse("Player not found", 404)
  }

  if (player.tribeId) {
    return errorResponse("Player already in a tribe", 409)
  }

  if (player.tribeRejoinAvailableAt && player.tribeRejoinAvailableAt.getTime() > Date.now()) {
    return errorResponse("Player is on a tribe cooldown", 403)
  }

  if (tribe.joinPolicy === "INVITE_ONLY") {
    const invite = await prisma.tribeInvite.findFirst({
      where: {
        tribeId: tribe.id,
        playerId: player.id,
        status: "PENDING",
      },
    })

    if (!invite) {
      return errorResponse("Invite required to join this tribe", 403)
    }

    await prisma.tribeInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    })
  } else if (tribe.joinPolicy === "APPLICATION") {
    return errorResponse("This tribe requires an application approval", 403)
  }

  await addMemberToTribe({
    tribeId: tribe.id,
    player,
    role: "MEMBER",
    customPermissions: null,
  })

  return successResponse({ message: `Joined ${tribe.name} successfully` })
}

async function handleInvite(body: unknown) {
  const validated = tribeInviteSchema.parse(body)

  const inviter = await prisma.player.findUnique({
    where: { id: validated.invitedById },
    select: {
      id: true,
      playerName: true,
      tribeId: true,
      tribeRole: true,
      tribePermissions: true,
      tribe: {
        select: {
          id: true,
          memberDefaultPermissions: true,
        },
      },
    },
  })

  if (!inviter || !inviter.tribe || inviter.tribeId !== validated.tribeId) {
    return errorResponse("Inviter must belong to this tribe", 403)
  }

  const inviterPermissions = resolvePermissions(inviter, inviter.tribe.memberDefaultPermissions)

  if (!inviterPermissions.includes("INVITE_MEMBER")) {
    return errorResponse("You do not have permission to invite players", 403)
  }

  const target = await prisma.player.findUnique({
    where: { id: validated.playerId },
    select: { id: true, playerName: true, tribeId: true },
  })

  if (!target) {
    return errorResponse("Target player not found", 404)
  }

  if (target.tribeId === inviter.tribeId) {
    return errorResponse("Player is already in this tribe", 409)
  }

  const expiresAt = new Date(Date.now() + (validated.expiresInHours || TRIBE_INVITE_EXPIRY_HOURS) * HOUR_IN_MS)

  const invite = await prisma.tribeInvite.upsert({
    where: {
      tribeId_playerId: {
        tribeId: validated.tribeId,
        playerId: validated.playerId,
      },
    },
    update: {
      invitedById: inviter.id,
      message: validated.message,
      expiresAt,
      status: "PENDING",
    },
    create: {
      tribeId: validated.tribeId,
      playerId: validated.playerId,
      invitedById: inviter.id,
      message: validated.message,
      expiresAt,
    },
    include: {
      player: { select: { id: true, playerName: true } },
    },
  })

  return successResponse(invite, 201)
}

async function handleBulkInvite(body: unknown) {
  const validated = tribeBulkInviteSchema.parse(body)

  const inviter = await prisma.player.findUnique({
    where: { id: validated.invitedById },
    select: {
      id: true,
      tribeId: true,
      tribeRole: true,
      tribePermissions: true,
      tribe: {
        select: {
          id: true,
          memberDefaultPermissions: true,
        },
      },
    },
  })

  if (!inviter || !inviter.tribe || inviter.tribeId !== validated.tribeId) {
    return errorResponse("Inviter must belong to this tribe", 403)
  }

  const inviterPermissions = resolvePermissions(inviter, inviter.tribe.memberDefaultPermissions)

  if (!inviterPermissions.includes("INVITE_MEMBER")) {
    return errorResponse("You do not have permission to invite players", 403)
  }

  const targetIds = new Set<string>()

  if (validated.playerIds) {
    validated.playerIds.forEach((id) => targetIds.add(id))
  }

  if (validated.playerNames?.length) {
    const players = await prisma.player.findMany({
      where: {
        playerName: { in: validated.playerNames },
      },
      select: { id: true },
    })
    players.forEach((p) => targetIds.add(p.id))
  }

  if (validated.coordinates?.length) {
    const villages = await prisma.village.findMany({
      where: {
        OR: validated.coordinates.map(({ x, y }) => ({ x, y })),
      },
      select: { playerId: true },
    })
    villages.forEach((v) => targetIds.add(v.playerId))
  }

  targetIds.delete(inviter.id)

  if (!targetIds.size) {
    return errorResponse("No valid players found for inviting", 400)
  }

  const candidates = await prisma.player.findMany({
    where: {
      id: { in: Array.from(targetIds) },
    },
    select: { id: true, tribeId: true },
  })

  const expiresAt = new Date(Date.now() + TRIBE_INVITE_EXPIRY_HOURS * HOUR_IN_MS)

  let created = 0
  let skipped = 0

  for (const candidate of candidates) {
    if (candidate.tribeId === inviter.tribeId) {
      skipped++
      continue
    }

    const invite = await prisma.tribeInvite.upsert({
      where: {
        tribeId_playerId: {
          tribeId: validated.tribeId,
          playerId: candidate.id,
        },
      },
      update: {
        invitedById: inviter.id,
        message: validated.message,
        expiresAt,
        status: "PENDING",
      },
      create: {
        tribeId: validated.tribeId,
        playerId: candidate.id,
        invitedById: inviter.id,
        message: validated.message,
        expiresAt,
      },
      select: { id: true },
    })

    if (invite) {
      created++
    } else {
      skipped++
    }
  }

  return successResponse({ created, skipped })
}

async function handleRespondInvite(body: unknown) {
  const validated = tribeInviteResponseSchema.parse(body)

  const invite = await prisma.tribeInvite.findUnique({
    where: { id: validated.inviteId },
    include: {
      tribe: {
        select: {
          id: true,
          name: true,
          memberDefaultPermissions: true,
        },
      },
      player: {
        select: {
          id: true,
          tribeId: true,
          totalPoints: true,
          tribeRejoinAvailableAt: true,
        },
      },
    },
  })

  if (!invite) {
    return errorResponse("Invite not found", 404)
  }

  if (invite.player.id !== validated.playerId) {
    return errorResponse("Invite does not belong to this player", 403)
  }

  if (invite.status !== "PENDING") {
    return errorResponse("Invite already processed", 409)
  }

  if (validated.action === "DECLINE") {
    await prisma.tribeInvite.update({
      where: { id: invite.id },
      data: { status: "DECLINED" },
    })
    return successResponse({ message: "Invite declined" })
  }

  if (invite.player.tribeId) {
    return errorResponse("Player already in a tribe", 409)
  }

  if (invite.player.tribeRejoinAvailableAt && invite.player.tribeRejoinAvailableAt.getTime() > Date.now()) {
    return errorResponse("Player is on a tribe cooldown", 403)
  }

  await addMemberToTribe({
    tribeId: invite.tribe.id,
    player: invite.player,
    role: "MEMBER",
    customPermissions: null,
  })

  await prisma.tribeInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED" },
  })

  return successResponse({ message: `Joined ${invite.tribe.name}` })
}

async function handleApplication(body: unknown) {
  const validated = tribeApplicationSubmitSchema.parse(body)

  const tribe = await prisma.tribe.findUnique({
    where: { id: validated.tribeId },
    select: { id: true, name: true, joinPolicy: true },
  })

  if (!tribe) {
    return errorResponse("Tribe not found", 404)
  }

  if (tribe.joinPolicy !== "APPLICATION" && tribe.joinPolicy !== "INVITE_ONLY") {
    return errorResponse("This tribe does not accept applications", 400)
  }

  const player = await prisma.player.findUnique({
    where: { id: validated.playerId },
    select: {
      id: true,
      tribeId: true,
      tribeRejoinAvailableAt: true,
    },
  })

  if (!player) {
    return errorResponse("Player not found", 404)
  }

  if (player.tribeId) {
    return errorResponse("Player already in a tribe", 409)
  }

  if (player.tribeRejoinAvailableAt && player.tribeRejoinAvailableAt.getTime() > Date.now()) {
    return errorResponse("Player is on a tribe cooldown", 403)
  }

  await prisma.tribeApplication.upsert({
    where: {
      tribeId_playerId: {
        tribeId: tribe.id,
        playerId: player.id,
      },
    },
    update: {
      message: validated.message,
      status: "PENDING",
      reviewedById: null,
      reviewedAt: null,
      reviewResponse: null,
    },
    create: {
      tribeId: tribe.id,
      playerId: player.id,
      message: validated.message,
    },
  })

  return successResponse({ message: "Application submitted" })
}

async function handleReviewApplication(body: unknown) {
  const validated = tribeApplicationReviewSchema.parse(body)

  const application = await prisma.tribeApplication.findUnique({
    where: { id: validated.applicationId },
    include: {
      tribe: {
        select: {
          id: true,
          memberDefaultPermissions: true,
          name: true,
        },
      },
      player: {
        select: {
          id: true,
          tribeId: true,
          totalPoints: true,
          tribeRejoinAvailableAt: true,
        },
      },
    },
  })

  if (!application) {
    return errorResponse("Application not found", 404)
  }

  if (application.status !== "PENDING") {
    return errorResponse("Application already processed", 409)
  }

  const reviewer = await prisma.player.findUnique({
    where: { id: validated.reviewerId },
    select: {
      id: true,
      tribeId: true,
      tribeRole: true,
      tribePermissions: true,
      tribe: {
        select: { memberDefaultPermissions: true },
      },
    },
  })

  if (!reviewer || reviewer.tribeId !== application.tribe.id || !reviewer.tribe) {
    return errorResponse("Reviewer must belong to this tribe", 403)
  }

  const reviewerPermissions = resolvePermissions(reviewer, reviewer.tribe.memberDefaultPermissions)

  if (!reviewerPermissions.includes("VIEW_APPLICATIONS")) {
    return errorResponse("You do not have permission to review applications", 403)
  }

  if (validated.action === "REJECT") {
    await prisma.tribeApplication.update({
      where: { id: application.id },
      data: {
        status: "REJECTED",
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        reviewResponse: validated.responseMessage,
      },
    })

    return successResponse({ message: "Application rejected" })
  }

  if (!reviewerPermissions.includes("INVITE_MEMBER")) {
    return errorResponse("You do not have permission to accept applications", 403)
  }

  if (application.player.tribeId) {
    return errorResponse("Player already in a tribe", 409)
  }

  if (application.player.tribeRejoinAvailableAt && application.player.tribeRejoinAvailableAt.getTime() > Date.now()) {
    return errorResponse("Player is on a tribe cooldown", 403)
  }

  await addMemberToTribe({
    tribeId: application.tribe.id,
    player: application.player,
    role: "MEMBER",
    customPermissions: null,
  })

  await prisma.tribeApplication.update({
    where: { id: application.id },
    data: {
      status: "APPROVED",
      reviewedById: reviewer.id,
      reviewedAt: new Date(),
      reviewResponse: validated.responseMessage,
    },
  })

  return successResponse({ message: `Application approved for ${application.player.id}` })
}

async function handleLeave(body: any) {
  const { tribeId, playerId } = body ?? {}

  if (!tribeId || !playerId) {
    return errorResponse("Tribe ID and Player ID required", 400)
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      tribeId: true,
      tribeRole: true,
      totalPoints: true,
    },
  })

  if (!player || player.tribeId !== tribeId) {
    return errorResponse("Player not in this tribe", 400)
  }

  const tribe = await prisma.tribe.findUnique({
    where: { id: tribeId },
    select: { id: true, leaderId: true },
  })

  if (!tribe) {
    return errorResponse("Tribe not found", 404)
  }

  const isFounder = player.id === tribe.leaderId || player.tribeRole === "FOUNDER"

  const remainingMembers = await removeMemberFromTribe(player.id, tribeId, { applyCooldown: true })

  if (isFounder) {
    if (remainingMembers === 0) {
      await prisma.tribe.delete({ where: { id: tribeId } })
    } else {
      const successor = await selectSuccessor(tribeId)
      if (successor) {
        await prisma.tribe.update({
          where: { id: tribeId },
          data: { leaderId: successor.id },
        })
        if (successor.tribeRole !== "CO_FOUNDER" && successor.tribeRole !== "FOUNDER") {
          await prisma.player.update({
            where: { id: successor.id },
            data: { tribeRole: "CO_FOUNDER" },
          })
        }
      }
    }
  }

  return successResponse({ message: "Left tribe successfully" })
}

async function handleRemoveMember(body: unknown) {
  const validated = tribeMemberRemovalSchema.parse(body)

  const actor = await prisma.player.findUnique({
    where: { id: validated.actorId },
    select: {
      id: true,
      tribeId: true,
      tribeRole: true,
      tribePermissions: true,
      tribe: {
        select: {
          id: true,
          leaderId: true,
          memberDefaultPermissions: true,
        },
      },
    },
  })

  if (!actor || !actor.tribe || actor.tribeId !== validated.tribeId) {
    return errorResponse("Actor must belong to this tribe", 403)
  }

  const target = await prisma.player.findUnique({
    where: { id: validated.targetPlayerId },
    select: {
      id: true,
      tribeId: true,
      tribeRole: true,
    },
  })

  if (!target || target.tribeId !== validated.tribeId) {
    return errorResponse("Target player not in this tribe", 404)
  }

  if (target.id === actor.id) {
    return errorResponse("Use the leave action to exit a tribe", 400)
  }

  if (target.id === actor.tribe.leaderId || target.tribeRole === "FOUNDER") {
    return errorResponse("Founder cannot be removed", 403)
  }

  const actorPermissions = resolvePermissions(actor, actor.tribe.memberDefaultPermissions)

  if (!actorPermissions.includes("REMOVE_MEMBER")) {
    return errorResponse("You do not have permission to remove members", 403)
  }

  if (!canManageRole(actor.tribeRole, target.tribeRole)) {
    return errorResponse("You cannot remove this member rank", 403)
  }

  await removeMemberFromTribe(target.id, validated.tribeId, { applyCooldown: true })

  return successResponse({ message: "Member removed" })
}

async function handleRoleUpdate(body: unknown) {
  const validated = tribeRoleUpdateSchema.parse(body)

  const actor = await prisma.player.findUnique({
    where: { id: validated.actorId },
    select: {
      id: true,
      tribeId: true,
      tribeRole: true,
      tribePermissions: true,
      tribe: {
        select: {
          memberDefaultPermissions: true,
          leaderId: true,
        },
      },
    },
  })

  if (!actor || !actor.tribe || actor.tribeId !== validated.tribeId) {
    return errorResponse("Actor must belong to this tribe", 403)
  }

  const target = await prisma.player.findUnique({
    where: { id: validated.targetPlayerId },
    select: {
      id: true,
      tribeId: true,
      tribeRole: true,
    },
  })

  if (!target || target.tribeId !== validated.tribeId) {
    return errorResponse("Target player not found in tribe", 404)
  }

  if (target.id === actor.tribe.leaderId) {
    return errorResponse("Cannot modify founder role", 403)
  }

  const actorPermissions = resolvePermissions(actor, actor.tribe.memberDefaultPermissions)

  if (!actorPermissions.includes("MANAGE_PERMISSIONS")) {
    return errorResponse("You do not have permission to manage roles", 403)
  }

  if (!canManageRole(actor.tribeRole, target.tribeRole)) {
    return errorResponse("You cannot change this member's role", 403)
  }

  if (validated.role === "CO_FOUNDER" && actor.tribeRole !== "FOUNDER") {
    return errorResponse("Only the founder can appoint co-founders", 403)
  }

  const customPermissions = validated.customPermissions ? sanitizePermissions(validated.customPermissions) : null

  await prisma.player.update({
    where: { id: target.id },
    data: {
      tribeRole: validated.role,
      tribePermissions: customPermissions && customPermissions.length ? customPermissions : null,
    },
  })

  return successResponse({ message: "Member role updated" })
}

async function handleDefaultPermissions(body: unknown) {
  const validated = tribeDefaultPermissionSchema.parse(body)

  const actor = await prisma.player.findUnique({
    where: { id: validated.actorId },
    select: {
      id: true,
      tribeId: true,
      tribeRole: true,
      tribePermissions: true,
      tribe: {
        select: {
          id: true,
          memberDefaultPermissions: true,
        },
      },
    },
  })

  if (!actor || !actor.tribe || actor.tribeId !== validated.tribeId) {
    return errorResponse("Actor must belong to this tribe", 403)
  }

  const actorPermissions = resolvePermissions(actor, actor.tribe.memberDefaultPermissions)

  if (!actorPermissions.includes("MANAGE_PERMISSIONS")) {
    return errorResponse("You do not have permission to manage defaults", 403)
  }

  const memberDefaultPermissions = sanitizePermissions(validated.memberDefaultPermissions)

  await prisma.tribe.update({
    where: { id: validated.tribeId },
    data: {
      memberDefaultPermissions,
    },
  })

  return successResponse({ message: "Default permissions updated", memberDefaultPermissions })
}

function sanitizePermissions(permissions: TribePermissionValue[]): TribePermissionValue[] {
  const filtered = permissions.filter((perm): perm is TribePermissionValue => PERMISSION_SET.has(perm))
  return Array.from(new Set(filtered))
}

function normalizePermissionJson(value: Prisma.JsonValue | null | undefined): TribePermissionValue[] {
  if (!value) return []
  if (!Array.isArray(value)) return []
  const arr = value.filter((perm): perm is TribePermissionValue => typeof perm === "string" && PERMISSION_SET.has(perm as TribePermissionValue))
  return Array.from(new Set(arr))
}

function resolvePermissions(
  player: Pick<Player, "tribeRole" | "tribePermissions">,
  tribeDefaults: Prisma.JsonValue | null,
): TribePermissionValue[] {
  if (player.tribeRole === "FOUNDER") {
    return [...ALL_TRIBE_PERMISSIONS]
  }

  const explicit = normalizePermissionJson(player.tribePermissions)
  if (explicit.length) {
    return explicit
  }

  if (!player.tribeRole) {
    return []
  }

  return getRolePermissionDefaults(player.tribeRole, normalizePermissionJson(tribeDefaults))
}

function rolePriority(role?: TribeRole | null): number {
  switch (role) {
    case "FOUNDER":
      return 4
    case "CO_FOUNDER":
      return 3
    case "OFFICER":
      return 2
    case "MEMBER":
      return 1
    default:
      return 0
  }
}

function canManageRole(actorRole?: TribeRole | null, targetRole?: TribeRole | null): boolean {
  if (targetRole === "FOUNDER") {
    return false
  }
  return rolePriority(actorRole) > rolePriority(targetRole)
}

async function addMemberToTribe({
  tribeId,
  player,
  role,
  customPermissions,
}: {
  tribeId: string
  player: Pick<Player, "id" | "totalPoints">
  role: TribeRole
  customPermissions: TribePermissionValue[] | null
}) {
  await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: player.id },
      data: {
        tribeId,
        tribeRole: role,
        tribePermissions: customPermissions && customPermissions.length ? customPermissions : null,
        tribeJoinedAt: new Date(),
        tribeRejoinAvailableAt: null,
      },
    })

    await tx.tribe.update({
      where: { id: tribeId },
      data: {
        memberCount: { increment: 1 },
        totalPoints: { increment: player.totalPoints },
      },
    })
  })
}

async function removeMemberFromTribe(playerId: string, tribeId: string, options?: { applyCooldown?: boolean }) {
  const cooldownDate =
    options?.applyCooldown === false ? null : new Date(Date.now() + TRIBE_LEAVE_COOLDOWN_HOURS * HOUR_IN_MS)

  const updated = await prisma.$transaction(async (tx) => {
    const leaving = await tx.player.findUnique({
      where: { id: playerId },
      select: { id: true, tribeId: true, totalPoints: true },
    })

    if (!leaving || leaving.tribeId !== tribeId) {
      throw new Error("Player not in tribe")
    }

    await tx.player.update({
      where: { id: playerId },
      data: {
        tribeId: null,
        tribeRole: null,
        tribePermissions: null,
        tribeJoinedAt: null,
        tribeRejoinAvailableAt: cooldownDate,
      },
    })

    const tribe = await tx.tribe.update({
      where: { id: tribeId },
      data: {
        memberCount: { decrement: 1 },
        totalPoints: { decrement: leaving.totalPoints },
      },
      select: { memberCount: true },
    })

    return tribe.memberCount
  })

  return updated
}

async function selectSuccessor(tribeId: string) {
  const candidates = await prisma.player.findMany({
    where: { tribeId },
    select: {
      id: true,
      tribeRole: true,
    },
  })

  let best: { id: string; tribeRole: TribeRole | null } | null = null
  for (const candidate of candidates) {
    if (!best || rolePriority(candidate.tribeRole) > rolePriority(best.tribeRole)) {
      best = candidate
    }
  }

  return best
}
