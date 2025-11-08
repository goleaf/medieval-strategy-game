import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { trackAction, trackError } from "@/lib/admin-utils"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { newName } = await req.json()

    if (!newName || typeof newName !== "string" || newName.trim().length === 0) {
      return NextResponse.json({ error: "Invalid player name" }, { status: 400 })
    }

    if (newName.length > 20) {
      return NextResponse.json({ error: "Player name too long (max 20 characters)" }, { status: 400 })
    }

    const player = await prisma.player.findUnique({
      where: { id: params.id },
    })

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    // Check if name is already taken
    const existingPlayer = await prisma.player.findUnique({
      where: { playerName: newName.trim() },
    })

    if (existingPlayer && existingPlayer.id !== params.id) {
      return NextResponse.json({ error: "Player name already taken" }, { status: 400 })
    }

    const oldName = player.playerName

    // Rename player
    await prisma.player.update({
      where: { id: params.id },
      data: {
        playerName: newName.trim(),
      },
    })

    // Track action
    trackAction()

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id", // Get from auth context
        action: "RENAME_PLAYER",
        details: `Renamed player from "${oldName}" to "${newName.trim()}"`,
        targetType: "PLAYER",
        targetId: params.id,
      },
    })

    return NextResponse.json(
      { success: true, message: `Player renamed from "${oldName}" to "${newName.trim()}"` },
      { status: 200 },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Rename player failed", errorMessage)
    console.error("Rename player error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

