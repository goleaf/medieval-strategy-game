import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { lobbyUserId } = body

    if (!lobbyUserId) {
      return NextResponse.json({ error: "Missing lobbyUserId" }, { status: 400 })
    }

    const dual = await SitterDualService.acceptDual(session.user.id, lobbyUserId)

    return NextResponse.json({
      success: true,
      data: {
        id: dual.id,
        lobbyUserId: dual.lobbyUserId,
        lobbyUsername: dual.lobbyUsername,
        acceptedAt: dual.acceptedAt
      }
    })
  } catch (error) {
    console.error("Error accepting dual:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
