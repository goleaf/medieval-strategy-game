import { prisma } from "@/lib/db"
import { getSubsystemEffectsConfig } from "@/lib/config/subsystem-effects"
import type { Building, GameTribe } from "@prisma/client"

type CurveEntry = {
  protectedPerResource: number
  gaulBonusMultiplier: number
  teutonPenaltyPercent: number
}

const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const
type ResourceProtectionMap = Record<(typeof RESOURCE_KEYS)[number], number>

type ProtectionBreakdown = {
  base: ResourceProtectionMap
  adjusted: ResourceProtectionMap
  defenderTribe: GameTribe | null
  crannyCount: number
}

const SUBSYSTEM_EFFECTS = getSubsystemEffectsConfig()
const DEFAULT_GAUL_BONUS = SUBSYSTEM_EFFECTS.cranny.tribe_defender_mult["gauls"] ?? 1.5
const DEFAULT_TEUTON_PENALTY = (() => {
  const attackerMult = SUBSYSTEM_EFFECTS.cranny.tribe_attacker_penetration_mult["teutons"]
  if (typeof attackerMult === "number") {
    return Math.min(0.95, Math.max(0, 1 - attackerMult))
  }
  const raidFocus = SUBSYSTEM_EFFECTS.teuton_raid_focus?.cranny_penetration_multiplier
  if (typeof raidFocus === "number") {
    return Math.min(0.95, Math.max(0, 1 - raidFocus))
  }
  return 0
})()

const clamp = (value: number, min = 0, max = Number.POSITIVE_INFINITY) => Math.max(min, Math.min(max, value))
const formatMultiplier = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(2))
const GAUL_BONUS_LABEL = `${formatMultiplier(DEFAULT_GAUL_BONUS)}x capacity bonus`

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
   * Calculate total cranny protection for a village (after tribe modifiers).
   */
  static async calculateTotalProtection(villageId: string, attackerTribe?: GameTribe) {
    const breakdown = await this.getProtectionBreakdown(villageId, attackerTribe)
    return breakdown.adjusted
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
   * Provide a more detailed view of cranny protection, including base capacity before tribe modifiers.
   */
  static async getProtectionBreakdown(villageId: string, attackerTribe?: GameTribe): Promise<ProtectionBreakdown> {
    const context = await this.loadVillageCrannyContext(villageId)
    if (!context) {
      return {
        base: this.zeroProtection(),
        adjusted: this.zeroProtection(),
        defenderTribe: null,
        crannyCount: 0,
      }
    }

    if (context.crannies.length === 0) {
      return {
        base: this.zeroProtection(),
        adjusted: this.zeroProtection(),
        defenderTribe: context.defenderTribe,
        crannyCount: 0,
      }
    }

    const totals = await this.computeProtectionTotals(context.crannies, context.defenderTribe, attackerTribe)
    return {
      base: this.fillProtection(totals.base),
      adjusted: this.fillProtection(totals.adjusted),
      defenderTribe: context.defenderTribe,
      crannyCount: context.crannies.length,
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
    const totals = await this.computeProtectionTotals(crannies, village.player?.gameTribe ?? null)

    return {
      crannyCount: crannies.length,
      totalCapacity: totals.adjusted,
      tribeBonus: village.player?.gameTribe === "GAULS" ? GAUL_BONUS_LABEL : null,
    }
  }

  static getMaxCrannies(): number {
    return Infinity
  }

  static canBuildMoreCrannies(_villageId: string): Promise<boolean> {
    return Promise.resolve(true)
  }

  private static zeroProtection() {
    return this.fillProtection(0)
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

  private static async loadVillageCrannyContext(villageId: string) {
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
      return null
    }

    return {
      crannies: village.buildings as Pick<Building, "level">[],
      defenderTribe: village.player?.gameTribe ?? null,
    }
  }

  private static async computeProtectionTotals(
    crannies: Pick<Building, "level">[],
    defenderTribe: GameTribe | null,
    attackerTribe?: GameTribe,
  ) {
    await this.ensureCurveLoaded()
    let baseTotal = 0
    let adjustedTotal = 0

    for (const cranny of crannies) {
      const entry = this.curveCache?.get(cranny.level) ?? null
      const baseCapacity = entry?.protectedPerResource ?? this.calculateCrannyCapacity(cranny.level)
      baseTotal += baseCapacity

      let effective = baseCapacity
      effective = this.applyDefenderBonus(effective, defenderTribe, entry)
      effective = this.applyAttackerPenalty(effective, attackerTribe, entry)
      adjustedTotal += effective
    }

    return { base: baseTotal, adjusted: adjustedTotal }
  }

  private static applyDefenderBonus(base: number, defenderTribe: GameTribe | null, entry: CurveEntry | null) {
    if (defenderTribe === "GAULS") {
      const multiplier = entry?.gaulBonusMultiplier ?? DEFAULT_GAUL_BONUS
      return Math.floor(base * multiplier)
    }
    return base
  }

  private static applyAttackerPenalty(base: number, attackerTribe: GameTribe | undefined, entry: CurveEntry | null) {
    if (attackerTribe === "TEUTONS") {
      const penaltyShare = clamp(entry?.teutonPenaltyPercent ?? DEFAULT_TEUTON_PENALTY, 0, 0.95)
      const penaltyAmount = Math.round(base * penaltyShare)
      return clamp(base - penaltyAmount, 0, base)
    }
    return base
  }

  private static fillProtection(value: number): ResourceProtectionMap {
    return RESOURCE_KEYS.reduce(
      (acc, key) => {
        acc[key] = value
        return acc
      },
      {} as ResourceProtectionMap,
    )
  }
}
