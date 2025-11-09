import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) return unauthorizedResponse()

    const duals = await prisma.dual.findMany({
      where: { lobbyUserId: auth.userId, isActive: true, acceptedAt: { not: null } },
      include: { player: true },
      orderBy: { invitedAt: "desc" }
    })

    const accounts = duals.map(d => ({
      id: d.player.id,
      playerName: d.player.playerName,
      lastActiveAt: d.player.lastActiveAt,
    }))

    return successResponse({ accounts })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

