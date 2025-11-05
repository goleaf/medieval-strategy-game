import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { HeroService } from "@/lib/game-services/hero-service"

export async function GET(req: NextRequest) {
  try {
    // Get authenticated player
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get hero
    const hero = await prisma.hero.findUnique({
      where: { playerId: auth.playerId }
    })

    if (!hero) {
      return NextResponse.json(
        { error: "Hero not found" },
        { status: 404 }
      )
    }

    const equipmentData = await HeroService.getHeroEquipment(hero.id)

    return NextResponse.json({
      success: true,
      data: equipmentData
    })

  } catch (error) {
    console.error("[API] Error fetching hero equipment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
