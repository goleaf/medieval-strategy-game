import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { trackAction, trackError } from "@/app/api/admin/stats/route"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const player = await prisma.player.findUnique({
      where: { id: params.id },
    })

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    if (!player.isDeleted) {
      return NextResponse.json({ error: "Player is not banned" }, { status: 400 })
    }

    // Unban player
    await prisma.player.update({
      where: { id: params.id },
      data: {
        isDeleted: false,
        deletedAt: null,
        banReason: null,
      },
    })

    // Track action
    trackAction()

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id", // Get from auth context
        action: "UNBAN_PLAYER",
        details: `Unbanned player: ${player.playerName}`,
        targetType: "PLAYER",
        targetId: params.id,
      },
    })

    return NextResponse.json({ success: true, message: "Player unbanned successfully" }, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Unban player failed", errorMessage)
    console.error("[v0] Unban player error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

