import { prisma } from "@/lib/db"
import { buildUnitCatalog } from "@/lib/rally-point/unit-catalog"
import type {
  CombatResolution,
  GarrisonStack,
  MovementMission,
  MovementReportRecord,
  UnitsComposition,
  UnitRole,
} from "@/lib/rally-point/types"
import type { RallyPointMovement } from "@prisma/client"

import type {
  CombatReportDetail,
  CombatReportListItem,
  Direction,
  Outcome,
  ParticipantSummary,
  Perspective,
  SupportStackSummary,
  SupportStatusPayload,
} from "./types"

const UNIT_CATALOG = buildUnitCatalog()

type Nullable<T> = T | null | undefined

const UNIT_ROLE_ICONS: Record<UnitRole | "hero" | "unknown", string> = {
  inf: "⚔️",
  cav: "🏇",
  scout: "👁️",
  ram: "🪵",
  catapult: "🎯",
  admin: "🎖️",
  settler: "🛖",
  hero: "🦸",
  unknown: "❔",
}

function parseCombatSummary(record: MovementReportRecord): CombatResolution | null {
  const summary = record.summary as Nullable<CombatResolution>
  if (!summary || typeof summary !== "object") {
    return null
  }
  const hasAttacker = summary.attackerSurvivors != null || summary.attackerCasualties != null
  const hasDefender = summary.defenderRemaining != null || summary.defenderCasualties != null
  if (!hasAttacker && !hasDefender) {
    return null
  }
  return summary
}

function sumComposition(composition: UnitsComposition | undefined): number {
  if (!composition) return 0
  return Object.values(composition).reduce((sum, value) => sum + value, 0)
}

function sumDefenderStacks(stacks: GarrisonStack[] | undefined): number {
  if (!stacks) return 0
  return stacks.reduce((sum, stack) => sum + (stack.count ?? 0), 0)
}

function determineOutcome(summary: CombatResolution | null, perspective: Perspective): Outcome {
  if (!summary) return "unknown"
  const attackerLostAll = sumComposition(summary.attackerSurvivors) === 0
  const defenderLostAll = sumDefenderStacks(summary.defenderRemaining) === 0

  if (perspective === "attacker") {
    if (defenderLostAll && !attackerLostAll) return "attacker_victory"
    if (attackerLostAll && !defenderLostAll) return "defender_victory"
  } else {
    if (defenderLostAll && !attackerLostAll) return "attacker_victory"
    if (attackerLostAll && !defenderLostAll) return "defender_victory"
  }
  if (attackerLostAll && defenderLostAll) return "mutual_loss"
  if (summary.wallDrop != null || summary.catapultDamage) {
    return defenderLostAll ? "attacker_victory" : "defender_victory"
  }
  return "unknown"
}

function missionTtlDays(mission: MovementMission): number {
  switch (mission) {
    case "reinforce":
    case "return":
      return 7
    case "siege":
      return 30
    case "raid":
      return 14
    default:
      return 21
  }
}

function participantFromMovement(
  movement: Pick<RallyPointMovement, "fromVillageId" | "toVillageId"> & {
    fromVillage: { id: string; name: string | null; x: number; y: number; player: { id: string; playerName: string | null; tribe?: { tag: string | null } | null } }
    toVillage: { id: string; name: string | null; x: number; y: number; player: { id: string; playerName: string | null; tribe?: { tag: string | null } | null } } | null
  },
  kind: "attacker" | "defender",
): ParticipantSummary {
  if (kind === "attacker") {
    return {
      playerId: movement.fromVillage.player.id,
      playerName: movement.fromVillage.player.playerName,
      tribeTag: movement.fromVillage.player.tribe?.tag ?? null,
      villageId: movement.fromVillage.id,
      villageName: movement.fromVillage.name,
      x: movement.fromVillage.x,
      y: movement.fromVillage.y,
    }
  }
  const village = movement.toVillage
  if (!village) {
    return { playerId: null, playerName: null, tribeTag: null, villageId: null, villageName: null }
  }
  return {
    playerId: village.player.id,
    playerName: village.player.playerName,
    tribeTag: village.player.tribe?.tag ?? null,
    villageId: village.id,
    villageName: village.name,
    x: village.x,
    y: village.y,
  }
}

function formatSubject(
  report: MovementReportRecord & { movement: RallyPointMovement & { fromVillage: any; toVillage: any } },
  direction: Direction,
  outcome: Outcome,
): string {
  const targetName = report.movement.toVillage?.name ?? `(${report.movement.toTileX}|${report.movement.toTileY})`
  const sourceName = report.movement.fromVillage.name ?? `(${report.movement.fromVillage.x}|${report.movement.fromVillage.y})`
  const prefix =
    outcome === "attacker_victory"
      ? "Victory"
      : outcome === "defender_victory"
        ? "Defeat"
        : outcome === "mutual_loss"
          ? "Clash"
          : "Battle"
  if (direction === "sent") {
    return `${prefix}: ${sourceName} → ${targetName}`
  }
  return `${prefix}: ${targetName} defended vs ${sourceName}`
}

function computeTotals(summary: CombatResolution | null) {
  if (!summary) {
    return { attackerLosses: 0, defenderLosses: 0 }
  }
  return {
    attackerLosses: sumComposition(summary.attackerCasualties),
    defenderLosses: sumDefenderStacks(summary.defenderCasualties),
  }
}

export async function fetchCombatReportList(playerId: string): Promise<CombatReportListItem[]> {
  if (!playerId) return []
  const reports = await prisma.rallyPointMovementReport.findMany({
    where: {
      OR: [
        { movement: { ownerAccountId: playerId } },
        { movement: { fromVillage: { playerId } } },
        { movement: { toVillage: { playerId } } },
      ],
    },
    include: {
      movement: {
        include: {
          fromVillage: {
            include: {
              player: {
                select: {
                  id: true,
                  playerName: true,
                  tribe: { select: { tag: true } },
                },
              },
            },
          },
          toVillage: {
            include: {
              player: {
                select: {
                  id: true,
                  playerName: true,
                  tribe: { select: { tag: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  })

  const items: CombatReportListItem[] = reports.map((report) => {
    const summary = parseCombatSummary(report)
    const direction: Direction = report.movement.ownerAccountId === playerId ? "sent" : "received"
    const perspective: Perspective = direction === "sent" ? "attacker" : "defender"
    const outcome = determineOutcome(summary, perspective)
    const ttlDays = missionTtlDays(report.mission)
    const expiresAt = new Date(report.createdAt.getTime() + ttlDays * 24 * 60 * 60 * 1000)
    const subject = formatSubject(report, direction, outcome)
    const totals = computeTotals(summary)
    const tags = buildTagList(report, summary)
    const attacker = participantFromMovement(report.movement as any, "attacker")
    const defender = participantFromMovement(report.movement as any, "defender")
    const isNew = Date.now() - report.createdAt.getTime() < 24 * 60 * 60 * 1000
    const luck = summary?.battleReport?.luck?.attacker
    const morale = summary?.battleReport?.multipliers?.morale
    return {
      id: report.id,
      mission: report.mission,
      createdAt: report.createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      direction,
      perspective,
      outcome,
      subject,
      attacker,
      defender,
      losses: { attacker: totals.attackerLosses, defender: totals.defenderLosses },
      tags,
      isNew,
      luck,
      morale,
      wallDrop: summary?.wallDrop ?? null ?? undefined,
      movementId: report.movementId,
    }
  })

  return items
}

function buildTagList(report: MovementReportRecord, summary: CombatResolution | null): string[] {
  const tags = new Set<string>()
  tags.add(report.mission.toUpperCase())
  if (summary?.catapultDamage?.targets?.length) {
    tags.add("SIEGE")
  }
  if (summary?.trap) {
    tags.add("TRAPS")
  }
  if (summary?.battleReport?.mission === "raid") {
    tags.add("RAID")
  }
  if (summary?.battleReport?.multipliers?.night && summary.battleReport.multipliers.night > 1) {
    tags.add("NIGHT")
  }
  if (summary?.battleReport?.multipliers?.morale && summary.battleReport.multipliers.morale !== 1) {
    tags.add("MORALE")
  }
  return Array.from(tags)
}

function aggregateUnits(
  survivors: UnitsComposition | undefined,
  casualties: UnitsComposition | undefined,
): { before: Record<string, number>; after: Record<string, number> } {
  const before: Record<string, number> = {}
  const after: Record<string, number> = {}
  if (survivors) {
    for (const [unitId, count] of Object.entries(survivors)) {
      after[unitId] = count
      before[unitId] = (before[unitId] ?? 0) + count
    }
  }
  if (casualties) {
    for (const [unitId, count] of Object.entries(casualties)) {
      before[unitId] = (before[unitId] ?? 0) + count
    }
  }
  return { before, after }
}

function aggregateDefender(
  stacks: GarrisonStack[] | undefined,
  casualties: GarrisonStack[] | undefined,
) {
  const result: Record<string, number> = {}
  if (stacks) {
    for (const stack of stacks) {
      result[stack.unitTypeId] = (result[stack.unitTypeId] ?? 0) + stack.count
    }
  }
  if (casualties) {
    for (const stack of casualties) {
      result[stack.unitTypeId] = (result[stack.unitTypeId] ?? 0) + stack.count
    }
  }
  const survivors: Record<string, number> = {}
  if (stacks) {
    for (const stack of stacks) {
      survivors[stack.unitTypeId] = (survivors[stack.unitTypeId] ?? 0) + stack.count
    }
  }
  return { before: result, after: survivors }
}

function groupSupporters(
  defenders: GarrisonStack[] | undefined,
  casualties: GarrisonStack[] | undefined,
): Record<
  string,
  {
    ownerAccountId: string
    totals: Record<string, number>
  }
> {
  const map = new Map<
    string,
    {
      ownerAccountId: string
      totals: Record<string, number>
    }
  >()

  const add = (stack: GarrisonStack) => {
    const existing = map.get(stack.ownerAccountId) ?? {
      ownerAccountId: stack.ownerAccountId,
      totals: {},
    }
    existing.totals[stack.unitTypeId] = (existing.totals[stack.unitTypeId] ?? 0) + stack.count
    map.set(stack.ownerAccountId, existing)
  }

  defenders?.forEach(add)
  casualties?.forEach(add)

  return Object.fromEntries(Array.from(map.entries()))
}

function computeCarryCapacity(composition: UnitsComposition | undefined): number {
  if (!composition) return 0
  let total = 0
  for (const [unitId, count] of Object.entries(composition)) {
    if (count <= 0) continue
    const unit = UNIT_CATALOG[unitId]
    const carry = unit?.carry ?? 0
    total += carry * count
  }
  return total
}

export async function fetchCombatReportDetail(reportId: string, playerId: string): Promise<CombatReportDetail | null> {
  if (!playerId) return null
  const report = await prisma.rallyPointMovementReport.findUnique({
    where: { id: reportId },
    include: {
      movement: {
        include: {
          fromVillage: {
            include: {
              player: {
                select: { id: true, playerName: true, tribe: { select: { tag: true } }, gameTribe: true },
              },
            },
          },
          toVillage: {
            include: {
              player: {
                select: { id: true, playerName: true, tribe: { select: { tag: true } }, gameTribe: true },
              },
            },
          },
        },
      },
    },
  })
  if (!report) return null
  const baseList = await fetchCombatReportList(playerId)
  const listEntry = baseList.find((entry) => entry.id === report.id)
  if (!listEntry) {
    return null
  }
  const summary = parseCombatSummary(report)
  const attackerUnits = aggregateUnits(summary?.attackerSurvivors, summary?.attackerCasualties)
  const defenderUnits = aggregateDefender(summary?.defenderRemaining, summary?.defenderCasualties)
  const supporters = groupSupporters(summary?.defenderRemaining, summary?.defenderCasualties)
  const carryCapacity = computeCarryCapacity(summary?.attackerSurvivors)
  const defenderUserIds = Object.keys(supporters)
  if (report.movement.toVillage?.playerId) {
    defenderUserIds.push(report.movement.toVillage.playerId)
  }
  const playerMap = await fetchPlayerNameMap(defenderUserIds)

  // Back-compat: adapt legacy buildingDamage into a catapult-like structure if present
  const legacyBuildingDamage = (summary as any)?.buildingDamage as
    | Array<{ buildingId?: string; structureId?: string; damage?: number }>
    | undefined

  const catapultContext =
    (summary as any)?.catapultDamage ??
    (legacyBuildingDamage && legacyBuildingDamage.length
      ? {
          totalCatapults: 0,
          totalShots: 0,
          mode: "single",
          targets: legacyBuildingDamage.map((hit) => ({
            selection: undefined,
            targetId: hit.buildingId ?? hit.structureId ?? "unknown",
            targetLabel: "Structure",
            targetKind: "building",
            structureId: hit.buildingId ?? hit.structureId,
            beforeLevel: (hit.damage ?? 0),
            afterLevel: 0,
            drop: (hit.damage ?? 0),
            allocatedShots: 0,
            shotsUsed: 0,
            wastedShots: 0,
            modifiers: { variancePct: 0 },
          })),
          wastedShots: 0,
        }
      : undefined)

  const context = {
    totalCarryCapacity: carryCapacity,
    loot: (summary as any)?.loot as Nullable<Record<string, number>>,
    attackerBefore: attackerUnits.before,
    attackerAfter: attackerUnits.after,
    defenderBefore: defenderUnits.before,
    defenderAfter: defenderUnits.after,
    defenderSupport: mapSupportersToNames(supporters, playerMap),
    wall: buildWallContext(summary),
    loyalty: buildLoyaltyContext(summary),
    catapult: catapultContext,
    trap: summary?.trap,
  }

  return {
    ...listEntry,
    summary,
    context,
  }
}

async function fetchPlayerNameMap(playerIds: string[]): Promise<Map<string, { name: string | null; tribeTag: string | null }>> {
  if (!playerIds.length) return new Map()
  const uniqueIds = Array.from(new Set(playerIds))
  const players = await prisma.player.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, playerName: true, tribe: { select: { tag: true } } },
  })
  return new Map(players.map((player) => [player.id, { name: player.playerName, tribeTag: player.tribe?.tag ?? null }]))
}

function mapSupportersToNames(
  supporters: Record<
    string,
    {
      ownerAccountId: string
      totals: Record<string, number>
    }
  >,
  playerMap: Map<string, { name: string | null; tribeTag: string | null }>,
) {
  const mapped: CombatReportDetail["context"]["defenderSupport"] = {}
  for (const [ownerId, data] of Object.entries(supporters)) {
    const player = playerMap.get(ownerId)
    mapped[ownerId] = {
      ownerAccountId: ownerId,
      ownerName: player?.name,
      tribeTag: player?.tribeTag,
      totals: data.totals,
    }
  }
  return mapped
}

function buildWallContext(summary: CombatResolution | null) {
  if (!summary) return undefined
  const before = (summary as any)?.context?.wall?.before ?? null
  const after = (summary as any)?.context?.wall?.after ?? (before != null && summary.wallDrop != null ? Math.max(0, before - summary.wallDrop) : null)
  return {
    before,
    after,
    drop: summary.wallDrop ?? (before != null && after != null ? before - after : null),
    type: (summary as any)?.context?.wall?.type,
  }
}

function buildLoyaltyContext(summary: CombatResolution | null) {
  if (!summary) return undefined
  return (summary as any)?.context?.loyalty
}

function unitRole(unitId: string): UnitRole | "unknown" {
  return UNIT_CATALOG[unitId]?.role ?? "unknown"
}

function formatUnitName(unitId: string): string {
  const unit = UNIT_CATALOG[unitId]
  if (!unit) return unitId.replace(/_/g, " ")
  const parts = unit.id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  return parts.join(" ")
}

function summarizeStack(
  stack: GarrisonStack & { village: { id: string; name: string | null; player: { playerName: string | null } } },
  ownerName: string | null,
): SupportStackSummary {
  return {
    villageId: stack.villageId,
    villageName: stack.village.name,
    villageOwner: stack.village.player.playerName,
    ownerAccountId: stack.ownerAccountId,
    ownerName,
    unitTypeId: stack.unitTypeId,
    unitName: formatUnitName(stack.unitTypeId),
    count: stack.count,
    role: unitRole(stack.unitTypeId),
  }
}

export async function fetchSupportStatus(playerId: string): Promise<SupportStatusPayload> {
  if (!playerId) {
    return { stationedAbroad: [], supportReceived: [], returningMissions: [] }
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { playerName: true },
  })
  const youLabel = player?.playerName ?? "You"

  const stationed = await prisma.garrisonStack.findMany({
    where: {
      ownerAccountId: playerId,
      village: { playerId: { not: playerId } },
    },
    include: {
      village: {
        include: {
          player: { select: { playerName: true } },
        },
      },
    },
    take: 50,
  })

  const stationedAbroad: SupportStackSummary[] = stationed.map((stack) => {
    return summarizeStack(stack as any, youLabel)
  })

  const villages = await prisma.village.findMany({
    where: { playerId },
    select: { id: true, name: true },
  })
  const villageIds = villages.map((v) => v.id)

  let supportReceived: SupportStatusPayload["supportReceived"] = []
  if (villageIds.length) {
    const stacks = await prisma.garrisonStack.findMany({
      where: {
        villageId: { in: villageIds },
        ownerAccountId: { not: playerId },
      },
      include: {
        village: { select: { id: true, name: true } },
        owner: { select: { id: true, playerName: true } },
      },
    })

    const grouped = new Map<
      string,
      {
        villageId: string
        villageName: string | null
        contributors: Map<string, { name: string | null; total: number }>
        total: number
      }
    >()
    for (const stack of stacks) {
      const entry =
        grouped.get(stack.villageId) ??
        {
          villageId: stack.villageId,
          villageName: stack.village.name,
          contributors: new Map(),
          total: 0,
        }
      entry.total += stack.count
      const contributor = entry.contributors.get(stack.ownerAccountId) ?? { name: stack.owner.playerName, total: 0 }
      contributor.total += stack.count
      entry.contributors.set(stack.ownerAccountId, contributor)
      grouped.set(stack.villageId, entry)
    }
    supportReceived = Array.from(grouped.values()).map((entry) => ({
      villageId: entry.villageId,
      villageName: entry.villageName,
      totalTroops: entry.total,
      contributors: Array.from(entry.contributors.entries()).map(([ownerId, data]) => ({
        ownerAccountId: ownerId,
        ownerName: data.name,
        totalUnits: data.total,
      })),
    }))
  }

  const returning = await prisma.rallyPointMovement.findMany({
    where: {
      ownerAccountId: playerId,
      mission: { in: ["RETURN", "REINFORCE"] },
      status: { in: ["EN_ROUTE", "RETURNING", "RESOLVED"] },
    },
    select: {
      id: true,
      mission: true,
      toVillageId: true,
      arriveAt: true,
      payload: true,
      toVillage: { select: { id: true, name: true } },
    },
    orderBy: { arriveAt: "asc" },
    take: 20,
  })

  const returningMissions = returning.map((movement) => ({
    movementId: movement.id,
    mission: missionToDomain(movement.mission),
    toVillageId: movement.toVillageId,
    toVillageName: movement.toVillage?.name ?? null,
    arriveAt: movement.arriveAt.toISOString(),
    units: (movement.payload as any)?.units ?? {},
  }))

  return {
    stationedAbroad,
    supportReceived,
    returningMissions,
  }
}

function missionToDomain(mission: string): MovementMission {
  switch (mission) {
    case "RAID":
      return "raid"
    case "REINFORCE":
      return "reinforce"
    case "SIEGE":
      return "siege"
    case "RETURN":
      return "return"
    default:
      return "attack"
  }
}
