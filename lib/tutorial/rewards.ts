import { prisma } from "@/lib/db"

export async function applyTutorialReward(playerId: string, reward: any) {
  if (!reward || typeof reward !== "object") return
  const updates: any = {}
  if (typeof reward.premiumPoints === "number" && reward.premiumPoints > 0) {
    updates.premiumPoints = { increment: Math.floor(reward.premiumPoints) }
  }
  if (Object.keys(updates).length) {
    await prisma.player.update({ where: { id: playerId }, data: updates })
  }
  const village = await prisma.village.findFirst({ where: { playerId }, orderBy: { createdAt: "asc" } })
  if (!village) return
  const resUpdates: any = {}
  for (const k of ["wood", "stone", "iron", "gold", "food"]) {
    const v = (reward as any)[k]
    if (typeof v === "number" && v > 0) {
      resUpdates[k] = { increment: Math.floor(v) }
    }
  }
  if (Object.keys(resUpdates).length) {
    await prisma.village.update({ where: { id: village.id }, data: resUpdates })
  }
}

