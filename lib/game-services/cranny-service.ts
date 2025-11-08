import { prisma } from "@/lib/db"
import type { Building, GameTribe } from "@prisma/client"

type CurveEntry = {
  protectedPerResource: number
  gaulBonusMultiplier: number
  teutonPenaltyPercent: number
}

const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const

export class CrannyService {
  private static curveCache: Map<number, CurveEntry> | null = null

  static async refreshCurve() {
    this.curveCache = null
    await this.ensureCurveLoaded()
  }

  /**
   * Calculate the protection capacity of a single cranny at a given level.
   * This synchronous helper is used by UI components that cannot await Prisma.
   */
  static calculateCrannyCapacity(level: number): number {
    if (level <= 0) return 0
    return 200 + (level - 1) * 200
  }

  /**
   * Calculate total cranny protection for a village.
   */
  static async calculateTotalProtection(villageId: string, attackerTribe?: GameTribe) {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        buildings: {
          where: { type: "CRANNY" },
          select: { id: true, level: true },
        },
        player: {
          select: { gameTribe: true },
        },
      },
    })

    if (!village) {
      return this.zeroProtection()
    }

    const crannies = village.buildings as Pick<Building, "level">[]
    if (crannies.length === 0) {
      return this.zeroProtection()
    }

    const totalCapacity = await this.computeProtection(crannies, village.player?.gameTribe ?? null, attackerTribe)

    return {
      wood: totalCapacity,
      stone: totalCapacity,
      iron: totalCapacity,
      gold: totalCapacity,
      food: totalCapacity,
    }
  }

  /**
   * Calculate effective lootable resources after cranny protection.
   */
  static calculateEffectiveLoot(
    defenderStorage: { wood: number; stone: number; iron: number; gold: number; food: number },
    crannyProtection: { wood: number; stone: number; iron: number; gold: number; food: number },
  ) {
    return {
      wood: Math.max(0, defenderStorage.wood - crannyProtection.wood),
      stone: Math.max(0, defenderStorage.stone - crannyProtection.stone),
      iron: Math.max(0, defenderStorage.iron - crannyProtection.iron),
      gold: Math.max(0, defenderStorage.gold - crannyProtection.gold),
      food: Math.max(0, defenderStorage.food - crannyProtection.food),
    }
  }

  /**
   * Provide scouting data for UI/reporting.
   */
  static async getCrannyInfo(villageId: string) {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        buildings: {
          where: { type: "CRANNY" },
          select: { id: true, level: true },
        },
        player: {
          select: { gameTribe: true },
        },
      },
    })

    if (!village) {
      return { crannyCount: 0, totalCapacity: 0, tribeBonus: null }
    }

    const crannies = village.buildings as Pick<Building, "level">[]
    const totalCapacity = await this.computeProtection(crannies, village.player?.gameTribe ?? null)

    return {
      crannyCount: crannies.length,
      totalCapacity,
      tribeBonus: village.player?.gameTribe === "GAULS" ? "1.5x capacity bonus" : null,
    }
  }

  static getMaxCrannies(): number {
    return Infinity
  }

  static canBuildMoreCrannies(_villageId: string): Promise<boolean> {
    return Promise.resolve(true)
  }

  private static zeroProtection() {
    return RESOURCE_KEYS.reduce(
      (acc, key) => {
        acc[key] = 0
        return acc
      },
      {} as Record<(typeof RESOURCE_KEYS)[number], number>,
    )
  }

  private static async ensureCurveLoaded() {
    if (this.curveCache) return
    const entries = await prisma.crannyProtectionCurve.findMany()
    this.curveCache = new Map()
    for (const entry of entries) {
      this.curveCache.set(entry.level, {
        protectedPerResource: entry.protectedPerResource,
        gaulBonusMultiplier: entry.gaulBonusMultiplier,
        teutonPenaltyPercent: entry.teutonPenaltyPercent,
      })
    }
  }

  private static async computeProtection(crannies: Pick<Building, "level">[], defenderTribe: GameTribe | null, attackerTribe?: GameTribe) {
    await this.ensureCurveLoaded()
    let total = 0

    for (const cranny of crannies) {
      const entry = this.curveCache?.get(cranny.level) ?? null
      let capacity = entry?.protectedPerResource ?? this.calculateCrannyCapacity(cranny.level)
      capacity = this.applyDefenderBonus(capacity, defenderTribe, entry)
      capacity = this.applyAttackerPenalty(capacity, attackerTribe, entry)
      total += capacity
    }

    return total
  }

  private static applyDefenderBonus(base: number, defenderTribe: GameTribe | null, entry: CurveEntry | null) {
    if (defenderTribe === "GAULS") {
      const multiplier = entry?.gaulBonusMultiplier ?? 1.5
      return Math.floor(base * multiplier)
    }
    return base
  }

  private static applyAttackerPenalty(base: number, attackerTribe: GameTribe | undefined, entry: CurveEntry | null) {
    if (attackerTribe === "TEUTONS") {
      const penetration = Math.min(0.95, Math.max(0, entry?.teutonPenaltyPercent ?? 0.8))
      return Math.floor(base * (1 - penetration))
    }
    return base
  }
}
