import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { HeroService } from "@/lib/game-services/hero-service"

export async function POST(req: NextRequest) {
  try {
    // Get authenticated player
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { itemId } = await req.json()

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
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

    // Equip the item
    await HeroService.equipItem(hero.id, itemId)

    return NextResponse.json({
      success: true,
      message: "Item equipped successfully"
    })

  } catch (error) {
    console.error("[API] Error equipping item:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
