import { prisma } from "@/lib/db"
import { AchievementService } from "@/lib/game-services/achievement-service"
import { EventStatus, EventType, EventScope } from "@prisma/client"

async function main() {
  console.log("[seed-events] syncing achievement definitions…")
  await AchievementService.syncDefinitions()

  // Pick a world
  const world = await prisma.gameWorld.findFirst({ orderBy: { createdAt: "desc" } })
  if (!world) {
    throw new Error("No GameWorld found. Seed a world first.")
  }
  console.log(`[seed-events] targeting world ${world.worldName} (${world.worldCode})`)

  const now = new Date()
  const inHours = (h: number) => new Date(now.getTime() + h * 3600 * 1000)

  // Upsert three events: points race, conquest challenge, OD tournament
  const events = [] as any[]

  events.push(
    await prisma.worldEvent.upsert({
      where: { id: (await findByName(world.id, "Weekend Points Race"))?.id || "__none__" },
      update: {
        type: EventType.POINT_RACE,
        scope: EventScope.PLAYER,
        status: EventStatus.ACTIVE,
        startsAt: inHours(-1),
        endsAt: inHours(47),
        rules: { metric: "pointsGained", description: "Most points gained during the weekend." },
        rewards: { 1: "+250 PP", 2: "+100 PP", 3: "+50 PP" },
      },
      create: {
        gameWorldId: world.id,
        type: EventType.POINT_RACE,
        scope: EventScope.PLAYER,
        name: "Weekend Points Race",
        description: "Most points gained in 48h wins premium rewards.",
        status: EventStatus.ACTIVE,
        startsAt: inHours(-1),
        endsAt: inHours(47),
        rules: { metric: "pointsGained" },
        rewards: { 1: "+250 PP", 2: "+100 PP", 3: "+50 PP" },
      },
    }),
  )

  events.push(
    await prisma.worldEvent.upsert({
      where: { id: (await findByName(world.id, "Conquest Clash"))?.id || "__none__" },
      update: {
        type: EventType.CONQUEST,
        scope: EventScope.PLAYER,
        status: EventStatus.ACTIVE,
        startsAt: inHours(-1),
        endsAt: inHours(71),
        rules: { metric: "conquests", description: "Most villages conquered during the period." },
      },
      create: {
        gameWorldId: world.id,
        type: EventType.CONQUEST,
        scope: EventScope.PLAYER,
        name: "Conquest Clash",
        description: "Claim the most villages before time runs out.",
        status: EventStatus.ACTIVE,
        startsAt: inHours(-1),
        endsAt: inHours(71),
        rules: { metric: "conquests" },
      },
    }),
  )

  events.push(
    await prisma.worldEvent.upsert({
      where: { id: (await findByName(world.id, "OD Tournament"))?.id || "__none__" },
      update: {
        type: EventType.OD_TOURNAMENT,
        scope: EventScope.PLAYER,
        status: EventStatus.SCHEDULED,
        startsAt: inHours(24),
        endsAt: inHours(120),
        rules: { metric: "odPoints", description: "Most opponent defeated points across types." },
      },
      create: {
        gameWorldId: world.id,
        type: EventType.OD_TOURNAMENT,
        scope: EventScope.PLAYER,
        name: "OD Tournament",
        description: "Accumulate the most OD between day 2 and day 5.",
        status: EventStatus.SCHEDULED,
        startsAt: inHours(24),
        endsAt: inHours(120),
        rules: { metric: "odPoints" },
      },
    }),
  )

  console.log(`[seed-events] upserted ${events.length} events`)

  // Create sample leaderboard entries for active events (top 5 players)
  const players = await prisma.player.findMany({
    where: { gameWorldId: world.id },
    select: { id: true, playerName: true },
    take: 5,
  })
  for (const ev of events.filter((e) => e.status === "ACTIVE")) {
    let rank = 0
    for (const p of players) {
      rank += 1
      await prisma.eventScore.upsert({
        where: { worldEventId_participantId: { worldEventId: ev.id, participantId: p.id } } as any,
        update: { score: 10 * (players.length - rank + 1) },
        create: {
          worldEventId: ev.id,
          participantId: p.id,
          participantName: p.playerName,
          score: 10 * (players.length - rank + 1),
          metrics: { seeded: true },
        },
      })
    }
  }

  console.log("[seed-events] done")
}

async function findByName(gameWorldId: string, name: string) {
  return prisma.worldEvent.findFirst({ where: { gameWorldId, name } })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

