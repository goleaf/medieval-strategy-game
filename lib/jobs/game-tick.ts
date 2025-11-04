import { prisma } from "@/lib/db"
import { VillageService } from "@/lib/game-services/village-service"
import { CombatService } from "@/lib/game-services/combat-service"
import { BuildingService } from "@/lib/game-services/building-service"
import { TroopService } from "@/lib/game-services/troop-service"

/**
 * Main game tick job
 * Called periodically based on tickIntervalMinutes config (default 5 minutes)
 */
export async function processGameTick() {
  console.log("[v0] Processing game tick...")

  try {
    // Get world config
    const config = await prisma.worldConfig.findFirst()
    if (!config || !config.isRunning) {
      console.log("[v0] Game is paused or not initialized")
      return
    }

    const now = new Date()

    // Process production ticks for all villages
    const villages = await prisma.village.findMany({
      where: { player: { isDeleted: false } },
    })

    console.log(`[v0] Processing production for ${villages.length} villages`)
    for (const village of villages) {
      await VillageService.processProductionTick(village.id)
    }

    // Process completed buildings
    const completedBuildings = await prisma.building.findMany({
      where: {
        isBuilding: true,
        completionAt: { lte: now },
      },
    })

    console.log(`[v0] Completing ${completedBuildings.length} buildings`)
    for (const building of completedBuildings) {
      await BuildingService.completeBuilding(building.id)
    }

    // Process completed troop training
    const completedTraining = await prisma.troopProduction.findMany({
      where: {
        completionAt: { lte: now },
      },
    })

    console.log(`[v0] Completing ${completedTraining.length} troop productions`)
    for (const production of completedTraining) {
      await TroopService.completeTroopTraining(production.id)
    }

    // Process arrived attacks
    const arrivedAttacks = await prisma.attack.findMany({
      where: {
        status: "ARRIVED",
        arrivalAt: { lte: now },
      },
    })

    console.log(`[v0] Resolving ${arrivedAttacks.length} attacks`)
    for (const attack of arrivedAttacks) {
      await CombatService.processAttackResolution(attack.id)
    }

    // Process expired market orders
    const expiredOrders = await prisma.marketOrder.findMany({
      where: {
        status: "OPEN",
        expiresAt: { lte: now },
      },
    })

    console.log(`[v0] Expiring ${expiredOrders.length} market orders`)
    for (const order of expiredOrders) {
      // If it was a sell order, return resources to seller
      if (order.type === "SELL") {
        await prisma.village.update({
          where: { id: order.villageId },
          data: {
            [order.offeringResource.toLowerCase()]: {
              increment: order.offeringAmount,
            },
          },
        })
      }

      await prisma.marketOrder.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      })
    }

    // Update player rankings (points = building levels + villages)
    await updatePlayerRankings()

    console.log("[v0] Game tick completed successfully")
  } catch (error) {
    console.error("[v0] Error processing game tick:", error)
  }
}

/**
 * Update player rankings and cache leaderboard
 * Points = sum of all building levels + village count
 */
async function updatePlayerRankings() {
  const players = await prisma.player.findMany({
    where: { isDeleted: false },
    include: { villages: { include: { buildings: true } } },
  })

  // Calculate points for each player
  const playersWithPoints = await Promise.all(
    players.map(async (player) => {
      const points = await VillageService.calculatePlayerPoints(player.id)
      return { ...player, totalPoints: points }
    }),
  )

  // Sort by points
  const sortedPlayers = playersWithPoints.sort((a, b) => b.totalPoints - a.totalPoints)

  // Update ranks and points
  let rank = 1
  for (const player of sortedPlayers) {
    await prisma.player.update({
      where: { id: player.id },
      data: { rank, totalPoints: player.totalPoints },
    })
    rank++
  }

  // Cache leaderboard
  const leaderboardData = sortedPlayers.slice(0, 100).map((p, idx) => ({
    rank: idx + 1,
    playerId: p.id,
    playerName: p.playerName,
    points: p.totalPoints,
    villages: p.villages.length,
  }))

  await prisma.leaderboardCache.upsert({
    where: { type: "PLAYERS" },
    update: {
      data: JSON.stringify(leaderboardData),
      updatedAt: new Date(),
    },
    create: {
      type: "PLAYERS",
      data: JSON.stringify(leaderboardData),
    },
  })

  console.log(`[v0] Updated rankings for ${sortedPlayers.length} players`)
}

/**
 * Spawn barbarian villages on the map
 * Called less frequently (e.g., every 5 minutes)
 */
export async function spawnBarbainians() {
  console.log("[v0] Spawning barbarians...")

  try {
    const continents = await prisma.continent.findMany()
    if (continents.length === 0) {
      console.log("[v0] No continents found")
      return
    }

    // Spawn 5-10 new barbarian villages
    const spawnCount = Math.floor(Math.random() * 5) + 5

    for (let i = 0; i < spawnCount; i++) {
      const continent = continents[Math.floor(Math.random() * continents.length)]
      const x = continent.x + Math.floor(Math.random() * continent.size) * 10
      const y = continent.y + Math.floor(Math.random() * continent.size) * 10

      // Check if position is free
      const existing = await prisma.village.findUnique({
        where: { x_y: { x, y } },
      })

      if (!existing) {
        // Create unassigned village for barbarians
        const village = await prisma.village.create({
          data: {
            playerId: "barbarian",
            continentId: continent.id,
            x,
            y,
            name: "🏴‍☠️ Barbarian Village",
          },
        })

        // Add barbarian troops
        await prisma.troop.create({
          data: {
            villageId: village.id,
            type: "WARRIOR",
            quantity: 100,
            attack: 12,
            defense: 6,
            speed: 5,
            health: 100,
          },
        })

        await prisma.barbarian.create({
          data: {
            x,
            y,
            villageId: village.id,
            warriors: 100,
            spearmen: 50,
            bowmen: 30,
            horsemen: 10,
          },
        })
      }
    }

    console.log("[v0] Barbarian spawning completed")
  } catch (error) {
    console.error("[v0] Error spawning barbarians:", error)
  }
}
