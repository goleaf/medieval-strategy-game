import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { verify } from "jsonwebtoken"
import { ActivityTracker } from "@/lib/utils/activity-tracker"

export async function authenticateRequest(req: NextRequest): Promise<{
  userId: string;
  playerId?: string;
  isSitter?: boolean;
  sitterFor?: string;
} | null> {
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

    let playerId: string | undefined
    let isSitter = false
    let sitterFor: string | undefined

    if (decoded.isSitter && decoded.sitterFor) {
      // This is a sitter session
      isSitter = true
      sitterFor = decoded.sitterFor
      playerId = decoded.playerId // The target player being sat
    } else {
      // Regular user session
      playerId = user.players[0]?.id
    }

    // Record activity for authenticated requests
    if (playerId && !isSitter) {
      // Only record owner activity for non-sitter sessions
      ActivityTracker.recordPlayerActivity(playerId).catch(console.error)
    }

    return {
      userId: user.id,
      playerId,
      isSitter,
      sitterFor,
    }
  } catch (error) {
    return null
  }
}
