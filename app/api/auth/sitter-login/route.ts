import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { sign } from "jsonwebtoken"
import { prisma } from "@/lib/db"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { targetPlayerId } = body

    if (!targetPlayerId) {
      return NextResponse.json({ error: "Target player ID required" }, { status: 400 })
    }

    // Check if the current user can access the target player as a sitter
    const canAccess = await SitterDualService.canAccessAsSitter(session.user.id, targetPlayerId)

    if (!canAccess) {
      return NextResponse.json({
        error: "You do not have permission to access this account as a sitter"
      }, { status: 403 })
    }

    // Get the target player information
    const targetPlayer = await prisma.player.findUnique({
      where: { id: targetPlayerId },
      include: {
        user: true,
        villages: true
      }
    })

    if (!targetPlayer) {
      return NextResponse.json({ error: "Target player not found" }, { status: 404 })
    }

    // Create a sitter session token
    const sitterToken = sign(
      {
        userId: session.user.id,
        playerId: targetPlayerId,
        sitterFor: targetPlayerId,
        isSitter: true
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" }
    )

    return NextResponse.json({
      success: true,
      data: {
        token: sitterToken,
        targetPlayer: {
          id: targetPlayer.id,
          playerName: targetPlayer.playerName,
          villages: targetPlayer.villages.length
        }
      }
    })
  } catch (error) {
    console.error("Sitter login error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}

