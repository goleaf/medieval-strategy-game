import { prisma } from "@/lib/db"
import { VillageDestructionService } from "./village-destruction-service"
import { createTasksForVillage } from "./task-service"
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
    isCapital?: boolean,
    selectedTribe?: string, // Reign of Fire: allow tribe selection for first 3 villages
  ): Promise<Village> {
    // Check if this is the player's first village
    const existingVillages = await prisma.village.findMany({
      where: { playerId },
    })
    const shouldBeCapital = isCapital !== undefined ? isCapital : existingVillages.length === 0

    // Get player with game world info for culture point requirements
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { gameWorld: true }
    })

    if (!player) throw new Error("Player not found")

    // Check culture point requirements for village expansion (not capital)
    if (!shouldBeCapital) {
      const requiredCP = player.gameWorld?.requirementForSecondVillage || 2000
      if (player.culturePoints < requiredCP) {
        throw new Error(`Insufficient culture points. Required: ${requiredCP}, You have: ${player.culturePoints}`)
      }
    }

    const village = await prisma.village.create({
      data: {
        playerId,
        continentId,
        name,
        x,
        y,
        isCapital: shouldBeCapital,
      },
    })

    // Create default buildings
    await this.initializeBuildings(village.id)

    // Create village-specific tasks
    await createTasksForVillage(village.id, playerId)

    // Reign of Fire: Allow tribe selection for first 3 villages
    if (selectedTribe && existingVillages.length < 3) {
      // Get the tribe to ensure it exists
      const tribe = await prisma.tribe.findUnique({
        where: { name: selectedTribe }
      });

      if (tribe) {
        // Update player's tribe
        await prisma.player.update({
          where: { id: playerId },
          data: { tribeId: tribe.id }
        });
      }
    }

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

    // Get hero resource production bonus
    let heroBonus = 0
    if (village.playerId) {
      const player = await prisma.player.findUnique({
        where: { id: village.playerId },
        select: { gameTribe: true }
      })
      if (player?.gameTribe) {
        const { TribeService } = await import("./tribe-service")
        heroBonus = TribeService.getHeroResourceProductionBonus(player.gameTribe)
      }
    }

    const baseProduction = {
      wood: Math.floor(village.woodProduction * loyaltyMultiplier),
      stone: Math.floor(village.stoneProduction * loyaltyMultiplier),
      iron: Math.floor(village.ironProduction * loyaltyMultiplier),
      gold: Math.floor(village.goldProduction * loyaltyMultiplier),
      food: Math.floor(village.foodProduction * loyaltyMultiplier),
    }

    // Apply hero bonus
    const production = {
      wood: Math.floor(baseProduction.wood * (1 + heroBonus)),
      stone: Math.floor(baseProduction.stone * (1 + heroBonus)),
      iron: Math.floor(baseProduction.iron * (1 + heroBonus)),
      gold: Math.floor(baseProduction.gold * (1 + heroBonus)),
      food: Math.floor(baseProduction.food * (1 + heroBonus)),
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

  /**
   * Generate a random medieval village name
   */
  static generateRandomVillageName(): string {
    const prefixes = [
      "Oak",
      "Stone",
      "Iron",
      "Golden",
      "Silver",
      "Raven",
      "Wolf",
      "Eagle",
      "Dragon",
      "Crown",
      "Iron",
      "Steel",
      "Dark",
      "Bright",
      "North",
      "South",
      "East",
      "West",
      "Old",
      "New",
      "Grand",
      "Fort",
      "Castle",
      "Bridge",
      "River",
      "Hill",
      "Valley",
      "Forest",
      "Lake",
      "Mount",
    ]

    const suffixes = [
      "brook",
      "dale",
      "field",
      "ford",
      "gate",
      "ham",
      "haven",
      "hill",
      "hold",
      "keep",
      "land",
      "mere",
      "moor",
      "port",
      "ridge",
      "shire",
      "stead",
      "stone",
      "town",
      "vale",
      "wall",
      "wick",
      "wood",
      "worth",
      "bury",
      "caster",
      "chester",
      "ford",
      "minster",
      "wick",
    ]

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    return `${prefix}${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`
  }

  /**
   * Find an available position on a continent
   */
  static async findAvailablePosition(continentId: string, maxAttempts: number = 50): Promise<{ x: number; y: number } | null> {
    const continent = await prisma.continent.findUnique({
      where: { id: continentId },
    })

    if (!continent) {
      return null
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = continent.x + Math.floor(Math.random() * continent.size * 10)
      const y = continent.y + Math.floor(Math.random() * continent.size * 10)

      const existing = await prisma.village.findUnique({
        where: { x_y: { x, y } },
      })

      if (!existing) {
        return { x, y }
      }
    }

    return null
  }

  /**
   * Ensure a player has at least one village, create one if they don't
   */
  static async ensurePlayerHasVillage(playerId: string): Promise<Village | null> {
    // Check if player already has villages
    const existingVillages = await prisma.village.findMany({
      where: { playerId },
    })

    if (existingVillages.length > 0) {
      return existingVillages[0]
    }

    // Get all continents
    const continents = await prisma.continent.findMany()
    if (continents.length === 0) {
      console.error("[VillageService] No continents available to create village")
      return null
    }

    // Pick a random continent
    const randomContinent = continents[Math.floor(Math.random() * continents.length)]

    // Find an available position
    const position = await this.findAvailablePosition(randomContinent.id)
    if (!position) {
      console.error("[VillageService] Could not find available position for village")
      return null
    }

    // Generate random name
    const villageName = this.generateRandomVillageName()

    // Create the village
    return await this.createVillage(
      playerId,
      randomContinent.id,
      villageName,
      position.x,
      position.y,
    )
  }
}
