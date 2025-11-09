import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { verifyAuth } from "@/lib/auth"
import { ActivityTracker } from "@/lib/utils/activity-tracker"

export async function authenticateRequest(req: NextRequest): Promise<{
  userId: string;
  playerId?: string;
  isSitter?: boolean;
  sitterFor?: string;
  isDual?: boolean;
  dualFor?: string;
  sessionId?: string;
} | null> {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.slice(7)
    const decoded = await verifyAuth(token)
    if (!decoded) return null

    const sessionId = typeof decoded === "object" && "session" in decoded ? decoded.session?.id : (decoded as any).sessionId
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { players: true },
    })

    if (!user) return null

    let playerId: string | undefined
    let isSitter = false
    let sitterFor: string | undefined
    let isDual = false
    let dualFor: string | undefined

    if ((decoded as any).isSitter && (decoded as any).sitterFor) {
      // This is a sitter session
      isSitter = true
      sitterFor = (decoded as any).sitterFor
      playerId = (decoded as any).playerId // The target player being sat
    } else if ((decoded as any).isDual && (decoded as any).dualFor) {
      // This is a dual session
      isDual = true
      dualFor = (decoded as any).dualFor
      playerId = (decoded as any).playerId // The target player being dual-controlled
    } else {
      // Regular user session
      playerId = user.players[0]?.id
    }

    // Record activity for authenticated requests
    if (playerId && !isSitter && !isDual) {
      // Only record owner activity for non-sitter/dual sessions
      ActivityTracker.recordPlayerActivity(playerId).catch(console.error)
    }

    return {
      userId: user.id,
      playerId,
      isSitter,
      sitterFor,
      isDual,
      dualFor,
      sessionId,
    }
  } catch (error) {
    return null
  }
}
