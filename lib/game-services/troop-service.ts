import { prisma } from "@/lib/db"
import { WorldSettingsService } from "@/lib/game-services/world-settings-service"
import { EmailNotificationService } from "@/lib/notifications/email-notification-service"
import { EmailNotificationTopic, type Troop, type TroopType } from "@prisma/client"

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
  // Viking-specific units
  BERSERKER: {
    cost: { wood: 180, stone: 90, iron: 60, gold: 20, food: 400 },
    stats: { attack: 25, defense: 8, speed: 6, health: 180 },
    buildTime: 600,
  },
  VALKYRIES_BLESSING: {
    cost: { wood: 250, stone: 125, iron: 125, gold: 50, food: 200 },
    stats: { attack: 30, defense: 15, speed: 10, health: 200 },
    buildTime: 900,
  },
  JARL: {
    cost: { wood: 800, stone: 500, iron: 300, gold: 300, food: 800 },
    stats: { attack: 45, defense: 30, speed: 8, health: 400 },
    buildTime: 1800,
  },
  // Huns-specific units
  STEPPE_ARCHER: {
    cost: { wood: 120, stone: 100, iron: 150, gold: 30, food: 180 },
    stats: { attack: 30, defense: 10, speed: 14, health: 140 },
    buildTime: 600,
  },
  HUN_WARRIOR: {
    cost: { wood: 200, stone: 150, iron: 180, gold: 60, food: 240 },
    stats: { attack: 40, defense: 20, speed: 13, health: 160 },
    buildTime: 900,
  },
  LOGADES: {
    cost: { wood: 550, stone: 440, iron: 320, gold: 180, food: 600 },
    stats: { attack: 50, defense: 30, speed: 10, health: 300 },
    buildTime: 1800,
  },
  // Roman-specific units
  LEGIONNAIRE: {
    cost: { wood: 120, stone: 100, iron: 150, gold: 30, food: 300 },
    stats: { attack: 40, defense: 35, speed: 6, health: 300 },
    buildTime: 900,
  },
  PRAETORIAN: {
    cost: { wood: 200, stone: 170, iron: 250, gold: 60, food: 360 },
    stats: { attack: 30, defense: 65, speed: 8, health: 200 },
    buildTime: 1200,
  },
  IMPERIAN: {
    cost: { wood: 300, stone: 200, iron: 350, gold: 100, food: 500 },
    stats: { attack: 50, defense: 40, speed: 7, health: 250 },
    buildTime: 1500,
  },
  SENATOR: {
    cost: { wood: 800, stone: 600, iron: 400, gold: 500, food: 1000 },
    stats: { attack: 60, defense: 40, speed: 7, health: 400 },
    buildTime: 2400,
  },
  // Egyptian-specific units (defensive focus, cheap and fast training)
  NUBIAN: {
    cost: { wood: 80, stone: 40, iron: 15, gold: 0, food: 150 },
    stats: { attack: 8, defense: 12, speed: 6, health: 90 },
    buildTime: 240, // Fast training
  },
  MUMMY: {
    cost: { wood: 110, stone: 55, iron: 25, gold: 0, food: 180 },
    stats: { attack: 10, defense: 18, speed: 4, health: 120 },
    buildTime: 300, // Fast training
  },
  ANUBITE: {
    cost: { wood: 160, stone: 80, iron: 60, gold: 20, food: 220 },
    stats: { attack: 15, defense: 25, speed: 5, health: 160 },
    buildTime: 420, // Fast training
  },
  PHARAOH: {
    cost: { wood: 250, stone: 125, iron: 100, gold: 60, food: 350 },
    stats: { attack: 25, defense: 35, speed: 6, health: 220 },
    buildTime: 600, // Fast training
  },
  NOMARCH: {
    cost: { wood: 600, stone: 450, iron: 300, gold: 300, food: 800 },
    stats: { attack: 45, defense: 30, speed: 6, health: 350 },
    buildTime: 1800, // Special loyalty-reducing unit
  },
  // Teutonic-specific units (cheap, fast, high carrying capacity)
  CLUBSWINGER: {
    cost: { wood: 95, stone: 75, iron: 40, gold: 0, food: 180 },
    stats: { attack: 40, defense: 20, speed: 7, health: 200 },
    buildTime: 600,
  },
  SPEARMAN_TEUTONIC: {
    cost: { wood: 110, stone: 80, iron: 50, gold: 0, food: 200 },
    stats: { attack: 35, defense: 30, speed: 6, health: 240 },
    buildTime: 720,
  },
  AXEMAN: {
    cost: { wood: 130, stone: 85, iron: 60, gold: 0, food: 220 },
    stats: { attack: 50, defense: 25, speed: 5, health: 260 },
    buildTime: 840,
  },
  SCOUT: {
    cost: { wood: 160, stone: 100, iron: 50, gold: 0, food: 240 },
    stats: { attack: 0, defense: 10, speed: 9, health: 120 },
    buildTime: 600,
  },
  PALADIN_TEUTONIC: {
    cost: { wood: 260, stone: 140, iron: 150, gold: 50, food: 360 },
    stats: { attack: 55, defense: 35, speed: 8, health: 320 },
    buildTime: 1200,
  },
  TEUTONIC_KNIGHT: {
    cost: { wood: 320, stone: 180, iron: 200, gold: 80, food: 420 },
    stats: { attack: 70, defense: 45, speed: 6, health: 400 },
    buildTime: 1800,
  },
  CHIEF: {
    cost: { wood: 900, stone: 700, iron: 500, gold: 600, food: 1200 },
    stats: { attack: 80, defense: 50, speed: 5, health: 500 },
    buildTime: 3000,
  },
  SETTLER: {
    cost: { wood: 1500, stone: 1500, iron: 1500, gold: 0, food: 1500 },
    stats: { attack: 0, defense: 0, speed: 5, health: 150 },
    buildTime: 3600,
  },
}

const ADMIN_UNITS = new Set<TroopType>(["NOBLEMAN", "NOMARCH", "LOGADES", "CHIEF", "SENATOR"] as TroopType[])

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

    // Barracks bonus for infantry (WARRIOR, SPEARMAN, BOWMAN, NUBIAN, MUMMY, ANUBITE, PHARAOH, NOMARCH)
    const barracks = village.buildings.find((b) => b.type === "BARRACKS")
    const barracksBonus = barracks ? 1 + barracks.level * 0.1 : 1.0

    // Stables bonus for cavalry (HORSEMAN, PALADIN, EAGLE_KNIGHT, KNIGHT, VALKYRIES_BLESSING, PRAETORIAN, IMPERIAN)
    const stables = village.buildings.find((b) => b.type === "STABLES")
    const stablesBonus = stables ? 1 + stables.level * 0.1 : 1.0

    const isCavalry = ["HORSEMAN", "PALADIN", "EAGLE_KNIGHT", "KNIGHT", "VALKYRIES_BLESSING", "PRAETORIAN", "IMPERIAN"].includes(troopType)
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
    let totalBuildTime = quantity * stats.buildTime
    const adjustedBuildTime = Math.ceil(totalBuildTime / buildingBonus)

    // Apply speed scaling from game world
    const villageWithPlayer = await prisma.village.findUnique({
      where: { id: villageId },
      include: { player: { include: { gameWorld: true } } }
    })

    let finalBuildTime = adjustedBuildTime
    if (villageWithPlayer?.player?.gameWorld?.speed && villageWithPlayer.player.gameWorld.speed > 1) {
      // Speed scaling: higher speed = faster training (time divided by speed factor)
      finalBuildTime = Math.ceil(adjustedBuildTime / villageWithPlayer.player.gameWorld.speed)
    }

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
    completionAt = new Date(completionAt.getTime() + finalBuildTime * 1000)

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
      include: { building: { include: { village: { include: { player: true } } } } },
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

    await this.publishTrainingCompletion(production)
  }

  /**
   * Get total attack/defense power of a troop stack
   */
  static async calculatePower(troops: Troop[], type: "attack" | "defense", villageId?: string): Promise<number> {
    let basePower = troops.reduce((total, troop) => {
      const stat = type === "attack" ? troop.attack : troop.defense
      return total + stat * troop.quantity
    }, 0)

    // Apply Brewery bonus for Teutonic troops (only affects attack power)
    if (type === "attack" && villageId) {
      basePower = this.applyBreweryBonus(basePower, troops, villageId)
    }

    return basePower
  }

  private static async publishTrainingCompletion(
    production: {
      troopType: TroopType
      quantity: number
      building: { village: { id: string; name: string; playerId: string; x: number; y: number } }
    },
  ): Promise<void> {
    if (!ADMIN_UNITS.has(production.troopType)) return
    const village = production.building.village
    if (!village?.playerId) return

    const message = await prisma.message.create({
      data: {
        senderId: village.playerId,
        villageId: village.id,
        type: "TRAINING_COMPLETE",
        subject: `${production.troopType} ready in ${village.name}`,
        content: JSON.stringify({
          unitType: production.troopType,
          quantity: production.quantity,
          villageId: village.id,
          villageName: village.name,
          completedAt: new Date().toISOString(),
        }),
      },
    })

    await EmailNotificationService.queueEvent({
      playerId: village.playerId,
      topic: EmailNotificationTopic.TRAINING_COMPLETE,
      payload: {
        unitType: production.troopType,
        quantity: production.quantity,
        village: {
          id: village.id,
          name: village.name,
          x: village.x,
          y: village.y,
        },
      },
      linkTarget: `/village/${village.id}/rally-point`,
      messageId: message.id,
    })
  }

  /**
   * Apply Brewery attack bonus to Teutonic troops
   */
  private static async applyBreweryBonus(basePower: number, troops: Troop[], villageId: string): Promise<number> {
    try {
      const { prisma } = await import("@/lib/db")
      const village = await prisma.village.findUnique({
        where: { id: villageId },
        include: { buildings: true },
      })

      if (!village) return basePower

      const brewery = village.buildings.find(b => b.type === "BREWERY")
      if (!brewery) return basePower

      // Check if troops include any Teutonic units
      const teutonicTroops = troops.filter(t =>
        ["CLUBSWINGER", "SPEARMAN_TEUTONIC", "AXEMAN", "SCOUT", "PALADIN_TEUTONIC", "TEUTONIC_KNIGHT", "CHIEF"].includes(t.type)
      )

      if (teutonicTroops.length === 0) return basePower

      // Apply 5% attack bonus per Brewery level
      const bonusMultiplier = 1 + (brewery.level * 0.05)
      return Math.floor(basePower * bonusMultiplier)
    } catch (error) {
      console.error("Error applying Brewery bonus:", error)
      return basePower
    }
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
