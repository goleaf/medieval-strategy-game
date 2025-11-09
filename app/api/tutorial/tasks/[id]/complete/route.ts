import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

async function applyReward(playerId: string, reward: any) {
  if (!reward || typeof reward !== "object") return
  const updates: any = {}
  if (typeof reward.premiumPoints === "number" && reward.premiumPoints > 0) {
    updates.premiumPoints = { increment: Math.floor(reward.premiumPoints) }
  }
  if (Object.keys(updates).length) {
    await prisma.player.update({ where: { id: playerId }, data: updates })
  }
  // Simple resource reward to the first village
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { playerId } = await req.json()
    if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 })

    const task = await prisma.tutorialTask.findUnique({ where: { id: params.id } })
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const progress = await prisma.playerTaskProgress.upsert({
      where: { playerId_taskId: { playerId, taskId: task.id } },
      update: { status: "COMPLETED", completedAt: new Date() },
      create: { playerId, taskId: task.id, status: "COMPLETED", completedAt: new Date() },
    })

    // Apply reward once per completion
    if (task.reward) {
      await applyReward(playerId, task.reward)
    }

    return NextResponse.json({ success: true, data: { progressId: progress.id } }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 })
  }
}
