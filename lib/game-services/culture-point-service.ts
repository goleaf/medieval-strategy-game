import { prisma } from "@/lib/db"
import { CONSTRUCTION_CONFIG, getLevelData, getCulturePointThreshold } from "@/lib/config/construction"
import { getBlueprintKeyForBuilding, getBlueprintKeyForResource } from "./construction-helpers"
import type { GameWorld } from "@prisma/client"

const HOURS_IN_MS = 3600 * 1000

export class CulturePointService {
  static async recalculateVillageContribution(villageId: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        player: {
          include: {
            gameWorld: true,
            villages: { select: { id: true, culturePointsPerHour: true } },
          },
        },
        buildings: { select: { type: true, level: true } },
        resourceFields: { select: { resourceType: true, level: true } },
      },
    })

    if (!village || !village.player) return

    let villageCpPerHour = 0

    for (const building of village.buildings) {
      const blueprintKey = getBlueprintKeyForBuilding(building.type)
      if (!blueprintKey) continue
      const levelData = getLevelData(blueprintKey, building.level)
      villageCpPerHour += levelData.cpPerHour
    }

    for (const field of village.resourceFields) {
      const blueprintKey = getBlueprintKeyForResource(field.resourceType)
      const levelData = getLevelData(blueprintKey, field.level)
      villageCpPerHour += levelData.cpPerHour
    }

    await prisma.village.update({
      where: { id: villageId },
      data: { culturePointsPerHour: villageCpPerHour },
    })

    await this.refreshAccount(village.player.id, village.player.gameWorld)
  }

  static async refreshAccount(playerId: string, gameWorld?: GameWorld | null): Promise<void> {
    const account = await this.ensureAccount(playerId, gameWorld)
    const now = new Date()
    const elapsedMs = now.getTime() - account.lastAccruedAt.getTime()
    const accrued = elapsedMs > 0 ? (account.perHour * elapsedMs) / HOURS_IN_MS : 0

    const villages = await prisma.village.findMany({
      where: { playerId },
      select: { culturePointsPerHour: true },
    })

    const perHour = villages.reduce((sum, v) => sum + (v.culturePointsPerHour ?? 0), 0)
    const villagesUsed = villages.length
    const total = account.total + accrued
    const villagesAllowed = this.calculateVillagesAllowed(total, Math.max(account.villagesAllowed, villagesUsed))

    await prisma.accountCulturePoint.update({
      where: { playerId },
      data: {
        total,
        perHour,
        villagesAllowed,
        villagesUsed,
        lastAccruedAt: now,
      },
    })
  }

  static async assertExpansionSlot(playerId: string, gameWorld?: GameWorld | null): Promise<void> {
    await this.refreshAccount(playerId, gameWorld)
    const account = await prisma.accountCulturePoint.findUnique({ where: { playerId } })
    if (!account) throw new Error("Unable to load culture point account")
    if (account.villagesUsed >= account.villagesAllowed) {
      const nextVillage = account.villagesUsed + 1
      const required = getCulturePointThreshold(nextVillage)
      if (required) {
        throw new Error(`Need ${required} culture points to unlock village #${nextVillage}`)
      }
      throw new Error("No free village slots available")
    }
  }

  private static calculateVillagesAllowed(total: number, current: number): number {
    let allowed = 1
    for (const threshold of CONSTRUCTION_CONFIG.culturePoints.thresholds) {
      if (total >= threshold.cpRequired) {
        allowed = Math.max(allowed, threshold.villageNumber)
      }
    }
    return Math.max(allowed, current)
  }

  private static async ensureAccount(playerId: string, gameWorld?: GameWorld | null) {
    const startingCp = gameWorld?.startingCulturePoints ?? 500
    const existingVillages = await prisma.village.count({ where: { playerId } })
    const account = await prisma.accountCulturePoint.upsert({
      where: { playerId },
      update: {},
      create: {
        playerId,
        total: startingCp,
        perHour: 0,
        villagesAllowed: 1,
        villagesUsed: Math.max(existingVillages, 1),
        lastAccruedAt: new Date(),
      },
    })
    return account
  }
}
