import { prisma } from "@/lib/db"
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/config/achievements"
import { AchievementCategory, AchievementStatus, AchievementProgressMode } from "@prisma/client"

export type PlayerAchievementView = {
  key: string
  title: string
  description?: string | null
  category: AchievementCategory
  status: AchievementStatus
  progress: number
  target: number
  favorite: boolean
  unlockedAt?: string | null
  claimedAt?: string | null
  rarity: "COMMON" | "RARE" | "LEGENDARY"
  reward?: { premiumPoints?: number; badgeKey?: string | null; title?: string | null }
}

export class AchievementService {
  static async syncDefinitions() {
    for (const def of ACHIEVEMENTS) {
      await prisma.achievementDefinition.upsert({
        where: { key: def.key },
        update: {
          title: def.title,
          description: def.description || null,
          category: def.category,
          progressMode: def.mode ?? AchievementProgressMode.METRIC,
          targetValue: def.target,
          rewardPremiumPoints: def.reward?.premiumPoints ?? 0,
          rewardBadgeKey: def.reward?.badgeKey ?? null,
          rewardTitle: def.reward?.title ?? null,
        },
        create: {
          key: def.key,
          title: def.title,
          description: def.description || null,
          category: def.category,
          progressMode: def.mode ?? AchievementProgressMode.METRIC,
          targetValue: def.target,
          rewardPremiumPoints: def.reward?.premiumPoints ?? 0,
          rewardBadgeKey: def.reward?.badgeKey ?? null,
          rewardTitle: def.reward?.title ?? null,
        },
      })
    }
  }

  static rarityFromCompletionRatio(ratio: number): "COMMON" | "RARE" | "LEGENDARY" {
    if (ratio >= 0.2) return "COMMON"
    if (ratio >= 0.05) return "RARE"
    return "LEGENDARY"
  }

  static async getPlayerAchievements(playerId: string): Promise<PlayerAchievementView[]> {
    await this.syncDefinitions()
    const [defs, pa, playerCount] = await Promise.all([
      prisma.achievementDefinition.findMany(),
      prisma.playerAchievement.findMany({ where: { playerId } }),
      prisma.player.count(),
    ])

    const completionCounts = await prisma.playerAchievement.groupBy({
      by: ["achievementId"],
      where: { OR: [{ status: AchievementStatus.COMPLETED }, { status: AchievementStatus.CLAIMED }] },
      _count: { _all: true },
    })
    const countMap = new Map(completionCounts.map((c) => [c.achievementId, c._count._all]))

    const views: PlayerAchievementView[] = []
    for (const def of defs) {
      const row = pa.find((r) => r.achievementId === def.id)
      const completedCount = countMap.get(def.id) ?? 0
      const ratio = playerCount > 0 ? completedCount / playerCount : 0
      const rarity = this.rarityFromCompletionRatio(ratio)
      views.push({
        key: def.key,
        title: def.title,
        description: def.description,
        category: def.category,
        status: row?.status ?? AchievementStatus.LOCKED,
        progress: row?.progress ?? 0,
        target: def.targetValue,
        favorite: row?.favorite ?? false,
        unlockedAt: row?.unlockedAt ? row.unlockedAt.toISOString() : null,
        claimedAt: row?.claimedAt ? row.claimedAt.toISOString() : null,
        rarity,
        reward: { premiumPoints: def.rewardPremiumPoints, badgeKey: def.rewardBadgeKey, title: def.rewardTitle },
      })
    }
    return views
  }

  static async recordMetric(playerId: string, key: string, amount: number, mode: "increment" | "setMax" = "increment") {
    const def = await prisma.achievementDefinition.findUnique({ where: { key } })
    if (!def) return null
    let current = await prisma.playerAchievement.findUnique({ where: { playerId_achievementId: { playerId, achievementId: def.id } } })
    if (!current) {
      current = await prisma.playerAchievement.create({ data: { playerId, achievementId: def.id, progress: Math.max(0, amount), bestProgress: Math.max(0, amount) } })
    } else {
      if (mode === "increment") {
        current = await prisma.playerAchievement.update({ where: { id: current.id }, data: { progress: { increment: amount } } })
      } else {
        const next = Math.max(rowOrZero(current.progress), amount)
        if (next !== current.progress) {
          current = await prisma.playerAchievement.update({ where: { id: current.id }, data: { progress: next } })
        }
      }
    }
    // Update bestProgress
    if (current.progress > (current.bestProgress ?? 0)) {
      await prisma.playerAchievement.update({ where: { id: current.id }, data: { bestProgress: current.progress } })
    }
    // Unlock if reached target
    if (current.progress >= def.targetValue) {
      if (current.status !== AchievementStatus.CLAIMED && current.status !== AchievementStatus.COMPLETED) {
        await prisma.playerAchievement.update({ where: { id: current.id }, data: { status: AchievementStatus.COMPLETED, unlockedAt: new Date() } })
      }
    } else if (current.progress > 0 && current.status === AchievementStatus.LOCKED) {
      await prisma.playerAchievement.update({ where: { id: current.id }, data: { status: AchievementStatus.IN_PROGRESS } })
    }
    return current
  }

  static async claim(playerId: string, key: string) {
    const def = await prisma.achievementDefinition.findUnique({ where: { key } })
    if (!def) throw new Error("Achievement not found")
    const row = await prisma.playerAchievement.findUnique({ where: { playerId_achievementId: { playerId, achievementId: def.id } } })
    if (!row || (row.status !== AchievementStatus.COMPLETED && row.status !== AchievementStatus.CLAIMED)) {
      throw new Error("Achievement not completed")
    }
    if (!row.claimedAt) {
      await prisma.$transaction(async (tx) => {
        // Grant premium points
        if (def.rewardPremiumPoints > 0) {
          await tx.player.update({ where: { id: playerId }, data: { premiumPoints: { increment: def.rewardPremiumPoints } } })
        }
        // Grant badge
        if (def.rewardBadgeKey) {
          await tx.playerBadge.upsert({
            where: { playerId_badgeKey: { playerId, badgeKey: def.rewardBadgeKey } },
            update: { title: def.rewardTitle ?? def.title },
            create: {
              playerId,
              badgeKey: def.rewardBadgeKey,
              title: def.rewardTitle ?? def.title,
              description: def.description ?? null,
              category: "PROGRESSION",
            },
          })
        }
        await tx.playerAchievement.update({ where: { id: row.id }, data: { status: AchievementStatus.CLAIMED, claimedAt: new Date() } })
      })
    }
    return { ok: true }
  }

  static async setFavorite(playerId: string, key: string, favorite: boolean) {
    const def = await prisma.achievementDefinition.findUnique({ where: { key } })
    if (!def) throw new Error("Achievement not found")
    await prisma.playerAchievement.upsert({
      where: { playerId_achievementId: { playerId, achievementId: def.id } },
      update: { favorite },
      create: { playerId, achievementId: def.id, favorite },
    })
    return { ok: true }
  }
}

function rowOrZero(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0
}
