import { prisma } from "@/lib/db"
import { applyTutorialReward } from "./rewards"

async function completeTaskByKey(playerId: string, key: string) {
  const task = await prisma.tutorialTask.findUnique({ where: { key } })
  if (!task) return false
  const existing = await prisma.playerTaskProgress.findUnique({ where: { playerId_taskId: { playerId, taskId: task.id } } })
  if (existing?.status === "COMPLETED" || existing?.status === "REWARDED") return false
  await prisma.playerTaskProgress.upsert({
    where: { playerId_taskId: { playerId, taskId: task.id } },
    update: { status: "COMPLETED", completedAt: new Date() },
    create: { playerId, taskId: task.id, status: "COMPLETED", completedAt: new Date() },
  })
  if (task.reward) {
    await applyTutorialReward(playerId, task.reward as any)
  }
  try {
    const { NotificationService } = await import("@/lib/game-services/notification-service")
    await NotificationService.emit({
      playerId,
      type: "GAME_UPDATE",
      priority: "LOW",
      title: "Quest complete",
      message: task.title,
      actionUrl: "/tutorial",
      metadata: { tutorialTaskKey: key },
    })
  } catch {}
  return true
}

export const TutorialProgress = {
  async maybeCompleteOnBuilding(playerId: string, villageId: string, buildingType: string, newLevel: number) {
    if (buildingType === "SAWMILL" && newLevel >= 2) {
      await completeTaskByKey(playerId, "build_timber_2")
    }
  },

  async maybeCompleteOnTraining(playerId: string) {
    // Count total spears across all villages
    const total = await prisma.troop.aggregate({
      _sum: { quantity: true },
      where: {
        village: { playerId },
        OR: [{ type: "SPEARMAN" }, { type: "SPEARMAN_TEUTONIC" }],
      },
    })
    const count = total._sum.quantity || 0
    if (count >= 10) {
      await completeTaskByKey(playerId, "recruit_10_spears")
    }
  },

  async maybeCompleteOnAttack(playerId: string) {
    await completeTaskByKey(playerId, "send_first_attack")
  },

  async maybeCompleteOnJoinTribe(playerId: string) {
    await completeTaskByKey(playerId, "join_tribe")
  },
}

