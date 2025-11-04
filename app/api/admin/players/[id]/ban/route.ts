import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return new Response(JSON.stringify({
      success: false,
      error: "Admin authentication required"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    })
  }

  const { id } = params
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
        adminId: adminAuth.adminId,
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
