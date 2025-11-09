import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      where: { isDeleted: true, banReason: { not: null } },
      select: { playerName: true, banReason: true, deletedAt: true },
      orderBy: { deletedAt: "desc" },
      take: 100,
    })
    return NextResponse.json({ success: true, data: players }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch ban list" }, { status: 500 })
  }
}
