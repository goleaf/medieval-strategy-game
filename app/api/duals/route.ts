import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current player's duals
    const duals = await prisma.dual.findMany({
      where: {
        playerId: session.user.id,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        duals: duals.map(d => ({
          id: d.id,
          lobbyUserId: d.lobbyUserId,
          lobbyUsername: d.lobbyUsername,
          invitedAt: d.invitedAt,
          acceptedAt: d.acceptedAt,
          isAccepted: !!d.acceptedAt
        }))
      }
    })
  } catch (error) {
    console.error("Error fetching duals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { lobbyUserId, lobbyUsername } = body

    if (!lobbyUserId || !lobbyUsername) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const dual = await SitterDualService.inviteDual(session.user.id, lobbyUserId, lobbyUsername)

    return NextResponse.json({
      success: true,
      data: {
        id: dual.id,
        lobbyUserId: dual.lobbyUserId,
        lobbyUsername: dual.lobbyUsername,
        invitedAt: dual.invitedAt
      }
    })
  } catch (error) {
    console.error("Error inviting dual:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
