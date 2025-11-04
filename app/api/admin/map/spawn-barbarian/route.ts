import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { trackAction, trackError } from "@/app/api/admin/stats/route"

export async function POST(req: NextRequest) {
  try {
    const { x, y, warriors, spearmen, bowmen, horsemen } = await req.json()

    if (typeof x !== "number" || typeof y !== "number") {
      return NextResponse.json({ error: "x and y coordinates are required" }, { status: 400 })
    }

    if (x < 0 || y < 0) {
      return NextResponse.json({ error: "Coordinates must be non-negative" }, { status: 400 })
    }

    // Get world config to check bounds
    const config = await prisma.worldConfig.findFirst()
    if (config && (x > config.maxX || y > config.maxY)) {
      return NextResponse.json(
        { error: `Coordinates out of bounds (max: ${config.maxX}, ${config.maxY})` },
        { status: 400 },
      )
    }

    // Check if position is already occupied
    const existingVillage = await prisma.village.findUnique({
      where: { x_y: { x, y } },
    })

    if (existingVillage) {
      return NextResponse.json({ error: "Position already occupied by a village" }, { status: 400 })
    }

    // Find or create continent at this position
    let continent = await prisma.continent.findFirst({
      where: {
        x: { lte: x },
        y: { lte: y },
      },
      orderBy: [{ x: "desc" }, { y: "desc" }],
    })

    if (!continent) {
      // Create a default continent if none exists
      continent = await prisma.continent.create({
        data: {
          name: `Continent ${x}-${y}`,
          x: Math.floor(x / 10) * 10,
          y: Math.floor(y / 10) * 10,
          size: 10,
        },
      })
    }

    // Find or create a barbarian player (reuse single barbarian player)
    let barbarianPlayer = await prisma.player.findFirst({
      where: {
        playerName: { startsWith: "Barbarian" },
      },
    })

    if (!barbarianPlayer) {
      // Create a barbarian user first
      const barbarianUser = await prisma.user.create({
        data: {
          email: `barbarian-${Date.now()}@game.local`,
          username: `barbarian-${Date.now()}`,
          password: "barbarian", // Dummy password
        },
      })

      // Create barbarian player
      barbarianPlayer = await prisma.player.create({
        data: {
          userId: barbarianUser.id,
          playerName: `Barbarian-${Date.now()}`,
        },
      })
    }

    // Create barbarian village
    const village = await prisma.village.create({
      data: {
        playerId: barbarianPlayer.id,
        continentId: continent.id,
        x,
        y,
        name: "🏴‍☠️ Barbarian Village",
        wood: 1000,
        stone: 1000,
        iron: 500,
        gold: 200,
        food: 2000,
      },
    })

    // Add barbarian troops
    const troopCounts = {
      warriors: warriors || 100,
      spearmen: spearmen || 50,
      bowmen: bowmen || 30,
      horsemen: horsemen || 10,
    }

    if (troopCounts.warriors > 0) {
      await prisma.troop.create({
        data: {
          villageId: village.id,
          type: "WARRIOR",
          quantity: troopCounts.warriors,
          attack: 12,
          defense: 6,
          speed: 5,
          health: 100,
        },
      })
    }

    if (troopCounts.spearmen > 0) {
      await prisma.troop.create({
        data: {
          villageId: village.id,
          type: "SPEARMAN",
          quantity: troopCounts.spearmen,
          attack: 12,
          defense: 8,
          speed: 4,
          health: 120,
        },
      })
    }

    if (troopCounts.bowmen > 0) {
      await prisma.troop.create({
        data: {
          villageId: village.id,
          type: "BOWMAN",
          quantity: troopCounts.bowmen,
          attack: 15,
          defense: 3,
          speed: 6,
          health: 80,
        },
      })
    }

    if (troopCounts.horsemen > 0) {
      await prisma.troop.create({
        data: {
          villageId: village.id,
          type: "HORSEMAN",
          quantity: troopCounts.horsemen,
          attack: 20,
          defense: 10,
          speed: 10,
          health: 150,
        },
      })
    }

    // Create barbarian record
    await prisma.barbarian.create({
      data: {
        x,
        y,
        villageId: village.id,
        warriors: troopCounts.warriors,
        spearmen: troopCounts.spearmen,
        bowmen: troopCounts.bowmen,
        horsemen: troopCounts.horsemen,
      },
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id",
        action: "SPAWN_BARBARIAN",
        details: `Spawned barbarian village at (${x}, ${y})`,
        targetType: "BARBARIAN",
        targetId: village.id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: `Barbarian village spawned at (${x}, ${y})`,
        villageId: village.id,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Spawn barbarian error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

