import { prisma } from "@/lib/db"
import { EventStatus, EventType } from "@prisma/client"

export class EventService {
  static async listEvents(gameWorldId?: string) {
    const where = gameWorldId ? { gameWorldId } : {}
    const events = await prisma.worldEvent.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { startsAt: "asc" },
      ],
    })
    return events
  }

  static async getEvent(eventId: string) {
    return prisma.worldEvent.findUnique({ where: { id: eventId } })
  }

  static async leaderboard(eventId: string, take = 100) {
    const scores = await prisma.eventScore.findMany({
      where: { worldEventId: eventId },
      orderBy: { score: "desc" },
      take,
    })
    return scores.map((s, idx) => ({
      rank: idx + 1,
      participantId: s.participantId,
      participantName: s.participantName,
      score: s.score,
      metrics: s.metrics as Record<string, unknown>,
      updatedAt: s.updatedAt.toISOString(),
    }))
  }

  static isActive(now: Date, startsAt: Date, endsAt: Date) {
    return now >= startsAt && now <= endsAt
  }

  static status(now: Date, startsAt: Date, endsAt: Date): EventStatus {
    if (now < startsAt) return EventStatus.SCHEDULED
    if (now > endsAt) return EventStatus.COMPLETED
    return EventStatus.ACTIVE
  }

  /**
   * Increment active event scores in a world for a given event type and scope.
   * - By default increments both the `score` column and a metric key inside `metrics`.
   */
  static async incrementActive(
    gameWorldId: string | null | undefined,
    type: EventType,
    scope: "PLAYER" | "TRIBE",
    participantId: string,
    participantName: string,
    metricKey: string,
    amount: number,
  ) {
    if (!gameWorldId) return
    const events = await prisma.worldEvent.findMany({
      where: {
        gameWorldId,
        type,
        scope,
        status: { in: [EventStatus.SCHEDULED, EventStatus.ACTIVE] },
      },
    })
    if (events.length === 0) return
    for (const ev of events) {
      const now = new Date()
      const st = this.status(now, ev.startsAt, ev.endsAt)
      if (st !== EventStatus.ACTIVE) continue
      // Upsert score row and bump metric
      const row = await prisma.eventScore.upsert({
        where: { worldEventId_participantId: { worldEventId: ev.id, participantId } } as any,
        update: {},
        create: {
          worldEventId: ev.id,
          participantId,
          participantName,
          score: 0,
          metrics: {},
        },
      })
      const metrics = (row.metrics as Record<string, number>) || {}
      const current = Number(metrics[metricKey] || 0)
      metrics[metricKey] = current + amount
      await prisma.eventScore.update({
        where: { id: row.id },
        data: { score: { increment: amount } as any, metrics },
      })
    }
  }
}
