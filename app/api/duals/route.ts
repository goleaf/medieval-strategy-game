import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { errorResponse, notFoundResponse, serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()

    const duals = await prisma.dual.findMany({
      where: { playerId: auth.playerId, isActive: true },
      orderBy: { invitedAt: "desc" }
    })

    const data = {
      duals: duals.map(d => ({
        id: d.id,
        lobbyUserId: d.lobbyUserId,
        lobbyUsername: d.lobbyUsername,
        invitedAt: d.invitedAt,
        acceptedAt: d.acceptedAt,
        isAccepted: Boolean(d.acceptedAt),
      }))
    }

    return successResponse(data)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()

    const body = await req.json()
    const { lobbyUserId, lobbyUsername } = body || {}
    if (!lobbyUserId || !lobbyUsername) return errorResponse("Missing lobbyUserId or lobbyUsername", 400)

    const dual = await SitterDualService.inviteDual(auth.playerId, lobbyUserId, lobbyUsername)
    return successResponse({ id: dual.id })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

