import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find all duals where the current user is the dual controller
    const duals = await prisma.dual.findMany({
      where: {
        lobbyUserId: session.user.id,
        isActive: true,
        acceptedAt: { not: null }
      },
      include: {
        player: {
          select: {
            id: true,
            playerName: true,
            gameWorldId: true,
            lastActiveAt: true
          },
          include: {
            gameWorld: {
              select: { worldName: true }
            }
          }
        }
      }
    })

    const accounts = duals.map(dual => ({
      id: dual.player.id,
      playerName: dual.player.playerName,
      worldName: dual.player.gameWorld?.worldName || 'Unknown World',
      gameWorldId: dual.player.gameWorldId,
      lastActiveAt: dual.player.lastActiveAt
    }))

    return NextResponse.json({
      success: true,
      data: { accounts }
    })
  } catch (error) {
    console.error("Error fetching dual accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

