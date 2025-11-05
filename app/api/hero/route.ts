import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticatePlayer } from "../middleware"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticatePlayer(req)
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { playerId } = auth

    // Get player's hero
    const hero = await prisma.hero.findFirst({
      where: { playerId },
      include: {
        heroItems: true,
        homeVillage: {
          select: { id: true, name: true, x: true, y: true }
        },
        currentVillage: {
          select: { id: true, name: true, x: true, y: true }
        },
        adventures: {
          where: { status: { in: ['AVAILABLE', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!hero) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No hero found. Create one first."
      })
    }

    // Calculate experience needed for next level
    const xpForNextLevel = hero.level * 100

    return NextResponse.json({
      success: true,
      data: {
        ...hero,
        xpForNextLevel,
        canLevelUp: hero.experience >= xpForNextLevel
      }
    })
  } catch (error) {
    console.error("[v0] Hero GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticatePlayer(req)
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { playerId } = auth

    // Check if player already has a hero
    const existingHero = await prisma.hero.findFirst({
      where: { playerId }
    })

    if (existingHero) {
      return NextResponse.json({
        error: "Player already has a hero"
      }, { status: 400 })
    }

    // Get player's capital village for home village
    const capitalVillage = await prisma.village.findFirst({
      where: {
        playerId,
        isCapital: true
      }
    })

    if (!capitalVillage) {
      return NextResponse.json({
        error: "Player must have a capital village first"
      }, { status: 400 })
    }

    // Create hero
    const hero = await prisma.hero.create({
      data: {
        playerId,
        homeVillageId: capitalVillage.id,
        currentVillageId: capitalVillage.id,
        name: "Hero",
        level: 1,
        experience: 0,
        fightingStrength: 4, // Default 4 points
        offBonus: 0,
        defBonus: 0,
        resources: 0,
        health: 100,
        maxHealth: 100,
      },
      include: {
        homeVillage: {
          select: { id: true, name: true, x: true, y: true }
        },
        currentVillage: {
          select: { id: true, name: true, x: true, y: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: hero,
      message: "Hero created successfully!"
    })
  } catch (error) {
    console.error("[v0] Hero POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
