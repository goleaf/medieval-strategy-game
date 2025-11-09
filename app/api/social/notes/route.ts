import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { playerContactNoteSchema } from "@/lib/utils/validation"
import {
  errorResponse,
  handleValidationError,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/utils/api-response"

const targetSelect = {
  id: true,
  playerName: true,
  rank: true,
  tribe: { select: { tag: true } },
}

function mapNote(note: Awaited<ReturnType<typeof fetchNotes>>[number]) {
  return {
    id: note.id,
    ownerId: note.ownerId,
    target: note.target,
    stance: note.stance,
    note: note.note,
    tags: Array.isArray(note.tags) ? note.tags : [],
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

async function fetchNotes(ownerId: string, targetId?: string | null) {
  return prisma.playerContactNote.findMany({
    where: {
      ownerId,
      ...(targetId ? { targetId } : {}),
    },
    include: {
      target: { select: targetSelect },
    },
    orderBy: { updatedAt: "desc" },
  })
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }
    const params = req.nextUrl.searchParams
    const ownerId = params.get("ownerId") ?? auth.playerId
    if (ownerId !== auth.playerId) {
      return unauthorizedResponse()
    }
    const targetId = params.get("targetId")
    const notes = await fetchNotes(ownerId, targetId)
    return successResponse({
      notes: notes.map(mapNote),
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
    const payload = playerContactNoteSchema.parse(await req.json())
    if (payload.ownerId !== auth.playerId) {
      return unauthorizedResponse()
    }
    if (payload.ownerId === payload.targetId) {
      return errorResponse("Cannot log a note about yourself.", 400)
    }

    const targetExists = await prisma.player.findUnique({
      where: { id: payload.targetId },
      select: { id: true },
    })
    if (!targetExists) {
      return errorResponse("Target player not found", 404)
    }

    const nextTags = payload.tags ? Array.from(new Set(payload.tags.map((tag) => tag.trim()).filter(Boolean))) : []

    const upserted = await prisma.playerContactNote.upsert({
      where: {
        ownerId_targetId: {
          ownerId: payload.ownerId,
          targetId: payload.targetId,
        },
      },
      update: {
        note: payload.note,
        stance: payload.stance ?? undefined,
        tags: nextTags,
      },
      create: {
        ownerId: payload.ownerId,
        targetId: payload.targetId,
        note: payload.note,
        stance: payload.stance ?? "NEUTRAL",
        tags: nextTags,
      },
      include: {
        target: { select: targetSelect },
      },
    })

    return successResponse({ note: mapNote(upserted) })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }
    const params = req.nextUrl.searchParams
    const ownerId = params.get("ownerId") ?? auth.playerId
    if (ownerId !== auth.playerId) {
      return unauthorizedResponse()
    }

    const noteId = params.get("noteId")
    const targetId = params.get("targetId")

    if (!noteId && !targetId) {
      return errorResponse("Provide noteId or targetId to delete a note.", 400)
    }

    if (noteId) {
      const existing = await prisma.playerContactNote.findUnique({
        where: { id: noteId },
        select: { id: true, ownerId: true },
      })
      if (!existing || existing.ownerId !== ownerId) {
        return errorResponse("Note not found.", 404)
      }
      await prisma.playerContactNote.delete({ where: { id: noteId } })
    } else if (targetId) {
      await prisma.playerContactNote.deleteMany({
        where: {
          ownerId,
          targetId,
        },
      })
    }

    return successResponse({ deleted: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
