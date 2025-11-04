import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return NextResponse.json({ error: "Player ID required" }, { status: 400 })
    }

    const messages = await prisma.message.findMany({
      where: { village: { player: { id: playerId } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(messages, { status: 200 })
  } catch (error) {
    console.error("[v0] Get messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
