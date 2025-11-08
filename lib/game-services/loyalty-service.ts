import { prisma } from "@/lib/db"
import type { Building, BuildingType, TroopType, Village } from "@prisma/client"

const CONQUEST_CONFIG = {
  capitalConquerable: false,
  newOwnerStartLoyalty: 25,
  regenPerHour: 2,
  regenPauseMinutesAfterAttack: 30,
  requireCpSlotAtConquest: true,
  consumeExpansionSlotOnConquest: true,
  loyaltyFloorOnBlockedConquest: 1,
}

const DEFENDER_BUILDING_MULTIPLIER: Record<string, number> = {
  RESIDENCE: 1,
  PALACE: 0.95,
  COMMAND_CENTER: 1,
}

const ADMINISTRATOR_CONFIG: Record<
  TroopType,
  { min: number; max: number; distribution: "uniform" }
> = {
  NOBLEMAN: { min: 20, max: 35, distribution: "uniform" },
  NOMARCH: { min: 20, max: 25, distribution: "uniform" },
  LOGADES: { min: 15, max: 30, distribution: "uniform" },
  CHIEF: { min: 17, max: 28, distribution: "uniform" },
  SENATOR: { min: 20, max: 30, distribution: "uniform" },
}

export class LoyaltyService {
  static getConfig() {
    return CONQUEST_CONFIG
  }

  /**
   * Calculate the max loyalty for a village based on its admin buildings.
   */
  static calculateMaxLoyalty(buildings: Array<Pick<Building, "type" | "level">>): number {
    const hasPalace = buildings.some((b) => b.type === "PALACE" && b.level > 0)
    if (hasPalace) {
      return 125
    }

    return 100
  }

  /**
   * Get defender loyalty-hit multiplier based on admin building
   */
  static getDefenderBuildingMultiplier(buildings: Array<Pick<Building, "type" | "level">>): number {
    if (!buildings || buildings.length === 0) return 1

    if (buildings.some((b) => b.type === "PALACE" && b.level > 0)) {
      return DEFENDER_BUILDING_MULTIPLIER.PALACE
    }

    if (buildings.some((b) => b.type === "RESIDENCE" && b.level > 0)) {
      return DEFENDER_BUILDING_MULTIPLIER.RESIDENCE
    }

    if (buildings.some((b) => b.type === "COMMAND_CENTER" && b.level > 0)) {
      return DEFENDER_BUILDING_MULTIPLIER.COMMAND_CENTER
    }

    return 1
  }

  /**
   * Roll total loyalty reduction for surviving administrator units in a wave.
   */
  static rollAdministratorDamage(
    admins: Array<{ type: TroopType; count: number }>,
    defenderBuildings: Array<Pick<Building, "type" | "level">>,
  ): number {
    if (!admins.length) return 0

    const multiplier = this.getDefenderBuildingMultiplier(defenderBuildings)

    let total = 0
    for (const admin of admins) {
      const config = ADMINISTRATOR_CONFIG[admin.type]
      if (!config) continue

      for (let i = 0; i < admin.count; i += 1) {
        const roll = config.min + Math.floor(Math.random() * (config.max - config.min + 1))
        total += Math.floor(roll * multiplier)
      }
    }

    return total
  }

  /**
   * Ensure max loyalty value stays in sync with current building setup.
   */
  static async syncVillageMaxLoyalty(villageId: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) return

    const maxLoyalty = this.calculateMaxLoyalty(village.buildings)
    if (maxLoyalty === village.maxLoyalty && village.loyalty <= maxLoyalty) {
      return
    }

    const clampedLoyalty = Math.min(village.loyalty, maxLoyalty)

    await prisma.village.update({
      where: { id: villageId },
      data: {
        maxLoyalty,
        loyalty: clampedLoyalty,
        loyaltyUpdatedAt: new Date(),
      },
    })
  }

  /**
   * Process passive loyalty regeneration across all villages.
   */
  static async processRegenTick(now: Date = new Date()): Promise<void> {
    const villages = await prisma.village.findMany({
      where: {
        loyalty: { lt: 125 },
      },
      select: {
        id: true,
        loyalty: true,
        maxLoyalty: true,
        loyaltyUpdatedAt: true,
        lastLoyaltyAttackAt: true,
      },
    })

    if (!villages.length) return

    const regenPerHour = CONQUEST_CONFIG.regenPerHour
    const cooldownMinutes = CONQUEST_CONFIG.regenPauseMinutesAfterAttack
    const updates: Promise<any>[] = []

    for (const village of villages) {
      if (village.loyalty >= village.maxLoyalty) continue

      if (
        village.lastLoyaltyAttackAt &&
        now.getTime() - new Date(village.lastLoyaltyAttackAt).getTime() < cooldownMinutes * 60 * 1000
      ) {
        continue
      }

      const lastUpdate = village.loyaltyUpdatedAt ? new Date(village.loyaltyUpdatedAt) : new Date(0)
      const elapsedHours = Math.max(0, now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

      if (elapsedHours <= 0) continue

      const regenAmount = Math.floor(regenPerHour * elapsedHours)
      if (regenAmount <= 0) continue

      const newLoyalty = Math.min(village.maxLoyalty, village.loyalty + regenAmount)
      updates.push(
        prisma.village.update({
          where: { id: village.id },
          data: {
            loyalty: newLoyalty,
            loyaltyUpdatedAt: now,
          },
        }),
      )
    }

    await Promise.all(updates)
  }
}

export type AdministratorSummary = Array<{ type: TroopType; count: number }>
export { CONQUEST_CONFIG, ADMINISTRATOR_CONFIG }
