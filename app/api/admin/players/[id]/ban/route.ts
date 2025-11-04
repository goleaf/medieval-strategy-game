import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuth } from "../../middleware"
import { trackAction, trackError } from "@/app/api/admin/stats/route"

export const POST = requireAdminAuth(async (req: NextRequest, context) => {
  const { id } = context.params as { id: string }
  try {
    const { reason, duration } = await req.json()

    const player = await prisma.player.findUnique({
      where: { id },
    })

    if (!player) {
      return NextResponse.json({
        success: false,
        error: "Player not found"
      }, { status: 404 })
    }

    // Update player with ban info
    await prisma.player.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        banReason: reason,
      },
    })

    // Track action
    trackAction()

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: context.admin.adminId,
        action: "BAN_PLAYER",
        details: `Banned player ${player.playerName} for: ${reason}`,
        targetType: "PLAYER",
        targetId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Player banned successfully"
    }, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Ban player failed", errorMessage)
    console.error("[v0] Ban player error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to ban player"
    }, { status: 500 })
  }
}
