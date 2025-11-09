import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { playerEndorsementSchema } from "@/lib/utils/validation"
import {
  errorResponse,
  handleValidationError,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/utils/api-response"

const endorserSelect = {
  id: true,
  playerName: true,
  rank: true,
  tribe: { select: { tag: true } },
}

export async function GET(req: NextRequest) {
  try {
    const viewer = await authenticateRequest(req).catch(() => null)
    const params = req.nextUrl.searchParams
    const targetId = params.get("targetId")
    if (!targetId) {
      return errorResponse("targetId is required", 400)
    }

    const endorsements = await prisma.playerEndorsement.findMany({
      where: {
        targetId,
        status: "PUBLISHED",
      },
      include: {
        endorser: { select: endorserSelect },
      },
      orderBy: { updatedAt: "desc" },
    })

    const viewerEndorsement =
      viewer?.playerId
        ? await prisma.playerEndorsement.findFirst({
            where: { targetId, endorserId: viewer.playerId },
          })
        : null

    return successResponse({
      endorsements: endorsements.map((entry) => ({
        id: entry.id,
        message: entry.message,
        strength: entry.strength,
        createdAt: entry.createdAt,
        endorser: entry.endorser,
      })),
      viewerEndorsement,
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
    const payload = playerEndorsementSchema.parse(await req.json())
    if (payload.actorId !== auth.playerId) {
      return unauthorizedResponse()
    }

    if (payload.actorId === payload.targetId) {
      return errorResponse("Cannot endorse yourself.", 400)
    }

    const targetExists = await prisma.player.findUnique({
      where: { id: payload.targetId },
      select: { id: true },
    })
    if (!targetExists) {
      return errorResponse("Target player not found.", 404)
    }

    if (payload.action === "ENDORSE") {
      const endorsement = await prisma.playerEndorsement.upsert({
        where: {
          endorserId_targetId: {
            endorserId: payload.actorId,
            targetId: payload.targetId,
          },
        },
        update: {
          status: "PUBLISHED",
          message: payload.message ?? null,
          strength: payload.strength ?? 1,
        },
        create: {
          endorserId: payload.actorId,
          targetId: payload.targetId,
          status: "PUBLISHED",
          message: payload.message ?? null,
          strength: payload.strength ?? 1,
        },
      })
      return successResponse({ endorsement })
    }

    await prisma.playerEndorsement.updateMany({
      where: {
        endorserId: payload.actorId,
        targetId: payload.targetId,
      },
      data: {
        status: "REVOKED",
      },
    })
    return successResponse({ endorsement: null })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
