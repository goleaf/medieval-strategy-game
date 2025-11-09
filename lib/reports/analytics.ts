import { prisma } from "@/lib/db"
import { fetchCombatReportList } from "@/lib/reports/queries"

export interface ReportAnalyticsPayload {
  totals: {
    sent: number
    received: number
    attackerVictories: number
    defenderVictories: number
    mutualLosses: number
  }
  rates: {
    attackSuccess: number
    defenseSuccess: number
  }
  losses: {
    attacker: number
    defender: number
  }
  timeline: Array<{ day: string; sent: number; received: number }>
}

export async function computeReportAnalytics(playerId: string): Promise<ReportAnalyticsPayload> {
  const list = await fetchCombatReportList(playerId)
  const sent = list.filter((r) => r.direction === "sent")
  const received = list.filter((r) => r.direction === "received")
  const attackerVictories = sent.filter((r) => r.outcome === "attacker_victory").length
  const defenderVictories = received.filter((r) => r.outcome === "defender_victory").length
  const mutualLosses = list.filter((r) => r.outcome === "mutual_loss").length
  const losses = list.reduce(
    (acc, r) => {
      acc.attacker += r.losses.attacker
      acc.defender += r.losses.defender
      return acc
    },
    { attacker: 0, defender: 0 },
  )
  const rates = {
    attackSuccess: sent.length ? attackerVictories / sent.length : 0,
    defenseSuccess: received.length ? defenderVictories / received.length : 0,
  }

  // Simple timeline by day (local time)
  const byDay = new Map<string, { sent: number; received: number }>()
  for (const r of list) {
    const day = new Date(r.createdAt).toISOString().slice(0, 10)
    const entry = byDay.get(day) ?? { sent: 0, received: 0 }
    if (r.direction === "sent") entry.sent += 1
    else entry.received += 1
    byDay.set(day, entry)
  }
  const timeline = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, v]) => ({ day, sent: v.sent, received: v.received }))

  return { totals: { sent: sent.length, received: received.length, attackerVictories, defenderVictories, mutualLosses }, rates, losses, timeline }
}

