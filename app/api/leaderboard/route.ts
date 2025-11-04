import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const leaderboard = await prisma.player.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        playerName: true,
        totalPoints: true,
        rank: true,
        tribe: { select: { tag: true } },
      },
      orderBy: { rank: "asc" },
      take: 100,
    })

    return NextResponse.json(leaderboard, { status: 200 })
  } catch (error) {
    console.error("[v0] Get leaderboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
