import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
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

    // Create dual session
    const sessionData = await SitterDualService.createDualSession(session.user.id, targetPlayerId)

    return NextResponse.json({
      success: true,
      data: sessionData
    })
  } catch (error) {
    console.error("Dual login error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}

