import { prisma } from "@/lib/db"
import type { Building, GameTribe } from "@prisma/client"

export class CrannyService {
  /**
   * Calculate the protection capacity of a single cranny at a given level
   */
  static calculateCrannyCapacity(level: number): number {
    if (level <= 0) return 0

    // Level 1: 200, Level 10: 2000
    // Linear scaling: 200 + (level-1) * 200
    return 200 + (level - 1) * 200
  }

  /**
   * Calculate total cranny protection for a village, including tribe bonuses
   */
  static async calculateTotalProtection(villageId: string, attackerTribe?: GameTribe): Promise<{
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  }> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        buildings: {
          where: { type: "CRANNY" as const }
        },
        player: {
          include: {
            tribe: true
          }
        }
      }
    })

    if (!village) {
      return { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }
    }

    const crannies = village.buildings.filter(b => b.type === ("CRANNY" as const))
    const defenderTribe = village.player.tribe?.name

    let totalCapacity = 0

    for (const cranny of crannies) {
      let capacity = this.calculateCrannyCapacity(cranny.level)

      // Gaul bonus: 1.5x capacity
      if (defenderTribe === "GAULS") {
        capacity = Math.floor(capacity * 1.5)
      }

      // Teutonic hero plunder bonus: reduce enemy cranny effectiveness by 80% when hero joins raid
      // This represents the +20% cranny dip bonus - Teutons can plunder more from enemy crannies
      if (attackerTribe === "TEUTONS") {
        // TODO: Check if attacker has a hero that participated in this specific attack
        // For now, apply the bonus when the attacker tribe is Teutons
        // In a full implementation, this would check if the hero was included in the attack
        capacity = Math.floor(capacity * 0.2) // 80% reduction = +20% plunder bonus
      }

      totalCapacity += capacity
    }

    // Protection is applied equally to all resource types
    return {
      wood: totalCapacity,
      stone: totalCapacity,
      iron: totalCapacity,
      gold: totalCapacity,
      food: totalCapacity,
    }
  }

  /**
   * Calculate effective lootable resources after cranny protection
   */
  static calculateEffectiveLoot(
    defenderStorage: { wood: number; stone: number; iron: number; gold: number; food: number },
    crannyProtection: { wood: number; stone: number; iron: number; gold: number; food: number }
  ): { wood: number; stone: number; iron: number; gold: number; food: number } {
    return {
      wood: Math.max(0, defenderStorage.wood - crannyProtection.wood),
      stone: Math.max(0, defenderStorage.stone - crannyProtection.stone),
      iron: Math.max(0, defenderStorage.iron - crannyProtection.iron),
      gold: Math.max(0, defenderStorage.gold - crannyProtection.gold),
      food: Math.max(0, defenderStorage.food - crannyProtection.food),
    }
  }

  /**
   * Get cranny information for scouting reports
   */
  static async getCrannyInfo(villageId: string): Promise<{
    crannyCount: number
    totalCapacity: number
    tribeBonus: string | null
  }> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        buildings: {
          where: { type: "CRANNY" as const }
        },
        player: {
          include: {
            tribe: true
          }
        }
      }
    })

    if (!village) {
      return { crannyCount: 0, totalCapacity: 0, tribeBonus: null }
    }

    const crannies = village.buildings.filter(b => b.type === ("CRANNY" as const))
    const crannyCount = crannies.length
    const defenderTribe = village.player.tribe?.name

    let totalCapacity = 0
    for (const cranny of crannies) {
      let capacity = this.calculateCrannyCapacity(cranny.level)
      if (defenderTribe === "GAULS") {
        capacity = Math.floor(capacity * 1.5)
      }
      totalCapacity += capacity
    }

    let tribeBonus = null
    if (defenderTribe === "GAULS") {
      tribeBonus = "1.5x capacity bonus"
    }

    return {
      crannyCount,
      totalCapacity,
      tribeBonus,
    }
  }

  /**
   * Get maximum number of crannies allowed per village
   * In Travian, there's no limit to how many crannies you can build
   */
  static getMaxCrannies(): number {
    return Infinity // No limit
  }

  /**
   * Check if a village can build more crannies
   */
  static canBuildMoreCrannies(villageId: string): Promise<boolean> {
    // Since there's no limit, always return true
    // But we could add logic here for game balance if needed
    return Promise.resolve(true)
  }
}
