import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { tribeCreateSchema, tribeJoinSchema, tribeInviteSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError } from "@/lib/utils/api-response"
import type { JoinPolicy } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action || "create"

    if (action === "create") {
      const validated = tribeCreateSchema.parse(body)

      // Check if player already in tribe
      const player = await prisma.player.findUnique({
        where: { id: validated.leaderId },
        include: { tribe: true },
      })

      if (player?.tribe) {
        return errorResponse("Player already in a tribe", 409)
      }

      const tribe = await prisma.tribe.create({
        data: {
          name: validated.name,
          tag: validated.tag.toUpperCase(),
          leaderId: validated.leaderId,
          description: validated.description,
          joinPolicy: validated.joinPolicy || "INVITE_ONLY",
        },
      })

      // Add leader as member
      await prisma.player.update({
        where: { id: validated.leaderId },
        data: { tribeId: tribe.id },
      })

      return successResponse(tribe, 201)
    } else if (action === "join") {
      const validated = tribeJoinSchema.parse(body)

      const tribe = await prisma.tribe.findUnique({
        where: { id: validated.tribeId },
      })

      if (!tribe) {
        return errorResponse("Tribe not found", 404)
      }

      const player = await prisma.player.findUnique({
        where: { id: validated.playerId },
      })

      if (!player) {
        return errorResponse("Player not found", 404)
      }

      if (player.tribeId) {
        return errorResponse("Player already in a tribe", 409)
      }

      if (tribe.joinPolicy === "INVITE_ONLY") {
        // Check for invite
        const invite = await prisma.tribeInvite.findFirst({
          where: {
            tribeId: validated.tribeId,
            playerId: validated.playerId,
            status: "PENDING",
          },
        })

        if (!invite) {
          return errorResponse("Invite required to join this tribe", 403)
        }

        // Accept invite
        await prisma.tribeInvite.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED" },
        })
      }

      // Add player to tribe
      await prisma.player.update({
        where: { id: validated.playerId },
        data: { tribeId: validated.tribeId },
      })

      await prisma.tribe.update({
        where: { id: validated.tribeId },
        data: { memberCount: { increment: 1 } },
      })

      return successResponse({ message: "Joined tribe successfully" })
    } else if (action === "invite") {
      const validated = tribeInviteSchema.parse(body)

      const tribe = await prisma.tribe.findUnique({
        where: { id: validated.tribeId },
        include: { leader: true },
      })

      if (!tribe) {
        return errorResponse("Tribe not found", 404)
      }

      // Check if player is leader
      // TODO: Get from auth context
      // if (tribe.leaderId !== currentPlayerId) {
      //   return errorResponse("Only tribe leader can invite", 403)
      // }

      const invite = await prisma.tribeInvite.create({
        data: {
          tribeId: validated.tribeId,
          playerId: validated.playerId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      })

      return successResponse(invite, 201)
    } else if (action === "leave") {
      const { tribeId, playerId } = body

      if (!tribeId || !playerId) {
        return errorResponse("Tribe ID and Player ID required", 400)
      }

      const player = await prisma.player.findUnique({
        where: { id: playerId },
      })

      if (!player || player.tribeId !== tribeId) {
        return errorResponse("Player not in this tribe", 400)
      }

      // If leader, delete tribe or transfer leadership
      const tribe = await prisma.tribe.findUnique({
        where: { id: tribeId },
      })

      if (tribe?.leaderId === playerId) {
        // Transfer to first member or delete
        const members = await prisma.player.findMany({
          where: { tribeId },
          take: 2,
        })

        if (members.length > 1) {
          const newLeader = members.find((m) => m.id !== playerId)
          if (newLeader) {
            await prisma.tribe.update({
              where: { id: tribeId },
              data: { leaderId: newLeader.id },
            })
          }
        } else {
          // Delete tribe if no other members
          await prisma.tribe.delete({ where: { id: tribeId } })
        }
      }

      await prisma.player.update({
        where: { id: playerId },
        data: { tribeId: null },
      })

      await prisma.tribe.update({
        where: { id: tribeId },
        data: { memberCount: { decrement: 1 } },
      })

      return successResponse({ message: "Left tribe successfully" })
    }

    return errorResponse("Invalid action", 400)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const tribeId = req.nextUrl.searchParams.get("tribeId")

    if (tribeId) {
      const tribe = await prisma.tribe.findUnique({
        where: { id: tribeId },
        include: {
          leader: { select: { playerName: true } },
          members: { select: { playerName: true, totalPoints: true } },
          _count: { select: { members: true } },
        },
      })

      if (!tribe) {
        return errorResponse("Tribe not found", 404)
      }

      return successResponse(tribe)
    }

    const tribes = await prisma.tribe.findMany({
      include: {
        leader: { select: { playerName: true } },
        _count: { select: { members: true } },
      },
      orderBy: { totalPoints: "desc" },
      take: 100,
    })

    return successResponse(tribes)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
