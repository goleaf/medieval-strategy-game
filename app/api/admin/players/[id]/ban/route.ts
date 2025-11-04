import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { reason, duration } = await req.json()

    const player = await prisma.player.findUnique({
      where: { id: params.id },
    })

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    // Update player with ban info
    await prisma.player.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        banReason: reason,
      },
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id", // Get from auth context
        action: "BAN_PLAYER",
        details: `Banned for: ${reason}. Duration: ${duration}`,
        targetType: "PLAYER",
        targetId: params.id,
      },
    })

    return NextResponse.json({ success: true, message: "Player banned successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Ban player error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
