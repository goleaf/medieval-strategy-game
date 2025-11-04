import { prisma } from "@/lib/db"
import { VillageService } from "@/lib/game-services/village-service"
import { ProtectionService } from "@/lib/game-services/protection-service"
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
        player: {
          select: {
            beginnerProtectionUntil: true,
          },
        },
      },
    })

    // Add protection status to each village
    const villagesWithProtection = await Promise.all(
      villages.map(async (village) => {
        const isProtected = await ProtectionService.isVillageProtected(village.id)
        const protectionHoursRemaining = await ProtectionService.getProtectionTimeRemaining(village.playerId)
        return {
          ...village,
          isProtected,
          protectionHoursRemaining,
        }
      }),
    )

    return NextResponse.json(villagesWithProtection, { status: 200 })
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
