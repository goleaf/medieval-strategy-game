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
    const { sitterId } = body

    if (!sitterId) {
      return NextResponse.json({ error: "Missing sitterId" }, { status: 400 })
    }

    await SitterDualService.removeSitter(session.user.id, sitterId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing sitter:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
