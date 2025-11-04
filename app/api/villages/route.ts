import { prisma } from "@/lib/db"
import { VillageService } from "@/lib/game-services/village-service"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return NextResponse.json({ error: "Player ID required" }, { status: 400 })
    }

    const villages = await prisma.village.findMany({
      where: { playerId },
      include: {
        buildings: true,
        troops: true,
        continent: true,
      },
    })

    return NextResponse.json(villages, { status: 200 })
  } catch (error) {
    console.error("[v0] Get villages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { playerId, continentId, name, x, y } = await req.json()

    if (!playerId || !continentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if position is occupied
    const existing = await prisma.village.findUnique({
      where: { x_y: { x, y } },
    })

    if (existing) {
      return NextResponse.json({ error: "Position already occupied" }, { status: 409 })
    }

    const village = await VillageService.createVillage(playerId, continentId, name || "New Village", x, y)

    return NextResponse.json(village, { status: 201 })
  } catch (error) {
    console.error("[v0] Create village error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
