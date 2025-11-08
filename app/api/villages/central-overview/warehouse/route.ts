import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

interface WarehouseData {
  villages: {
    id: string
    name: string
    warehouseCapacity: number
    granaryCapacity: number
    // Current resource levels
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
    // Production rates
    woodProduction: number
    stoneProduction: number
    ironProduction: number
    goldProduction: number
    foodProduction: number
    // Time calculations
    warehouseTimeToFull: number | null // minutes until warehouse full, null if not filling
    warehouseTimeToEmpty: number | null // minutes until warehouse empty, null if not emptying
    granaryTimeToFull: number | null // minutes until granary full, null if not filling
    granaryTimeToEmpty: number | null // minutes until granary empty, null if not emptying
    // Status flags
    warehouseFull: boolean
    granaryEmpty: boolean // critical if troops will starve
  }[]
}

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    // Get all villages with building data
    const villages = await prisma.village.findMany({
      where: { playerId },
      include: {
        buildings: {
          where: {
            OR: [
              { type: "WAREHOUSE" },
              { type: "GRANARY" },
            ],
          },
        },
      },
      orderBy: { isCapital: "desc" },
    })

    const warehouseData = villages.map(village => {
      // Calculate warehouse capacity
      const warehouseBuilding = village.buildings.find(b => b.type === "WAREHOUSE")
      const warehouseLevel = warehouseBuilding?.level || 0
      const warehouseCapacity = warehouseLevel * 10000 + 10000 // Base 10000 + 10000 per level

      // Calculate granary capacity
      const granaryBuilding = village.buildings.find(b => b.type === "GRANARY")
      const granaryLevel = granaryBuilding?.level || 0
      const granaryCapacity = granaryLevel * 10000 + 10000 // Base 10000 + 10000 per level

      // Current resource levels
      const currentWarehouseUsed = village.wood + village.stone + village.iron + village.gold
      const currentGranaryUsed = village.food

      // Production rates (assuming per game tick, need to convert to per minute)
      const warehouseProduction = village.woodProduction + village.stoneProduction + village.ironProduction + village.goldProduction
      const granaryProduction = village.foodProduction

      // Assume 5-minute ticks for time calculations
      const minutesPerTick = 5

      // Warehouse time calculations
      let warehouseTimeToFull: number | null = null
      let warehouseTimeToEmpty: number | null = null

      if (warehouseProduction > 0) {
        const remainingCapacity = warehouseCapacity - currentWarehouseUsed
        if (remainingCapacity > 0) {
          warehouseTimeToFull = Math.ceil((remainingCapacity / warehouseProduction) * minutesPerTick)
        }
      } else if (warehouseProduction < 0) {
        // If production is negative, calculate time to empty
        warehouseTimeToEmpty = Math.ceil((currentWarehouseUsed / Math.abs(warehouseProduction)) * minutesPerTick)
      }

      // Granary time calculations
      let granaryTimeToFull: number | null = null
      let granaryTimeToEmpty: number | null = null

      if (granaryProduction > 0) {
        const remainingCapacity = granaryCapacity - currentGranaryUsed
        if (remainingCapacity > 0) {
          granaryTimeToFull = Math.ceil((remainingCapacity / granaryProduction) * minutesPerTick)
        }
      } else if (granaryProduction < 0) {
        // If production is negative, calculate time to empty (starvation!)
        granaryTimeToEmpty = Math.ceil((currentGranaryUsed / Math.abs(granaryProduction)) * minutesPerTick)
      }

      return {
        id: village.id,
        name: village.name,
        warehouseCapacity,
        granaryCapacity,
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
        warehouseTimeToFull,
        warehouseTimeToEmpty,
        granaryTimeToFull,
        granaryTimeToEmpty,
        warehouseFull: currentWarehouseUsed >= warehouseCapacity,
        granaryEmpty: currentGranaryUsed <= 0 && granaryProduction < 0, // Critical if empty and consuming
      }
    })

    const response: WarehouseData = {
      villages: warehouseData,
    }

    return successResponse(response)
  } catch (error) {
    return serverErrorResponse(error)
  }
}


