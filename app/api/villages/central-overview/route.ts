import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { CapacityService } from "@/lib/game-services/capacity-service"
import { MerchantService } from "@/lib/game-services/merchant-service"
import { StorageService, type StorageSnapshot } from "@/lib/game-services/storage-service"

interface VillageOverviewData {
  id: string
  name: string
  x: number
  y: number
  isCapital: boolean
  loyalty: number
  loyaltyMax: number
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
  buildQueue: Array<{
    id: string
    buildingId: string | null
    entityKey: string
    fromLevel: number
    toLevel: number
    status: string
    position: number
    startedAt: Date | null
    finishesAt: Date | null
  }>
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
  expansionSlotsAvailable: number
  expansionSlotsTotal: number
  // Merchant availability
  merchants: { free: number; total: number }
  timeToFull: { wood: number | null; stone: number | null; iron: number | null; gold: number | null; food: number | null }
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
        buildQueueTasks: {
          where: {
            status: { in: ["WAITING", "BUILDING", "PAUSED"] },
          },
          orderBy: { position: "asc" },
        },
        troops: true,
        unitStacks: {
          include: {
            unitType: true,
          },
        },
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
        const [capacitySummary, merchantSnapshot] = await Promise.all([
          CapacityService.getVillageCapacitySummary(village.id),
          MerchantService.getSnapshot(village.id),
        ])

        const warehouseCapacity = capacitySummary.totals.wood
        const granaryCapacity = capacitySummary.totals.food

        const productionPerHour = {
          wood: village.woodProduction,
          stone: village.stoneProduction,
          iron: village.ironProduction,
          gold: village.goldProduction,
          food: village.foodProduction,
        }

        const storageSnapshot: StorageSnapshot = {
          resources: {
            wood: village.wood,
            stone: village.stone,
            iron: village.iron,
            gold: village.gold,
            food: village.food,
          },
          capacities: capacitySummary.totals,
        }

        const timeToFull = StorageService.calculateTimeToFull(storageSnapshot, productionPerHour)

        // Count building activity
        const activeConstructions = village.buildQueueTasks.filter((task) => task.status === "BUILDING").length
        const buildingQueueCount = village.buildQueueTasks.length
        const buildQueue = village.buildQueueTasks.map((task) => {
          const sourceBuilding = task.buildingId
            ? village.buildings.find((b) => b.id === task.buildingId)
            : null
          return {
            id: task.id,
            buildingId: task.buildingId,
            entityKey: sourceBuilding?.type ?? task.entityKey,
            fromLevel: task.fromLevel,
            toLevel: task.toLevel,
            status: task.status,
            position: task.position,
            startedAt: task.startedAt,
            finishesAt: task.finishesAt,
          }
        })

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
        const stackTroops =
          village.unitStacks?.flatMap((stack) => {
            if (!stack.unitType || stack.count <= 0) return []
            return {
              type: stack.unitTypeId,
              quantity: stack.count,
            }
          }) ?? []

        const legacyTroops = village.troops.map((troop) => ({
          type: troop.type,
          quantity: troop.quantity,
        }))

        const troops = [...stackTroops, ...legacyTroops]
        const totalTroops = troops.reduce((sum, troop) => sum + troop.quantity, 0)

        // Get troop breakdown
        const { unitStacks, ...villageRest } = village

        const merchants = {
          free: merchantSnapshot.availableMerchants,
          total: merchantSnapshot.totalMerchants,
        }

        const settlersCount = village.troops.find((t) => t.type === "SETTLER")?.quantity ?? 0
        const adminTypes = new Set(["NOBLEMAN", "NOMARCH", "LOGADES", "CHIEF", "SENATOR"])
        const administrators = village.troops
          .filter((troop) => adminTypes.has(troop.type))
          .reduce((sum, troop) => sum + troop.quantity, 0)
        const expansionSlotsAvailable = Math.max(0, village.expansionSlotsTotal - village.expansionSlotsUsed)

        // Placeholder values for culture points (will be implemented later)
        // For now, calculate based on townhall level
        const culturePoints = village.culturePointsPerHour
        const dailyCpProduction = Math.round(village.culturePointsPerHour * 24)

        return {
          id: village.id,
          name: village.name,
          x: village.x,
          y: village.y,
          isCapital: village.isCapital,
          loyalty: village.loyalty,
          loyaltyMax: village.maxLoyalty,
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
          buildQueue,
          outgoingAttacks,
          incomingAttacks,
          outgoingReinforcements,
          incomingReinforcements,
          totalTroops,
          troops,
          culturePoints,
          dailyCpProduction,
          activeCelebrations: 0, // Placeholder
          settlers: settlersCount,
          administrators,
          expansionSlotsAvailable,
          expansionSlotsTotal: village.expansionSlotsTotal,
          merchants,
          timeToFull,
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
