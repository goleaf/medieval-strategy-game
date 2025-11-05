import { prisma } from "@/lib/db"
import { VillageDestructionService } from "./village-destruction-service"
import { updateTaskProgress } from "./task-service"
import type { BuildingType, DemolitionMode } from "@prisma/client"

const BUILDING_COSTS: Record<BuildingType, Record<string, number>> = {
  HEADQUARTER: { wood: 100, stone: 100, iron: 50, gold: 20, food: 100 },
  MARKETPLACE: { wood: 150, stone: 150, iron: 100, gold: 50, food: 150 },
  BARRACKS: { wood: 200, stone: 100, iron: 150, gold: 0, food: 200 },
  STABLES: { wood: 250, stone: 150, iron: 200, gold: 50, food: 250 },
  WATCHTOWER: { wood: 100, stone: 200, iron: 100, gold: 0, food: 100 },
  WALL: { wood: 50, stone: 300, iron: 50, gold: 0, food: 50 },
  WAREHOUSE: { wood: 300, stone: 200, iron: 100, gold: 0, food: 300 },
  GRANARY: { wood: 200, stone: 150, iron: 50, gold: 0, food: 200 },
  SAWMILL: { wood: 100, stone: 100, iron: 50, gold: 0, food: 100 },
  QUARRY: { wood: 100, stone: 100, iron: 50, gold: 0, food: 100 },
  IRON_MINE: { wood: 100, stone: 100, iron: 100, gold: 0, food: 100 },
  TREASURY: { wood: 200, stone: 200, iron: 200, gold: 100, food: 200 },
  ACADEMY: { wood: 300, stone: 300, iron: 200, gold: 100, food: 300 },
  TEMPLE: { wood: 250, stone: 250, iron: 100, gold: 50, food: 250 },
  HOSPITAL: { wood: 200, stone: 200, iron: 150, gold: 0, food: 200 },
  FARM: { wood: 150, stone: 100, iron: 50, gold: 0, food: 150 },
  SNOB: { wood: 500, stone: 500, iron: 500, gold: 500, food: 500 },
  CRANNY: { wood: 40, stone: 50, iron: 30, gold: 0, food: 40 },
  // Teutonic-specific buildings
  EARTH_WALL: { wood: 100, stone: 200, iron: 50, gold: 0, food: 100 },
  BREWERY: { wood: 300, stone: 250, iron: 150, gold: 100, food: 200 },
  // Defensive buildings
  TRAPPER: { wood: 100, stone: 100, iron: 100, gold: 20, food: 100 },
}

const BUILDING_UPGRADE_TIME: Record<BuildingType, number> = {
  HEADQUARTER: 3600,
  MARKETPLACE: 2700,
  BARRACKS: 2700,
  STABLES: 3600,
  WATCHTOWER: 2700,
  WALL: 2700,
  WAREHOUSE: 2400,
  GRANARY: 2400,
  SAWMILL: 2400,
  QUARRY: 2400,
  IRON_MINE: 2400,
  TREASURY: 3600,
  ACADEMY: 5400,
  TEMPLE: 5400,
  HOSPITAL: 3600,
  FARM: 2400,
  SNOB: 7200,
  CRANNY: 1800,
  // Teutonic-specific buildings
  EARTH_WALL: 2700,
  BREWERY: 3600,
  // Huns-specific buildings
  COMMAND_CENTER: 4800,
  MAKESHIFT_WALL: 2400,
  // Defensive buildings
  TRAPPER: 1800,
}

export class BuildingService {
  /**
   * Get construction queue limit from world config
   */
  static async getQueueLimit(): Promise<number> {
    const config = await prisma.worldConfig.findFirst()
    return config?.constructionQueueLimit || 3
  }

  /**
   * Get current construction queue for a village
   */
  static async getConstructionQueue(villageId: string) {
    return await prisma.building.findMany({
      where: {
        villageId,
        isBuilding: true,
        queuePosition: { not: null },
      },
      orderBy: { queuePosition: "asc" },
    })
  }

  /**
   * Calculate production bonuses from buildings
   */
  static calculateProductionBonuses(buildings: Array<{ type: BuildingType; level: number }>): {
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  } {
    const bonuses = { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }

    for (const building of buildings) {
      switch (building.type) {
        case "SAWMILL":
          bonuses.wood += building.level * 5 // +5 wood per level
          break
        case "QUARRY":
          bonuses.stone += building.level * 4 // +4 stone per level
          break
        case "IRON_MINE":
          bonuses.iron += building.level * 3 // +3 iron per level
          break
        case "TREASURY":
          bonuses.gold += building.level * 2 // +2 gold per level
          break
        case "FARM":
          bonuses.food += building.level * 6 // +6 food per level
          break
        case "WATERWORKS":
          // Egyptian Waterworks: boosts resource production through oasis bonuses
          // +3 to all resources per level (simulating oasis bonus enhancement)
          bonuses.wood += building.level * 3
          bonuses.stone += building.level * 3
          bonuses.iron += building.level * 3
          bonuses.gold += building.level * 3
          bonuses.food += building.level * 3
          break
      }
    }

    return bonuses
  }

  /**
   * Calculate population limit based on Farm level
   */
  static calculatePopulationLimit(buildings: Array<{ type: BuildingType; level: number }>): number {
    const farm = buildings.find((b) => b.type === "FARM")
    const farmLevel = farm?.level || 0
    // Base 100 + 50 per farm level
    return 100 + farmLevel * 50
  }

  /**
   * Upgrade building - adds to construction queue
   * Costs are deducted at enqueue
   */
  static async upgradeBuilding(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (building.isBuilding) throw new Error("Building already under construction")

    // Check Brewery building restrictions (Teutonic-only)
    if (building.type === "BREWERY") {
      const restrictedBuildings = building.village.buildings.filter(b =>
        ["RESIDENCE", "PALACE", "COMMAND_CENTER"].includes(b.type)
      )
      if (restrictedBuildings.length > 0) {
        throw new Error("Cannot build Brewery in a village that contains Residence, Palace, or Command Center")
      }
    }

    // Check queue limit
    const queueLimit = await this.getQueueLimit()
    const currentQueue = await this.getConstructionQueue(building.villageId)
    if (currentQueue.length >= queueLimit) {
      throw new Error(`Construction queue is full (max ${queueLimit})`)
    }

    const costs = BUILDING_COSTS[building.type as BuildingType]
    const village = building.village

    // Check resources
    if (
      village.wood < costs.wood ||
      village.stone < costs.stone ||
      village.iron < costs.iron ||
      village.gold < costs.gold ||
      village.food < costs.food
    ) {
      throw new Error("Insufficient resources")
    }

    // Calculate completion time with speed scaling
    let baseCompletionTime = BUILDING_UPGRADE_TIME[building.type as BuildingType] * (1 + building.level * 0.1)

    // Apply speed scaling from game world
    const player = await prisma.player.findUnique({
      where: { id: village.playerId },
      include: { gameWorld: true }
    })

    if (player?.gameWorld?.speed && player.gameWorld.speed > 1) {
      // Speed scaling: higher speed = faster construction (time divided by speed factor)
      baseCompletionTime = baseCompletionTime / player.gameWorld.speed
    }

    const completionTime = baseCompletionTime
    
    // Calculate when this building will complete based on queue
    let completionAt = new Date()
    if (currentQueue.length > 0) {
      const lastBuilding = currentQueue[currentQueue.length - 1]
      completionAt = lastBuilding.completionAt || new Date()
    }
    completionAt = new Date(completionAt.getTime() + completionTime * 1000)

    // Deduct costs immediately
    await prisma.village.update({
      where: { id: village.id },
      data: {
        wood: village.wood - costs.wood,
        stone: village.stone - costs.stone,
        iron: village.iron - costs.iron,
        gold: village.gold - costs.gold,
        food: village.food - costs.food,
      },
    })

    // Add to queue
    const queuePosition = currentQueue.length + 1
    await prisma.building.update({
      where: { id: buildingId },
      data: {
        isBuilding: true,
        completionAt,
        queuePosition,
        constructionCostWood: costs.wood,
        constructionCostStone: costs.stone,
        constructionCostIron: costs.iron,
        constructionCostGold: costs.gold,
        constructionCostFood: costs.food,
      },
    })
  }

  /**
   * Cancel building construction with refund based on Travian system
   * - Level 1 upgrades: full refund
   * - Higher level upgrades: refund the cost difference between levels
   * - Research actions cannot be canceled
   */
  static async cancelBuilding(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        village: true,
        research: true
      },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isBuilding || building.queuePosition === null) {
      throw new Error("Building is not under construction")
    }

    // Prevent canceling buildings that are currently researching (Travian rule)
    if (building.research?.isResearching) {
      throw new Error("Cannot cancel building that is currently researching")
    }

    let refund = {
      wood: 0,
      stone: 0,
      iron: 0,
      gold: 0,
      food: 0,
    }

    // Calculate refund based on Travian system
    if (building.level === 0) {
      // Level 1 upgrade - full refund
      refund = {
        wood: building.constructionCostWood,
        stone: building.constructionCostStone,
        iron: building.constructionCostIron,
        gold: building.constructionCostGold,
        food: building.constructionCostFood,
      }
    } else {
      // Higher level upgrade - refund difference between new and current level costs
      const currentLevelCost = this.getBuildingCosts(building.type as BuildingType)
      const newLevelCost = BUILDING_COSTS[building.type as BuildingType]

      // Apply level scaling to both costs
      const currentLevelScaled = {
        wood: Math.floor(currentLevelCost.wood * Math.pow(1.2, building.level - 1)),
        stone: Math.floor(currentLevelCost.stone * Math.pow(1.2, building.level - 1)),
        iron: Math.floor(currentLevelCost.iron * Math.pow(1.2, building.level - 1)),
        gold: Math.floor(currentLevelCost.gold * Math.pow(1.2, building.level - 1)),
        food: Math.floor(currentLevelCost.food * Math.pow(1.2, building.level - 1)),
      }

      const newLevelScaled = {
        wood: Math.floor(newLevelCost.wood * Math.pow(1.2, building.level)),
        stone: Math.floor(newLevelCost.stone * Math.pow(1.2, building.level)),
        iron: Math.floor(newLevelCost.iron * Math.pow(1.2, building.level)),
        gold: Math.floor(newLevelCost.gold * Math.pow(1.2, building.level)),
        food: Math.floor(newLevelCost.food * Math.pow(1.2, building.level)),
      }

      // Refund is the difference between invested cost and current level cost
      refund = {
        wood: Math.max(0, building.constructionCostWood - currentLevelScaled.wood),
        stone: Math.max(0, building.constructionCostStone - currentLevelScaled.stone),
        iron: Math.max(0, building.constructionCostIron - currentLevelScaled.iron),
        gold: Math.max(0, building.constructionCostGold - currentLevelScaled.gold),
        food: Math.max(0, building.constructionCostFood - currentLevelScaled.food),
      }
    }

    // Refund resources
    await prisma.village.update({
      where: { id: building.villageId },
      data: {
        wood: { increment: refund.wood },
        stone: { increment: refund.stone },
        iron: { increment: refund.iron },
        gold: { increment: refund.gold },
        food: { increment: refund.food },
      },
    })

    // Remove from queue and update positions
    const queuePosition = building.queuePosition
    await prisma.building.update({
      where: { id: buildingId },
      data: {
        isBuilding: false,
        completionAt: null,
        queuePosition: null,
        constructionCostWood: 0,
        constructionCostStone: 0,
        constructionCostIron: 0,
        constructionCostGold: 0,
        constructionCostFood: 0,
      },
    })

    // Shift queue positions
    const buildingsToShift = await prisma.building.findMany({
      where: {
        villageId: building.villageId,
        isBuilding: true,
        queuePosition: { gt: queuePosition },
      },
    })

    for (const b of buildingsToShift) {
      await prisma.building.update({
        where: { id: b.id },
        data: { queuePosition: (b.queuePosition || 0) - 1 },
      })
    }
  }

  /**
   * Complete building construction and start next in queue
   */
  static async completeBuilding(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: { include: { buildings: true } } },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isBuilding) return

    // Complete the building
    await prisma.building.update({
      where: { id: buildingId },
      data: {
        level: building.level + 1,
        isBuilding: false,
        completionAt: null,
        queuePosition: null,
        constructionCostWood: 0,
        constructionCostStone: 0,
        constructionCostIron: 0,
        constructionCostGold: 0,
        constructionCostFood: 0,
      },
    })

    // Update production rates based on new building levels
    const village = await prisma.village.findUnique({
      where: { id: building.villageId },
      include: { buildings: true },
    })

    if (village) {
      const bonuses = this.calculateProductionBonuses(village.buildings)
      const baseProduction = {
        wood: 10,
        stone: 8,
        iron: 5,
        gold: 2,
        food: 15,
      }

      await prisma.village.update({
        where: { id: building.villageId },
        data: {
          woodProduction: baseProduction.wood + bonuses.wood,
          stoneProduction: baseProduction.stone + bonuses.stone,
          ironProduction: baseProduction.iron + bonuses.iron,
          goldProduction: baseProduction.gold + bonuses.gold,
          foodProduction: baseProduction.food + bonuses.food,
        },
      })

      // Update population limit if Farm was upgraded
      if (building.type === "FARM") {
        const populationLimit = this.calculatePopulationLimit(village.buildings)
        await prisma.village.update({
          where: { id: building.villageId },
          data: { population: Math.min(village.population, populationLimit) },
        })
      }
    }

    // Shift queue positions
    const buildingsToShift = await prisma.building.findMany({
      where: {
        villageId: building.villageId,
        isBuilding: true,
        queuePosition: { gt: building.queuePosition || 0 },
      },
    })

    for (const b of buildingsToShift) {
      await prisma.building.update({
        where: { id: b.id },
        data: { queuePosition: (b.queuePosition || 0) - 1 },
      })
    }

    // Start next building in queue if any
    const nextBuilding = await prisma.building.findFirst({
      where: {
        villageId: building.villageId,
        isBuilding: true,
        queuePosition: 1,
      },
    })

    if (nextBuilding && nextBuilding.completionAt) {
      // Building already has completion time calculated, just mark as active
      // The game tick will handle completion
    }

    // Check for task completion after building upgrade
    await updateTaskProgress(building.village.playerId, building.villageId)
  }

  static getBuildingCosts(type: BuildingType) {
    return BUILDING_COSTS[type]
  }

  static getBuildingUpgradeTime(type: BuildingType, level: number) {
    const baseTime = BUILDING_UPGRADE_TIME[type]
    return baseTime * (1 + level * 0.1)
  }

  /**
   * Get demolition time for a building level (in seconds)
   * Demolition time is roughly half the construction time
   */
  static getDemolitionTime(type: BuildingType, level: number): number {
    const baseTime = BUILDING_UPGRADE_TIME[type]
    return Math.floor((baseTime * (1 + level * 0.1)) * 0.5) // 50% of construction time
  }

  /**
   * Calculate gold cost for instant demolition operations
   */
  static getInstantDemolitionCost(buildingLevel: number, mode: DemolitionMode): number {
    const baseCost = buildingLevel * 2 // 2 gold per level

    switch (mode) {
      case "INSTANT_COMPLETE":
        return baseCost // Cost to complete current demolition instantly
      case "FULL_BUILDING":
        return baseCost * 3 // Higher cost for instant full building demolition
      default:
        return 0
    }
  }

  /**
   * Start demolishing a building level by level (normal speed)
   */
  static async startDemolition(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (building.isBuilding) throw new Error("Cannot demolish building that is currently under construction")
    if (building.isDemolishing) throw new Error("Building is already being demolished")
    if (building.level <= 1) throw new Error("Cannot demolish the last level of a building")

    // Check if Main Building is at least level 10 (Travian requirement)
    const mainBuilding = building.village.buildings.find(b => b.type === "HEADQUARTER")
    if (!mainBuilding || mainBuilding.level < 10) {
      throw new Error("Main Building must be at least level 10 to demolish buildings")
    }

    const demolitionTime = this.getDemolitionTime(building.type as BuildingType, building.level)

    await prisma.building.update({
      where: { id: buildingId },
      data: {
        isDemolishing: true,
        demolitionAt: new Date(Date.now() + demolitionTime * 1000),
        demolitionMode: "LEVEL_BY_LEVEL",
        demolitionCost: 0,
      },
    })
  }

  /**
   * Complete current demolition instantly using gold
   */
  static async completeDemolitionInstantly(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isDemolishing) throw new Error("Building is not being demolished")

    const goldCost = this.getInstantDemolitionCost(building.level, "INSTANT_COMPLETE")

    // Check if village has enough gold
    if (building.village.gold < goldCost) {
      throw new Error(`Insufficient gold. Required: ${goldCost}, Available: ${building.village.gold}`)
    }

    // Deduct gold and complete demolition
    await prisma.village.update({
      where: { id: building.villageId },
      data: { gold: building.village.gold - goldCost },
    })

    await this.completeDemolition(buildingId)
  }

  /**
   * Demolish entire building instantly using gold
   */
  static async demolishBuildingInstantly(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (building.isBuilding) throw new Error("Cannot demolish building that is currently under construction")
    if (building.isDemolishing) throw new Error("Building is already being demolished")

    // Check if Main Building is at least level 10
    const mainBuilding = building.village.buildings.find(b => b.type === "HEADQUARTER")
    if (!mainBuilding || mainBuilding.level < 10) {
      throw new Error("Main Building must be at least level 10 to demolish buildings")
    }

    const goldCost = this.getInstantDemolitionCost(building.level, "FULL_BUILDING")

    // Check if village has enough gold
    if (building.village.gold < goldCost) {
      throw new Error(`Insufficient gold. Required: ${goldCost}, Available: ${building.village.gold}`)
    }

    // Deduct gold and demolish entire building
    await prisma.village.update({
      where: { id: building.villageId },
      data: { gold: building.village.gold - goldCost },
    })

    // Reduce building to level 1 instantly
    await prisma.building.update({
      where: { id: buildingId },
      data: {
        level: 1,
        isDemolishing: false,
        demolitionAt: null,
        demolitionMode: null,
        demolitionCost: 0,
      },
    })

    // Update production rates
    await this.updateVillageProductionRates(building.villageId)
  }

  /**
   * Complete demolition process (reduce building level by 1)
   */
  static async completeDemolition(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isDemolishing) return

    // Reduce building level by 1
    const newLevel = Math.max(1, building.level - 1)

    await prisma.building.update({
      where: { id: buildingId },
      data: {
        level: newLevel,
        isDemolishing: false,
        demolitionAt: null,
        demolitionMode: null,
        demolitionCost: 0,
      },
    })

    // Update production rates
    await this.updateVillageProductionRates(building.villageId)
  }

  /**
   * Cancel ongoing demolition
   */
  static async cancelDemolition(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isDemolishing) throw new Error("Building is not being demolished")

    // For instant operations, no refund
    if (building.demolitionMode !== "LEVEL_BY_LEVEL") {
      await prisma.building.update({
        where: { id: buildingId },
        data: {
          isDemolishing: false,
          demolitionAt: null,
          demolitionMode: null,
          demolitionCost: 0,
        },
      })
      return
    }

    // For level-by-level demolition, provide partial refund based on time remaining
    const now = new Date()
    const totalTime = building.demolitionAt ? building.demolitionAt.getTime() - building.updatedAt.getTime() : 0
    const remainingTime = building.demolitionAt ? building.demolitionAt.getTime() - now.getTime() : 0

    let refundPercentage = 0
    if (totalTime > 0) {
      refundPercentage = Math.max(0, remainingTime / totalTime)
    }

    // Refund a portion of the "virtual" resources that would be gained from demolition
    const baseCosts = BUILDING_COSTS[building.type as BuildingType]
    const refundWood = Math.floor(baseCosts.wood * refundPercentage * 0.1) // 10% of construction cost
    const refundStone = Math.floor(baseCosts.stone * refundPercentage * 0.1)
    const refundIron = Math.floor(baseCosts.iron * refundPercentage * 0.1)

    await prisma.village.update({
      where: { id: building.villageId },
      data: {
        wood: { increment: refundWood },
        stone: { increment: refundStone },
        iron: { increment: refundIron },
      },
    })

    await prisma.building.update({
      where: { id: buildingId },
      data: {
        isDemolishing: false,
        demolitionAt: null,
        demolitionMode: null,
        demolitionCost: 0,
      },
    })
  }

  /**
   * Update village production rates after building changes
   */
  private static async updateVillageProductionRates(villageId: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) return

    const bonuses = this.calculateProductionBonuses(village.buildings)

    await prisma.village.update({
      where: { id: villageId },
      data: {
        woodProduction: 10 + bonuses.wood,
        stoneProduction: 8 + bonuses.stone,
        ironProduction: 5 + bonuses.iron,
        goldProduction: 2 + bonuses.gold,
        foodProduction: 15 + bonuses.food,
      },
    })
  }
}
