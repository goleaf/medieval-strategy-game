import { prisma } from "@/lib/db"
import type { BuildingType } from "@prisma/client"

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
}

const CONSTRUCTION_REFUND_PERCENTAGE = 0.5 // 50% refund on cancel

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

    // Calculate completion time
    const completionTime = BUILDING_UPGRADE_TIME[building.type as BuildingType] * (1 + building.level * 0.1)
    
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
   * Cancel building construction with refund
   */
  static async cancelBuilding(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isBuilding || building.queuePosition === null) {
      throw new Error("Building is not under construction")
    }

    // Calculate refund
    const refund = {
      wood: Math.floor(building.constructionCostWood * CONSTRUCTION_REFUND_PERCENTAGE),
      stone: Math.floor(building.constructionCostStone * CONSTRUCTION_REFUND_PERCENTAGE),
      iron: Math.floor(building.constructionCostIron * CONSTRUCTION_REFUND_PERCENTAGE),
      gold: Math.floor(building.constructionCostGold * CONSTRUCTION_REFUND_PERCENTAGE),
      food: Math.floor(building.constructionCostFood * CONSTRUCTION_REFUND_PERCENTAGE),
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
      include: { village: true },
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
  }

  static getBuildingCosts(type: BuildingType) {
    return BUILDING_COSTS[type]
  }

  static getBuildingUpgradeTime(type: BuildingType, level: number) {
    const baseTime = BUILDING_UPGRADE_TIME[type]
    return baseTime * (1 + level * 0.1)
  }
}
