import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "./auth/middleware"
import { authenticateAdmin } from "./admin/middleware"

export { authenticateRequest, authenticateAdmin }

// Re-export for backward compatibility
export async function authenticatePlayer(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth || !auth.playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if player exists and is not deleted
    const { prisma } = await import("@/lib/db")
    const player = await prisma.player.findUnique({
      where: { id: auth.playerId },
      include: { hero: true }
    })

    if (!player || player.isDeleted) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return { userId: auth.userId, playerId: auth.playerId, player }
  } catch (error) {
    return NextResponse.json({ error: "Authentication error" }, { status: 500 })
  }
}
