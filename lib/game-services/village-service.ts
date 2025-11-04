import { prisma } from "@/lib/db"
import type { Village } from "@prisma/client"

export class VillageService {
  /**
   * Create a new village for a player
   */
  static async createVillage(
    playerId: string,
    continentId: string,
    name: string,
    x: number,
    y: number,
  ): Promise<Village> {
    const village = await prisma.village.create({
      data: {
        playerId,
        continentId,
        name,
        x,
        y,
        isCapital: true, // First village is capital
      },
    })

    // Create default buildings
    await this.initializeBuildings(village.id)

    return village
  }

  /**
   * Initialize default buildings for a new village
   */
  private static async initializeBuildings(villageId: string) {
    const buildingTypes = ["HEADQUARTER", "BARRACKS", "MARKETPLACE", "FARM", "WAREHOUSE", "SAWMILL", "QUARRY", "IRON_MINE"]

    await prisma.building.createMany({
      data: buildingTypes.map((type) => ({
        villageId,
        type: type as any,
        level: 1,
      })),
    })

    // Update production rates based on initial buildings
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (village) {
      const { BuildingService } = await import("./building-service")
      const bonuses = BuildingService.calculateProductionBonuses(village.buildings)
      const baseProduction = {
        wood: 10,
        stone: 8,
        iron: 5,
        gold: 2,
        food: 15,
      }

      await prisma.village.update({
        where: { id: villageId },
        data: {
          woodProduction: baseProduction.wood + bonuses.wood,
          stoneProduction: baseProduction.stone + bonuses.stone,
          ironProduction: baseProduction.iron + bonuses.iron,
          goldProduction: baseProduction.gold + bonuses.gold,
          foodProduction: baseProduction.food + bonuses.food,
        },
      })
    }
  }

  /**
   * Get storage capacity for a village based on warehouse/granary levels
   */
  static async getStorageCapacity(villageId: string): Promise<{
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  }> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) {
      return { wood: 10000, stone: 10000, iron: 10000, gold: 10000, food: 10000 }
    }

    const warehouse = village.buildings.find((b) => b.type === "WAREHOUSE")
    const granary = village.buildings.find((b) => b.type === "GRANARY")

    const warehouseLevel = warehouse?.level || 0
    const granaryLevel = granary?.level || 0

    // Base 10000 + 10000 per level for warehouse (wood, stone, iron, gold)
    const materialCapacity = 10000 + warehouseLevel * 10000
    // Base 10000 + 10000 per level for granary (food)
    const foodCapacity = 10000 + granaryLevel * 10000

    return {
      wood: materialCapacity,
      stone: materialCapacity,
      iron: materialCapacity,
      gold: materialCapacity,
      food: foodCapacity,
    }
  }

  /**
   * Check if storage is >95% full and should show upgrade hint
   */
  static async shouldShowUpgradeHint(villageId: string): Promise<boolean> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
    })

    if (!village) return false

    const capacities = await this.getStorageCapacity(villageId)
    const usage = {
      wood: village.wood / capacities.wood,
      stone: village.stone / capacities.stone,
      iron: village.iron / capacities.iron,
      gold: village.gold / capacities.gold,
      food: village.food / capacities.food,
    }

    // Show hint if any resource is >95% full
    return Object.values(usage).some((ratio) => ratio > 0.95)
  }

  /**
   * Process production tick for a village
   * Called every game tick to generate resources
   */
  static async processProductionTick(villageId: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
    })

    if (!village) return

    // Calculate production based on loyalty
    const loyaltyMultiplier = village.loyalty / 100

    const production = {
      wood: Math.floor(village.woodProduction * loyaltyMultiplier),
      stone: Math.floor(village.stoneProduction * loyaltyMultiplier),
      iron: Math.floor(village.ironProduction * loyaltyMultiplier),
      gold: Math.floor(village.goldProduction * loyaltyMultiplier),
      food: Math.floor(village.foodProduction * loyaltyMultiplier),
    }

    // Get storage capacities
    const capacities = await this.getStorageCapacity(villageId)

    // Clamp resources to storage capacity
    const updates = {
      wood: Math.min(village.wood + production.wood, capacities.wood),
      stone: Math.min(village.stone + production.stone, capacities.stone),
      iron: Math.min(village.iron + production.iron, capacities.iron),
      gold: Math.min(village.gold + production.gold, capacities.gold),
      food: Math.min(village.food + production.food, capacities.food),
      lastTickAt: new Date(),
    }

    await prisma.village.update({
      where: { id: villageId },
      data: updates,
    })
  }

  /**
   * Update village loyalty (affects production)
   * Loyalty can be decreased by attacks or increased by buildings
   */
  static async updateLoyalty(villageId: string, delta: number): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
    })

    if (!village) return

    const newLoyalty = Math.max(0, Math.min(100, village.loyalty + delta))

    await prisma.village.update({
      where: { id: villageId },
      data: { loyalty: newLoyalty },
    })
  }

  /**
   * Get total points for a village based on building levels and village count
   * Points = sum of all building levels + 1 per village
   */
  static async calculateVillagePoints(villageId: string): Promise<number> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) return 0

    // Sum of all building levels
    const buildingPoints = village.buildings.reduce((sum, building) => sum + building.level, 0)

    // Base village point
    return buildingPoints + 1
  }

  /**
   * Calculate player total points: sum of building levels + village count
   */
  static async calculatePlayerPoints(playerId: string): Promise<number> {
    const villages = await prisma.village.findMany({
      where: { playerId },
      include: { buildings: true },
    })

    // Sum of all building levels across all villages + village count
    const buildingPoints = villages.reduce(
      (sum, village) => sum + village.buildings.reduce((vSum, building) => vSum + building.level, 0),
      0,
    )

    return buildingPoints + villages.length
  }
}
