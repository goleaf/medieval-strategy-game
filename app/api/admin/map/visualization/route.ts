import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../../middleware"

export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return new Response(JSON.stringify({
      success: false,
      error: "Admin authentication required"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    })
  }

  try {
    // Get world configuration
    const worldConfig = await prisma.worldConfig.findFirst()
    if (!worldConfig) {
      return NextResponse.json({
        success: false,
        error: "World configuration not found"
      }, { status: 404 })
    }

    // Get all villages with player info
    const villages = await prisma.village.findMany({
      include: {
        player: {
          select: {
            id: true,
            playerName: true,
            isDeleted: true,
            banReason: true,
          }
        },
        buildings: {
          select: {
            type: true,
            level: true,
          }
        },
      },
    })

    // Get all barbarian villages
    const barbarians = await prisma.barbarian.findMany({
      include: {
        village: true,
      },
    })

    // Get continents
    const continents = await prisma.continent.findMany()

    // Process village data for map display
    const processedVillages = villages.map(village => ({
      id: village.id,
      x: village.x,
      y: village.y,
      name: village.name,
      isCapital: village.isCapital,
      player: village.player ? {
        id: village.player.id,
        name: village.player.playerName,
        isDeleted: village.player.isDeleted,
        isBanned: !!village.player.banReason,
      } : null,
      buildings: village.buildings.length,
      totalBuildingLevels: village.buildings.reduce((sum, b) => sum + b.level, 0),
      resources: {
        wood: village.wood,
        stone: village.stone,
        iron: village.iron,
        gold: village.gold,
        food: village.food,
      },
      totalResources: village.wood + village.stone + village.iron + village.gold + village.food,
      population: village.population,
      loyalty: village.loyalty,
    }))

    // Process barbarian data
    const processedBarbarians = barbarians.map(barbarian => ({
      id: barbarian.id,
      x: barbarian.x,
      y: barbarian.y,
      villageId: barbarian.villageId,
      troops: {
        warriors: barbarian.warriors,
        spearmen: barbarian.spearmen,
        bowmen: barbarian.bowmen,
        horsemen: barbarian.horsemen,
      },
      totalTroops: barbarian.warriors + barbarian.spearmen + barbarian.bowmen + barbarian.horsemen,
      lastAttacked: barbarian.lastAttackAt,
    }))

    // Calculate map statistics
    const stats = {
      totalVillages: villages.length,
      playerVillages: villages.filter(v => v.player && !v.player.isDeleted).length,
      barbarianVillages: barbarians.length,
      emptyVillages: villages.filter(v => !v.player).length,
      bannedPlayers: villages.filter(v => v.player?.banReason).length,
      totalContinents: continents.length,
      worldSize: {
        width: worldConfig.maxX,
        height: worldConfig.maxY,
      },
    }

    return NextResponse.json({
      success: true,
      data: {
        worldConfig: {
          name: worldConfig.worldName,
          maxX: worldConfig.maxX,
          maxY: worldConfig.maxY,
          speed: worldConfig.speed,
          isRunning: worldConfig.isRunning,
        },
        villages: processedVillages,
        barbarians: processedBarbarians,
        continents: continents.map(c => ({
          id: c.id,
          name: c.name,
          x: c.x,
          y: c.y,
          size: c.size,
        })),
        stats,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Map visualization error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to load map data"
    }, { status: 500 })
  }
}
