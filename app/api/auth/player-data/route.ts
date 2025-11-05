import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../middleware"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth || !auth.playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get player data with related information
    const player = await prisma.player.findUnique({
      where: { id: auth.playerId },
      include: {
        hero: {
          select: { adventuresCompleted: true }
        },
        Village: {
          select: { id: true }
        },
        gameWorld: {
          select: {
            isRegistrationOpen: true,
            isActive: true
          }
        }
      }
    })

    // Get player's tribe information
    const tribe = player?.gameTribe || null

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        player: {
          ...player,
          tribe
        },
        gameWorld: player.gameWorld
      }
    })
  } catch (error) {
    console.error("Failed to fetch player data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
