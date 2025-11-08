import { prisma } from "@/lib/db"
import { VillageService } from "@/lib/game-services/village-service"
import { ResourceProductionService } from "@/lib/game-services/resource-production-service"
import { CombatService } from "@/lib/game-services/combat-service"
import { BuildingService } from "@/lib/game-services/building-service"
import { TroopService } from "@/lib/game-services/troop-service"
import { UnitSystemService } from "@/lib/game-services/unit-system-service"
import { ReinforcementService } from "@/lib/game-services/reinforcement-service"
import { MovementService } from "@/lib/game-services/movement-service"
import { ShipmentService } from "@/lib/game-services/shipment-service"
import { TradeRouteService } from "@/lib/game-services/trade-route-service"
import { ExpansionService } from "@/lib/game-services/expansion-service"
import { LoyaltyService } from "@/lib/game-services/loyalty-service"
import { getRallyPointEngine } from "@/lib/rally-point/server"

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

    // Process logistics (shipments + trade routes) before resource ticks
    console.log("[v0] Resolving shipments and trade routes")
    try {
      await ShipmentService.processDueArrivals(now)
      await ShipmentService.processDueReturns(now)
      await TradeRouteService.runDueRoutes(now)
    } catch (logisticsError) {
      console.error("[v0] Logistics processing error:", logisticsError)
    }

    // Process legacy + new resource production ticks for all villages
    const villages = await prisma.village.findMany({
      where: { player: { isDeleted: false } },
    })

    console.log(`[v0] Processing legacy production for ${villages.length} villages`)
    for (const village of villages) {
      await VillageService.processProductionTick(village.id)
    }

    console.log("[v0] Processing Travian-style resource system")
    await ResourceProductionService.processAllVillages({
      tickMinutes: config.tickIntervalMinutes,
    })

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

    // Process completed demolitions
    const completedDemolitions = await prisma.building.findMany({
      where: {
        isDemolishing: true,
        demolitionAt: { lte: now },
      },
    })

    console.log(`[v0] Completing ${completedDemolitions.length} demolitions`)
    for (const building of completedDemolitions) {
      await BuildingService.completeDemolition(building.id)
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

    const modernTrainingCompleted = await UnitSystemService.completeFinishedTraining(now)
    if (modernTrainingCompleted > 0) {
      console.log(`[v0] Completed ${modernTrainingCompleted} unit-system training jobs`)
    }

    // Process new rally point movements
    console.log("[v0] Resolving rally point movements")
    await processRallyPointMovements(now)

    // Process arrived movements
    const arrivedMovements = await prisma.movement.findMany({
      where: {
        status: "IN_PROGRESS",
        arrivalAt: { lte: now },
      },
      include: { attack: true, reinforcement: true },
    })

    console.log(`[v0] Processing ${arrivedMovements.length} arrived movements`)
    for (const movement of arrivedMovements) {
      // Mark movement as arrived
      await prisma.movement.update({
        where: { id: movement.id },
        data: { status: "ARRIVED" },
      })

      // If movement has an attack, mark attack as arrived
      if (movement.attack) {
        await prisma.attack.update({
          where: { id: movement.attack.id },
          data: { status: "ARRIVED" },
        })
      }

      // If movement has a reinforcement, mark reinforcement as arrived
      if (movement.reinforcement) {
        await prisma.reinforcement.update({
          where: { id: movement.reinforcement.id },
          data: { status: "ARRIVED" },
        })
      }

      if (movement.kind === "SETTLER_FOUND") {
        await ExpansionService.handleSettlerArrival(movement.id)
        continue
      }

      // Handle troop forwarding (Reign of Fire feature)
      if (movement.troopId && !movement.attack && !movement.reinforcement) {
        await MovementService.mergeTroops(movement.id)
      }
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
      try {
        await CombatService.processAttackResolution(attack.id)
      } catch (error) {
        console.error(`[v0] Error resolving attack ${attack.id}:`, error)
      }
    }

    // Process arrived reinforcements
    console.log(`[v0] Processing arrived reinforcements`)
    try {
      await ReinforcementService.processArrivedReinforcements()
    } catch (error) {
      console.error(`[v0] Error processing reinforcements:`, error)
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

    // Process troop evasion returns
    await processTroopEvasionReturns(now)

    // Update player rankings (points = building levels + villages)
    await updatePlayerRankings()

    await LoyaltyService.processRegenTick(now)

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

async function processRallyPointMovements(now: Date) {
  try {
    const engine = getRallyPointEngine()
    const resolved = await engine.resolveDueMovements()
    if (resolved.length > 0) {
      console.log(`[v0] Processed ${resolved.length} rally point movements due by ${now.toISOString()}`)
    }
  } catch (error) {
    console.error("[v0] Rally point movement resolution error:", error)
  }
}

/**
 * Process troop returns after evasion periods
 */
async function processTroopEvasionReturns(now: Date) {
  try {
    // Find evasion return messages that are due
    const evasionMessages = await prisma.message.findMany({
      where: {
        type: "SYSTEM",
        content: {
          contains: '"type":"EVASION_RETURN"',
        },
        createdAt: {
          lte: new Date(now.getTime() - 3 * 60 * 1000), // Messages older than 3 minutes
        },
      },
    })

    console.log(`[v0] Processing ${evasionMessages.length} troop evasion returns`)

    for (const message of evasionMessages) {
      try {
        const evasionData = JSON.parse(message.content)

        if (evasionData.type === "EVASION_RETURN") {
          const returnTime = new Date(evasionData.returnAt)

          if (returnTime <= now) {
            // Time to return troops
            await CombatService.processTroopReturn(
              evasionData.villageId,
              evasionData.evadedTroops
            )

            // Mark message as processed (we'll keep it for history)
            await prisma.message.update({
              where: { id: message.id },
              data: {
                subject: "Troop Evasion Completed",
                content: `Troops returned from evasion at ${returnTime.toISOString()}`,
              },
            })
          }
        }
      } catch (error) {
        console.error(`[v0] Error processing evasion message ${message.id}:`, error)
      }
    }
  } catch (error) {
    console.error("[v0] Error processing troop evasion returns:", error)
  }
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
