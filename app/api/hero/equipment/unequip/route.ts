import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { HeroService } from "@/lib/game-services/hero-service"
import { EquipmentSlot } from "@prisma/client"

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

    const { slot } = await req.json()

    if (!slot || !Object.values(EquipmentSlot).includes(slot)) {
      return NextResponse.json(
        { error: "Valid equipment slot is required" },
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

    // Unequip the item
    await HeroService.unequipItem(hero.id, slot)

    return NextResponse.json({
      success: true,
      message: "Item unequipped successfully"
    })

  } catch (error) {
    console.error("[API] Error unequipping item:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
