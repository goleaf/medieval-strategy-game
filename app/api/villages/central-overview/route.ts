import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { TribeService } from "@/lib/game-services/tribe-service"

interface VillageOverviewData {
  id: string
  name: string
  x: number
  y: number
  isCapital: boolean
  loyalty: number
  // Resources
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  woodProduction: number
  stoneProduction: number
  ironProduction: number
  goldProduction: number
  foodProduction: number
  // Warehouse/Granary capacities
  warehouseCapacity: number
  granaryCapacity: number
  // Building activity
  buildingQueueCount: number
  activeConstructions: number
  // Troop movements
  outgoingAttacks: number
  incomingAttacks: number
  outgoingReinforcements: number
  incomingReinforcements: number
  // Troop counts
  totalTroops: number
  troops: { type: string; quantity: number }[]
  // Culture points (placeholder - need to implement)
  culturePoints: number
  dailyCpProduction: number
  activeCelebrations: number
  celebrationEndTime?: Date
  settlers: number
  administrators: number
  expansionSlots: number
  // Merchant availability
  merchants: { free: number; total: number }
}

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    // Get all villages for the player with related data
    const villages = await prisma.village.findMany({
      where: { playerId },
      include: {
        buildings: {
          include: {
            research: true,
            troopProduction: true,
          },
        },
        troops: true,
        attacksFrom: {
          include: {
            movement: true,
          },
        },
        attacksTo: {
          include: {
            movement: true,
          },
        },
        reinforcementsFrom: {
          include: {
            movement: true,
          },
        },
        reinforcementsTo: {
          include: {
            movement: true,
          },
        },
        player: {
          select: {
            playerName: true,
            totalPoints: true,
          },
        },
      },
      orderBy: { isCapital: "desc" }, // Capitals first
    })

    // Transform data for each village
    const overviewData: VillageOverviewData[] = await Promise.all(
      villages.map(async (village) => {
        // Calculate warehouse capacity from WAREHOUSE building
        const warehouseBuilding = village.buildings.find(b => b.type === "WAREHOUSE")
        const warehouseLevel = warehouseBuilding?.level || 0
        const warehouseCapacity = warehouseLevel * 10000 + 10000 // Base 10000 + 10000 per level

        // Calculate granary capacity from GRANARY building
        const granaryBuilding = village.buildings.find(b => b.type === "GRANARY")
        const granaryLevel = granaryBuilding?.level || 0
        const granaryCapacity = granaryLevel * 10000 + 10000 // Base 10000 + 10000 per level

        // Count building activity
        const activeConstructions = village.buildings.filter(b => b.isBuilding).length
        const buildingQueueCount = village.buildings.filter(b => b.queuePosition !== null).length

        // Count troop movements
        const outgoingAttacks = village.attacksFrom.filter(a =>
          a.movement.status === "IN_PROGRESS"
        ).length
        const incomingAttacks = village.attacksTo.filter(a =>
          a.movement.status === "IN_PROGRESS"
        ).length
        const outgoingReinforcements = village.reinforcementsFrom.filter(r =>
          r.movement.status === "IN_PROGRESS"
        ).length
        const incomingReinforcements = village.reinforcementsTo.filter(r =>
          r.movement.status === "IN_PROGRESS"
        ).length

        // Calculate total troops
        const totalTroops = village.troops.reduce((sum, troop) => sum + troop.quantity, 0)

        // Get troop breakdown
        const troops = village.troops.map(troop => ({
          type: troop.type,
          quantity: troop.quantity,
        }))

        // Calculate merchant availability (simplified - assuming 1 merchant per marketplace level)
        const marketplaceBuilding = village.buildings.find(b => b.type === "MARKETPLACE")
        const marketplaceLevel = marketplaceBuilding?.level || 0
        const totalMerchants = marketplaceLevel * 2 + 2 // Base 2 + 2 per level
        const freeMerchants = totalMerchants // Simplified - no market orders tracked yet

        // Placeholder values for culture points (will be implemented later)
        // For now, calculate based on townhall level
        const townhallBuilding = village.buildings.find(b => b.type === "HEADQUARTER")
        const townhallLevel = townhallBuilding?.level || 1
        const culturePoints = townhallLevel * 100 // Simplified calculation
        const dailyCpProduction = townhallLevel * 5 // Simplified calculation

        return {
          id: village.id,
          name: village.name,
          x: village.x,
          y: village.y,
          isCapital: village.isCapital,
          loyalty: village.loyalty,
          wood: village.wood,
          stone: village.stone,
          iron: village.iron,
          gold: village.gold,
          food: village.food,
          woodProduction: village.woodProduction,
          stoneProduction: village.stoneProduction,
          ironProduction: village.ironProduction,
          goldProduction: village.goldProduction,
          foodProduction: village.foodProduction,
          warehouseCapacity,
          granaryCapacity,
          buildingQueueCount,
          activeConstructions,
          outgoingAttacks,
          incomingAttacks,
          outgoingReinforcements,
          incomingReinforcements,
          totalTroops,
          troops,
          culturePoints,
          dailyCpProduction,
          activeCelebrations: 0, // Placeholder
          settlers: 0, // Placeholder
          administrators: 0, // Placeholder
          expansionSlots: 1, // Placeholder
          merchants: {
            free: freeMerchants,
            total: totalMerchants,
          },
        }
      })
    )

    // Calculate totals across all villages
    const totals = {
      villages: overviewData.length,
      totalWood: overviewData.reduce((sum, v) => sum + v.wood, 0),
      totalStone: overviewData.reduce((sum, v) => sum + v.stone, 0),
      totalIron: overviewData.reduce((sum, v) => sum + v.iron, 0),
      totalGold: overviewData.reduce((sum, v) => sum + v.gold, 0),
      totalFood: overviewData.reduce((sum, v) => sum + v.food, 0),
      totalCulturePoints: overviewData.reduce((sum, v) => sum + v.culturePoints, 0),
      totalTroops: overviewData.reduce((sum, v) => sum + v.totalTroops, 0),
      totalWarehouseCapacity: overviewData.reduce((sum, v) => sum + v.warehouseCapacity, 0),
      totalGranaryCapacity: overviewData.reduce((sum, v) => sum + v.granaryCapacity, 0),
      totalFreeMerchants: overviewData.reduce((sum, v) => sum + v.merchants.free, 0),
      totalMerchants: overviewData.reduce((sum, v) => sum + v.merchants.total, 0),
    }

    return successResponse({
      villages: overviewData,
      totals,
      playerName: villages[0]?.player.playerName || "Unknown Player",
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
