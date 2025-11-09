import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

const DEFAULT_QUESTS = [
  {
    key: "getting_started",
    title: "Getting Started",
    description: "Learn the basics and secure your village.",
    order: 1,
    tasks: [
      { key: "build_timber_2", title: "Build Timber Camp to level 2", order: 1, reward: { wood: 200, stone: 100 } },
      { key: "recruit_10_spears", title: "Recruit 10 Spearmen", order: 2, reward: { iron: 150, food: 200 } },
      { key: "send_first_attack", title: "Send your first attack (barbarian)", order: 3, reward: { premiumPoints: 5 } },
      { key: "join_tribe", title: "Join a tribe", order: 4, reward: { gold: 50 } },
    ],
  },
]

async function ensureDefaults() {
  for (const q of DEFAULT_QUESTS) {
    const quest = await prisma.tutorialQuest.upsert({
      where: { key: q.key },
      update: { title: q.title, description: q.description ?? null, order: q.order, isActive: true },
      create: { key: q.key, title: q.title, description: q.description ?? null, order: q.order, isActive: true },
    })
    for (const t of q.tasks) {
      await prisma.tutorialTask.upsert({
        where: { key: t.key },
        update: { questId: quest.id, title: t.title, order: t.order, reward: t.reward as any, isActive: true },
        create: { key: t.key, questId: quest.id, title: t.title, order: t.order, reward: t.reward as any, isActive: true },
      })
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 })

    await ensureDefaults()

    const quests = await prisma.tutorialQuest.findMany({
      where: { isActive: true },
      include: { tasks: { where: { isActive: true }, orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    })

    // Fetch progress map
    const taskIds = quests.flatMap((q) => q.tasks.map((t) => t.id))
    const progress = await prisma.playerTaskProgress.findMany({ where: { playerId, taskId: { in: taskIds } } })
    const progressMap = new Map(progress.map((p) => [p.taskId, p]))

    const payload = quests.map((q) => ({
      id: q.id,
      key: q.key,
      title: q.title,
      description: q.description,
      order: q.order,
      tasks: q.tasks.map((t) => ({
        id: t.id,
        key: t.key,
        title: t.title,
        description: t.description,
        order: t.order,
        reward: t.reward,
        progress: progressMap.get(t.id) ?? null,
      })),
    }))

    return NextResponse.json({ success: true, data: payload }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tutorial quests" }, { status: 500 })
  }
}
