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
    const { targetPlayerId, durationHours: requestedDuration } = body

    if (!targetPlayerId) {
      return NextResponse.json({ error: "Target player ID required" }, { status: 400 })
    }

    // Resolve current user's player in the same world as the target
    const target = await prisma.player.findUnique({
      where: { id: targetPlayerId },
      select: { id: true, playerName: true, gameWorldId: true }
    })

    if (!target) {
      return NextResponse.json({ error: "Target player not found" }, { status: 404 })
    }

    const myPlayer = await prisma.player.findFirst({
      where: { userId: session.user.id, gameWorldId: target.gameWorldId }
    })

    if (!myPlayer) {
      return NextResponse.json({ error: "You do not have a player in this world" }, { status: 403 })
    }

    // Check if the current user's player can access the target as a sitter
    const canAccess = await SitterDualService.canAccessAsSitter(myPlayer.id, targetPlayerId)

    if (!canAccess) {
      return NextResponse.json({
        error: "You do not have permission to access this account as a sitter"
      }, { status: 403 })
    }

    // Create a sitter session record (default 24h)
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null
    const ua = req.headers.get("user-agent") || null
    const durationHours = Math.max(1, Math.min(72, Number(requestedDuration) || 24))
    await SitterDualService.beginSitterSession({
      ownerId: targetPlayerId,
      sitterId: myPlayer.id,
      durationHours,
      ipAddress: ip,
      userAgent: ua,
    })

    // Create a sitter session token
    const sitterToken = sign(
      {
        userId: session.user.id,
        playerId: targetPlayerId,
        sitterFor: targetPlayerId,
        isSitter: true
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: `${durationHours}h` }
    )

    return NextResponse.json({
      success: true,
      data: {
        token: sitterToken,
        targetPlayer: {
          id: target.id,
          playerName: target.playerName,
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
