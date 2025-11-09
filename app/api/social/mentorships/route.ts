import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { playerMentorshipActionSchema } from "@/lib/utils/validation"
import {
  errorResponse,
  handleValidationError,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/utils/api-response"

const participantSelect = {
  id: true,
  playerName: true,
  rank: true,
}

function mapMentorship(entry: Awaited<ReturnType<typeof fetchMentorships>>[number]) {
  return {
    id: entry.id,
    status: entry.status,
    mentor: entry.mentor,
    mentee: entry.mentee,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt,
  }
}

async function fetchMentorships(playerId: string) {
  return prisma.playerMentorship.findMany({
    where: {
      OR: [{ mentorId: playerId }, { menteeId: playerId }],
    },
    include: {
      mentor: { select: participantSelect },
      mentee: { select: participantSelect },
    },
    orderBy: { createdAt: "desc" },
  })
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

    const mentorships = await fetchMentorships(playerId)
    return successResponse({
      mentorships: mentorships.map(mapMentorship),
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

    const payload = playerMentorshipActionSchema.parse(await req.json())
    if (payload.actorId !== auth.playerId) {
      return unauthorizedResponse()
    }

    if (payload.mentorId === payload.menteeId) {
      return errorResponse("Mentor and mentee must be different players.", 400)
    }

    const now = new Date()
    const notePayload = payload.notes
      ? { lastNote: payload.notes, updatedAt: now.toISOString(), authorId: payload.actorId }
      : undefined

    const [mentor, mentee, existing] = await Promise.all([
      prisma.player.findUnique({
        where: { id: payload.mentorId },
        select: { id: true, allowMentorship: true },
      }),
      prisma.player.findUnique({
        where: { id: payload.menteeId },
        select: { id: true },
      }),
      prisma.playerMentorship.findFirst({
        where: {
          mentorId: payload.mentorId,
          menteeId: payload.menteeId,
          status: { in: ["PENDING", "ACTIVE"] },
        },
        include: {
          mentor: { select: participantSelect },
          mentee: { select: participantSelect },
        },
      }),
    ])

    if (!mentor || !mentee) {
      return errorResponse("Mentor or mentee not found.", 404)
    }

    switch (payload.action) {
      case "REQUEST": {
        if (payload.actorId !== payload.menteeId) {
          return errorResponse("Only mentees can request mentorship.", 403)
        }
        if (!mentor.allowMentorship) {
          return errorResponse("This mentor is not accepting mentorships.", 403)
        }
        if (existing) {
          return errorResponse("There is already an active or pending mentorship with this player.", 409)
        }
        const created = await prisma.playerMentorship.create({
          data: {
            mentorId: payload.mentorId,
            menteeId: payload.menteeId,
            status: "PENDING",
            notes: notePayload,
          },
          include: {
            mentor: { select: participantSelect },
            mentee: { select: participantSelect },
          },
        })
        return successResponse({ mentorship: mapMentorship(created) })
      }
      case "ACCEPT": {
        if (payload.actorId !== payload.mentorId) {
          return errorResponse("Only the mentor can accept.", 403)
        }
        if (!existing || existing.status !== "PENDING") {
          return errorResponse("No pending mentorship to accept.", 404)
        }
        const updated = await prisma.playerMentorship.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            startedAt: now,
            notes: notePayload ?? existing.notes,
          },
          include: {
            mentor: { select: participantSelect },
            mentee: { select: participantSelect },
          },
        })
        return successResponse({ mentorship: mapMentorship(updated) })
      }
      case "DECLINE": {
        if (payload.actorId !== payload.mentorId) {
          return errorResponse("Only the mentor can decline.", 403)
        }
        if (!existing || existing.status !== "PENDING") {
          return errorResponse("No pending mentorship to decline.", 404)
        }
        const updated = await prisma.playerMentorship.update({
          where: { id: existing.id },
          data: {
            status: "DECLINED",
            notes: notePayload ?? existing.notes,
          },
          include: {
            mentor: { select: participantSelect },
            mentee: { select: participantSelect },
          },
        })
        return successResponse({ mentorship: mapMentorship(updated) })
      }
      case "COMPLETE": {
        if (existing?.status !== "ACTIVE") {
          return errorResponse("No active mentorship to complete.", 404)
        }
        if (![existing.mentorId, existing.menteeId].includes(payload.actorId)) {
          return unauthorizedResponse()
        }
        const updated = await prisma.playerMentorship.update({
          where: { id: existing.id },
          data: {
            status: "COMPLETED",
            completedAt: now,
            notes: notePayload ?? existing.notes,
          },
          include: {
            mentor: { select: participantSelect },
            mentee: { select: participantSelect },
          },
        })
        return successResponse({ mentorship: mapMentorship(updated) })
      }
      case "CANCEL": {
        if (!existing) {
          return errorResponse("No mentorship to cancel.", 404)
        }
        if (![existing.mentorId, existing.menteeId].includes(payload.actorId)) {
          return unauthorizedResponse()
        }
        const updated = await prisma.playerMentorship.update({
          where: { id: existing.id },
          data: {
            status: "CANCELLED",
            notes: notePayload ?? existing.notes,
          },
          include: {
            mentor: { select: participantSelect },
            mentee: { select: participantSelect },
          },
        })
        return successResponse({ mentorship: mapMentorship(updated) })
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
