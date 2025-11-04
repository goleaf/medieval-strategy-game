import { prisma } from "@/lib/db"
import type { Troop, TroopType } from "@prisma/client"

const TROOP_STATS: Record<TroopType, { cost: Record<string, number>; stats: Record<string, number>; buildTime: number }> = {
  WARRIOR: {
    cost: { wood: 100, stone: 50, iron: 20, gold: 0, food: 200 },
    stats: { attack: 10, defense: 5, speed: 5, health: 100 },
    buildTime: 300, // seconds
  },
  SPEARMAN: {
    cost: { wood: 120, stone: 60, iron: 40, gold: 0, food: 220 },
    stats: { attack: 12, defense: 8, speed: 4, health: 120 },
    buildTime: 360,
  },
  BOWMAN: {
    cost: { wood: 140, stone: 70, iron: 20, gold: 10, food: 240 },
    stats: { attack: 15, defense: 3, speed: 6, health: 80 },
    buildTime: 420,
  },
  HORSEMAN: {
    cost: { wood: 200, stone: 100, iron: 100, gold: 40, food: 300 },
    stats: { attack: 20, defense: 10, speed: 10, health: 150 },
    buildTime: 600,
  },
  PALADIN: {
    cost: { wood: 300, stone: 150, iron: 200, gold: 100, food: 400 },
    stats: { attack: 35, defense: 20, speed: 8, health: 250 },
    buildTime: 900,
  },
  EAGLE_KNIGHT: {
    cost: { wood: 250, stone: 120, iron: 150, gold: 80, food: 350 },
    stats: { attack: 30, defense: 15, speed: 12, health: 180 },
    buildTime: 720,
  },
  RAM: {
    cost: { wood: 500, stone: 300, iron: 200, gold: 0, food: 500 },
    stats: { attack: 5, defense: 30, speed: 2, health: 500 },
    buildTime: 1200,
  },
  CATAPULT: {
    cost: { wood: 600, stone: 400, iron: 300, gold: 100, food: 600 },
    stats: { attack: 50, defense: 10, speed: 1, health: 300 },
    buildTime: 1500,
  },
  KNIGHT: {
    cost: { wood: 350, stone: 180, iron: 250, gold: 120, food: 450 },
    stats: { attack: 40, defense: 25, speed: 9, health: 300 },
    buildTime: 1080,
  },
  NOBLEMAN: {
    cost: { wood: 1000, stone: 600, iron: 400, gold: 500, food: 1000 },
    stats: { attack: 60, defense: 40, speed: 7, health: 500 },
    buildTime: 2400,
  },
}

export class TroopService {
  /**
   * Get building bonus for training speed
   * Barracks and Stables provide training speed bonuses
   */
  static async getTrainingBonus(villageId: string, troopType: TroopType): Promise<number> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) return 1.0

    // Barracks bonus for infantry (WARRIOR, SPEARMAN, BOWMAN)
    const barracks = village.buildings.find((b) => b.type === "BARRACKS")
    const barracksBonus = barracks ? 1 + barracks.level * 0.1 : 1.0

    // Stables bonus for cavalry (HORSEMAN, PALADIN, EAGLE_KNIGHT, KNIGHT)
    const stables = village.buildings.find((b) => b.type === "STABLES")
    const stablesBonus = stables ? 1 + stables.level * 0.1 : 1.0

    const isCavalry = ["HORSEMAN", "PALADIN", "EAGLE_KNIGHT", "KNIGHT"].includes(troopType)
    return isCavalry ? stablesBonus : barracksBonus
  }

  /**
   * Train troops in batches
   * Time = sum(quantity * unit.build_time) / buildings bonus
   */
  static async trainTroops(villageId: string, troopType: TroopType, quantity: number): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { troops: true, buildings: true },
    })

    if (!village) throw new Error("Village not found")

    const stats = TROOP_STATS[troopType]
    const totalCost = {
      wood: stats.cost.wood * quantity,
      stone: stats.cost.stone * quantity,
      iron: stats.cost.iron * quantity,
      gold: stats.cost.gold * quantity,
      food: stats.cost.food * quantity,
    }

    // Check resources
    if (
      village.wood < totalCost.wood ||
      village.stone < totalCost.stone ||
      village.iron < totalCost.iron ||
      village.gold < totalCost.gold ||
      village.food < totalCost.food
    ) {
      throw new Error("Insufficient resources")
    }

    // Check if building exists (Barracks for infantry, Stables for cavalry)
    const isCavalry = ["HORSEMAN", "PALADIN", "EAGLE_KNIGHT", "KNIGHT"].includes(troopType)
    const requiredBuilding = isCavalry
      ? village.buildings.find((b) => b.type === "STABLES")
      : village.buildings.find((b) => b.type === "BARRACKS")

    if (!requiredBuilding) {
      throw new Error(`Required building not found: ${isCavalry ? "Stables" : "Barracks"}`)
    }

    // Deduct resources immediately
    await prisma.village.update({
      where: { id: villageId },
      data: {
        wood: village.wood - totalCost.wood,
        stone: village.stone - totalCost.stone,
        iron: village.iron - totalCost.iron,
        gold: village.gold - totalCost.gold,
        food: village.food - totalCost.food,
      },
    })

    // Calculate training time: sum(quantity * unit.build_time) / buildings bonus
    const buildingBonus = await this.getTrainingBonus(villageId, troopType)
    const totalBuildTime = quantity * stats.buildTime
    const adjustedBuildTime = Math.ceil(totalBuildTime / buildingBonus)

    // Find next completion time (check existing productions)
    const existingProductions = await prisma.troopProduction.findMany({
      where: { building: { villageId } },
      orderBy: { completionAt: "desc" },
      take: 1,
    })

    let completionAt = new Date()
    if (existingProductions.length > 0) {
      completionAt = existingProductions[0].completionAt
    }
    completionAt = new Date(completionAt.getTime() + adjustedBuildTime * 1000)

    // Create troop production entry
    await prisma.troopProduction.create({
      data: {
        buildingId: requiredBuilding.id,
        troopType,
        quantity,
        completionAt,
      },
    })
  }

  /**
   * Complete troop training and add to village
   */
  static async completeTroopTraining(productionId: string): Promise<void> {
    const production = await prisma.troopProduction.findUnique({
      where: { id: productionId },
      include: { building: { include: { village: true } } },
    })

    if (!production) return

    const stats = TROOP_STATS[production.troopType]

    // Add troops to village
    const existingTroop = await prisma.troop.findUnique({
      where: { villageId_type: { villageId: production.building.villageId, type: production.troopType } },
    })

    if (existingTroop) {
      await prisma.troop.update({
        where: { id: existingTroop.id },
        data: { quantity: existingTroop.quantity + production.quantity },
      })
    } else {
      await prisma.troop.create({
        data: {
          villageId: production.building.villageId,
          type: production.troopType,
          quantity: production.quantity,
          ...stats.stats,
        },
      })
    }

    // Remove production entry
    await prisma.troopProduction.delete({
      where: { id: productionId },
    })
  }

  /**
   * Get total attack/defense power of a troop stack
   */
  static calculatePower(troops: Troop[], type: "attack" | "defense"): number {
    return troops.reduce((total, troop) => {
      const stat = type === "attack" ? troop.attack : troop.defense
      return total + stat * troop.quantity
    }, 0)
  }

  /**
   * Get troop stats by type
   */
  static getTroopStats(troopType: TroopType) {
    return TROOP_STATS[troopType]
  }

  /**
   * Get troop build time
   */
  static getTroopBuildTime(troopType: TroopType): number {
    return TROOP_STATS[troopType].buildTime
  }
}
