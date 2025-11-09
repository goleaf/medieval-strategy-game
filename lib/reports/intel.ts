import { prisma } from "@/lib/db"
import type { AttackType } from "@prisma/client"

import type { ScoutIntelReport, ScoutReliability } from "./types"
import type { ScoutingReportPayload } from "@/lib/game-services/scouting-service"

const TTL_HOURS = 24

interface AttackWithIntel {
  id: string
  resolvedAt: Date | null
  scoutingData: string | null
  toVillageId: string | null
  toVillage: {
    id: string
    name: string | null
    x: number
    y: number
    player?: { id: string; playerName: string | null } | null
  } | null
  fromVillage: {
    id: string
    name: string | null
    x: number
    y: number
    player?: { id: string; playerName: string | null } | null
  } | null
}

export async function fetchScoutReports(playerId: string): Promise<ScoutIntelReport[]> {
  if (!playerId) return []
  const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000)
  const attacks = (await prisma.attack.findMany({
    where: {
      type: "SCOUT" as AttackType,
      status: "RESOLVED",
      resolvedAt: { gte: cutoff },
      fromVillage: { playerId },
    },
    include: {
      toVillage: {
        select: {
          id: true,
          name: true,
          x: true,
          y: true,
          player: { select: { id: true, playerName: true } },
        },
      },
      fromVillage: {
        select: {
          id: true,
          name: true,
          x: true,
          y: true,
          player: { select: { id: true, playerName: true } },
        },
      },
    },
    orderBy: { resolvedAt: "desc" },
    take: 80,
  })) as AttackWithIntel[]

  const seenTargets = new Set<string>()
  const previousSnapshots = new Map<string, { troopCount?: number | null; resourceTotal?: number | null; wallLevel?: number | null }>()
  const reports: ScoutIntelReport[] = []

  for (const attack of attacks) {
    const payload = parseIntelPayload(attack.scoutingData)
    const ratio = computeSurvivalRatio(payload)
    const reliability = resolveReliability(ratio)
    const troopCount = estimateTroops(payload, reliability)
    const resourceTotal = estimateResources(payload, reliability)
    const wallLevel = extractWallLevel(payload, reliability)
    const targetKey = buildTargetKey(attack)
    const superseded = seenTargets.has(targetKey)

    const summary = {
      troopCount,
      resourceTotal,
      wallLevel,
    }

    const prevSnapshot = previousSnapshots.get(targetKey)
    const deltas = {
      troopCount: prevSnapshot?.troopCount != null && troopCount != null ? troopCount - prevSnapshot.troopCount : null,
      resourceTotal:
        prevSnapshot?.resourceTotal != null && resourceTotal != null ? resourceTotal - prevSnapshot.resourceTotal : null,
      wallLevel: prevSnapshot?.wallLevel != null && wallLevel != null ? wallLevel - prevSnapshot.wallLevel : null,
    }

    reports.push({
      id: attack.id,
      attackId: attack.id,
      resolvedAt: attack.resolvedAt?.toISOString() ?? new Date().toISOString(),
      expiresAt: new Date((attack.resolvedAt ?? new Date()).getTime() + TTL_HOURS * 60 * 60 * 1000).toISOString(),
      reliability,
      ratio,
      attacker: {
        playerId: attack.fromVillage?.player?.id,
        playerName: attack.fromVillage?.player?.playerName,
        villageId: attack.fromVillage?.id,
        villageName: attack.fromVillage?.name,
        x: attack.fromVillage?.x,
        y: attack.fromVillage?.y,
      },
      defender: {
        playerId: attack.toVillage?.player?.id,
        playerName: attack.toVillage?.player?.playerName,
        villageId: attack.toVillage?.id,
        villageName: attack.toVillage?.name,
        x: attack.toVillage?.x,
        y: attack.toVillage?.y,
        coordsLabel: attack.toVillage ? `(${attack.toVillage.x}|${attack.toVillage.y})` : undefined,
      },
      summary,
      deltas,
      payload,
      actionSuggestion: buildSuggestion(reliability, troopCount),
      superseded,
    })

    if (!superseded) {
      seenTargets.add(targetKey)
    }
    previousSnapshots.set(targetKey, summary)
  }

  return reports
}

function parseIntelPayload(raw: string | null): ScoutingReportPayload | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as ScoutingReportPayload
  } catch {
    return null
  }
}

function computeSurvivalRatio(payload: ScoutingReportPayload | null): number {
  if (!payload?.summary?.attackersSent) return 0
  return payload.summary.attackersSurvived / Math.max(1, payload.summary.attackersSent)
}

function resolveReliability(ratio: number): ScoutReliability {
  if (ratio >= 1) return "full"
  if (ratio >= 0.5) return "partial"
  return "failed"
}

function estimateTroops(payload: ScoutingReportPayload | null, reliability: ScoutReliability): number | null {
  if (!payload || reliability === "failed") return null
  if (payload.garrison?.units?.length) {
    return payload.garrison.units.reduce((sum, unit) => sum + unit.quantity, 0)
  }
  if (payload.garrison?.classes?.length) {
    return payload.garrison.classes.reduce((sum, entry) => sum + entry.count, 0)
  }
  return null
}

function estimateResources(payload: ScoutingReportPayload | null, reliability: ScoutReliability): number | null {
  if (!payload || reliability === "failed" || !payload.economy?.stocks) return null
  let total = 0
  for (const value of Object.values(payload.economy.stocks)) {
    if (typeof value.amount === "number") {
      total += value.amount
    } else if (value.band) {
      const max = value.band.max ?? value.band.min
      total += (value.band.min + max) / 2
    }
  }
  return total || null
}

function extractWallLevel(payload: ScoutingReportPayload | null, reliability: ScoutReliability): number | null {
  if (!payload?.defenses?.wall) return null
  if (typeof payload.defenses.wall.level === "number") {
    return payload.defenses.wall.level
  }
  if (payload.defenses.wall.band && reliability === "partial") {
    const max = payload.defenses.wall.band.max ?? payload.defenses.wall.band.min
    return Math.round((payload.defenses.wall.band.min + max) / 2)
  }
  return null
}

function buildSuggestion(reliability: ScoutReliability, troopCount: number | null): string {
  if (reliability === "failed") {
    return "Scouts defeated — send a stronger scout wave."
  }
  if (troopCount == null) {
    return "Intelligence incomplete — scout again soon."
  }
  if (troopCount < 200) {
    return "Enemy garrison light. Consider attacking now."
  }
  if (troopCount > 1200) {
    return "Defenses heavy. Rally allies or wait."
  }
  return "Moderate defenses. Additional scouting recommended."
}

function buildTargetKey(attack: AttackWithIntel): string {
  if (attack.toVillageId) return `v:${attack.toVillageId}`
  if (attack.toVillage) return `coords:${attack.toVillage.x}|${attack.toVillage.y}`
  return `attack:${attack.id}`
}
