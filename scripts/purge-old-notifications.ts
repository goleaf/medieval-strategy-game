#!/usr/bin/env ts-node
import { prisma } from "@/lib/db"

async function main() {
  const players = await prisma.player.findMany({
    select: { id: true, notificationPreferences: true },
    include: { notificationPreferences: true },
  })

  let totalDeleted = 0
  const now = Date.now()

  for (const p of players) {
    const retentionDays = p.notificationPreferences?.retentionDays ?? 90
    const cutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000)
    const result = await prisma.playerNotification.deleteMany({
      where: { playerId: p.id, createdAt: { lt: cutoff } },
    })
    totalDeleted += result.count
  }

  console.log(`Purged ${totalDeleted} old notifications.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

