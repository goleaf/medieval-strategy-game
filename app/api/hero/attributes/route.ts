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
    const { fightingStrength, offBonus, defBonus, resources } = await req.json()

    // Validate input
    if (typeof fightingStrength !== 'number' || typeof offBonus !== 'number' ||
        typeof defBonus !== 'number' || typeof resources !== 'number') {
      return NextResponse.json({
        error: "All attribute values must be numbers"
      }, { status: 400 })
    }

    // Get hero
    const hero = await prisma.hero.findFirst({
      where: { playerId }
    })

    if (!hero) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 })
    }

    // Calculate available skill points
    const totalAllocatedPoints = fightingStrength + offBonus + defBonus + resources
    const availablePoints = (hero.level - 1) * 4 + 4 // Level 1 gets 4 points, each level up gives 4 more

    if (totalAllocatedPoints > availablePoints) {
      return NextResponse.json({
        error: `Not enough skill points. Available: ${availablePoints}, Requested: ${totalAllocatedPoints}`
      }, { status: 400 })
    }

    if (fightingStrength < 0 || offBonus < 0 || defBonus < 0 || resources < 0) {
      return NextResponse.json({
        error: "Attribute values cannot be negative"
      }, { status: 400 })
    }

    // Update hero attributes
    const updatedHero = await prisma.hero.update({
      where: { id: hero.id },
      data: {
        fightingStrength,
        offBonus,
        defBonus,
        resources,
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedHero,
      message: "Hero attributes updated successfully!"
    })
  } catch (error) {
    console.error("Hero attributes POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


