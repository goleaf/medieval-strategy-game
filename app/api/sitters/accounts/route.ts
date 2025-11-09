import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) return unauthorizedResponse()

    // Find all player avatars for this user
    const myPlayers = await prisma.player.findMany({
      where: { userId: auth.userId },
      select: { id: true }
    })

    const myPlayerIds = myPlayers.map(p => p.id)
    if (myPlayerIds.length === 0) return successResponse({ accounts: [] })

    // Find owners for whom I am an active sitter
    const sitterLinks = await prisma.sitter.findMany({
      where: { sitterId: { in: myPlayerIds }, isActive: true },
      include: {
        owner: true,
      }
    })

    const accounts = sitterLinks
      .filter(link => (link.owner.inactivityAllowanceDays ?? 0) > 0)
      .map(link => ({
        id: link.owner.id,
        playerName: link.owner.playerName,
        inactivityAllowance: link.owner.inactivityAllowanceDays,
        lastActiveAt: link.owner.lastActiveAt,
      }))

    return successResponse({ accounts })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

