import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { verify } from "jsonwebtoken"
import { ActivityTracker } from "@/lib/utils/activity-tracker"

export async function authenticateRequest(req: NextRequest): Promise<{ userId: string; playerId?: string } | null> {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.slice(7)
    const decoded = verify(token, process.env.JWT_SECRET || "secret") as any

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { players: true },
    })

    if (!user) return null

    const playerId = user.players[0]?.id

    // Record activity for authenticated requests
    if (playerId) {
      ActivityTracker.recordPlayerActivity(playerId).catch(console.error)
    }

    return {
      userId: user.id,
      playerId,
    }
  } catch (error) {
    return null
  }
}
