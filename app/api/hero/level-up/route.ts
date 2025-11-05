import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticatePlayer } from "../../middleware"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticatePlayer(req)
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { playerId } = auth

    // Get hero
    const hero = await prisma.hero.findFirst({
      where: { playerId }
    })

    if (!hero) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 })
    }

    // Check if hero can level up
    const xpForNextLevel = hero.level * 100
    if (hero.experience < xpForNextLevel) {
      return NextResponse.json({
        error: `Not enough experience. Need ${xpForNextLevel}, have ${hero.experience}`
      }, { status: 400 })
    }

    // Level up hero
    const updatedHero = await prisma.hero.update({
      where: { id: hero.id },
      data: {
        level: hero.level + 1,
        health: hero.maxHealth, // Full heal on level up
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedHero,
      message: `Hero leveled up to level ${updatedHero.level}!`
    })
  } catch (error) {
    console.error("[v0] Hero level-up POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
