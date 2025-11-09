import { prisma } from "@/lib/db"
import { resolveRange, dayKey, type TimeRangeKey } from "./time"
import { getRolePermissionDefaults } from "@/lib/config/tribes"
import type { TribeRole } from "@prisma/client"

export interface TribeStatsPayload {
  tribe: { id: string; name: string; tag: string; memberCount: number; totalPoints: number }
  memberPerformance: {
    byPoints: Array<{ id: string; playerName: string; points: number; villages: number; rank: number }>
    byOD: Array<{ id: string; playerName: string; od: number }>
    byVillages: Array<{ id: string; playerName: string; villages: number }>
  }
  contributions: {
    mostActive: Array<{ id: string; playerName: string; actions: number }>
    mostHelpful: Array<{ id: string; playerName: string; supportCount: number }>
    inactive: Array<{ id: string; playerName: string; lastActiveAt: string; daysSince: number }>
    growthRatePerDay: number
    retention7d: number
  }
  military: {
    attacksLaunched: number
    successRate: number
    resourcesPlundered: { wood: number; stone: number; iron: number; gold: number; food: number }
    territoriesByContinent: Array<{ continentId: string; villages: number }>
    activeWars: Array<{ id: string; against: { id: string; name: string; tag: string } }>
  }
  territory: {
    heatmapByContinent: Array<{ continentId: string; villages: number }>
    frontlineVillageCount: number
    expansionOpportunities: { nearbyBarbarians: number }
    defensiveCoverage: { totalSupportStacks: number; avgSupportPerVillage: number }
  }
}

export async function computeTribeStats(params: {
  tribeId: string
  requesterId: string
  range?: TimeRangeKey | string
}): Promise<TribeStatsPayload> {
  const { tribeId, requesterId, range } = params
  const { from, to } = resolveRange(range)

  const [tribe, requester] = await Promise.all([
    prisma.tribe.findUnique({ where: { id: tribeId } }),
    prisma.player.findUnique({ where: { id: requesterId }, select: { id: true, tribeId: true, tribeRole: true } }),
  ])
  if (!tribe) throw new Error("Tribe not found")
  if (!requester || requester.tribeId !== tribeId) throw new Error("Unauthorized")
  const role = (requester.tribeRole ?? "MEMBER") as TribeRole
  const allowedRoles: TribeRole[] = ["FOUNDER", "CO_FOUNDER", "OFFICER"]
  if (!allowedRoles.includes(role)) throw new Error("Unauthorized")

  const members = await prisma.player.findMany({
    where: { tribeId },
    select: { id: true, playerName: true, totalPoints: true, villagesUsed: true, rank: true, lastActiveAt: true },
  })
  const memberIds = members.map((m) => m.id)

  // Member performance leaderboards
  const memberPerformance: TribeStatsPayload["memberPerformance"] = {
    byPoints: [...members]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 25)
      .map((m) => ({ id: m.id, playerName: m.playerName, points: m.totalPoints, villages: m.villagesUsed, rank: m.rank })),
    byVillages: [...members]
      .sort((a, b) => b.villagesUsed - a.villagesUsed)
      .slice(0, 25)
      .map((m) => ({ id: m.id, playerName: m.playerName, villages: m.villagesUsed })),
    byOD: [],
  }

  const membersWithOD = await prisma.player.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, playerName: true, odAttacking: true, odDefending: true, odSupporting: true },
  })
  memberPerformance.byOD = membersWithOD
    .map((m) => ({ id: m.id, playerName: m.playerName, od: m.odAttacking + m.odDefending + m.odSupporting }))
    .sort((a, b) => b.od - a.od)
    .slice(0, 25)

  // Contributions
  const actions = await prisma.accountActionLog.findMany({
    where: { playerId: { in: memberIds }, createdAt: from ? { gte: from, lte: to } : { lte: to } },
    select: { playerId: true },
  })
  const actionCounts = new Map<string, number>()
  for (const a of actions) actionCounts.set(a.playerId, (actionCounts.get(a.playerId) ?? 0) + 1)
  const mostActive = members
    .map((m) => ({ id: m.id, playerName: m.playerName, actions: actionCounts.get(m.id) ?? 0 }))
    .sort((a, b) => b.actions - a.actions)
    .slice(0, 15)

  // Most helpful (support stationed in other tribe members' villages)
  const supportedStacks = await prisma.garrisonStack.findMany({
    where: {
      ownerAccountId: { in: memberIds },
      village: { playerId: { in: memberIds } },
    },
    select: { ownerAccountId: true, count: true },
  })
  const supportByOwner = new Map<string, number>()
  for (const s of supportedStacks) supportByOwner.set(s.ownerAccountId, (supportByOwner.get(s.ownerAccountId) ?? 0) + s.count)
  const mostHelpful = members
    .map((m) => ({ id: m.id, playerName: m.playerName, supportCount: supportByOwner.get(m.id) ?? 0 }))
    .sort((a, b) => b.supportCount - a.supportCount)
    .slice(0, 15)

  // Inactive members (not active in 7 days by default)
  const now = Date.now()
  const inactive = members
    .filter((m) => now - new Date(m.lastActiveAt).getTime() > 7 * 86_400_000)
    .map((m) => ({ id: m.id, playerName: m.playerName, lastActiveAt: m.lastActiveAt.toISOString(), daysSince: Math.floor((now - new Date(m.lastActiveAt).getTime()) / 86_400_000) }))
    .sort((a, b) => b.daysSince - a.daysSince)

  // Growth rate (approximate): points per day per tribe
  const tribeAgeDays = Math.max(1, Math.floor((now - new Date(tribe.createdAt).getTime()) / 86_400_000))
  const growthRatePerDay = tribe.totalPoints / tribeAgeDays
  // Retention: % of members active in last 7d
  const active7 = members.filter((m) => now - new Date(m.lastActiveAt).getTime() <= 7 * 86_400_000).length
  const retention7d = members.length > 0 ? active7 / members.length : 0

  const contributions: TribeStatsPayload["contributions"] = {
    mostActive,
    mostHelpful,
    inactive,
    growthRatePerDay,
    retention7d,
  }

  // Military
  const [reports, plunder, continents, wars] = await Promise.all([
    prisma.rallyPointMovementReport.findMany({
      where: { movement: { ownerAccountId: { in: memberIds } }, createdAt: from ? { gte: from, lte: to } : { lte: to } },
      select: { mission: true, summary: true },
    }),
    prisma.attack.findMany({
      where: { fromVillage: { playerId: { in: memberIds } }, createdAt: from ? { gte: from, lte: to } : { lte: to } },
      select: { lootWood: true, lootStone: true, lootIron: true, lootGold: true, lootFood: true },
    }),
    prisma.village.groupBy({ where: { playerId: { in: memberIds } }, by: ["continentId"], _count: { _all: true } }),
    prisma.war.findMany({ where: { status: "ACTIVE", OR: [{ attackerTribeId: tribeId }, { defenderTribeId: tribeId }] }, include: { attackerTribe: true, defenderTribe: true } }),
  ])

  const attacksLaunched = reports.length
  let attackerVictories = 0
  for (const r of reports) {
    const summary = r.summary as any
    if (summary?.battleReport?.attackerVictory) attackerVictories += 1
  }
  const successRate = attacksLaunched > 0 ? attackerVictories / attacksLaunched : 0

  const resourcesPlundered = plunder.reduce(
    (acc, a) => ({
      wood: acc.wood + a.lootWood,
      stone: acc.stone + a.lootStone,
      iron: acc.iron + a.lootIron,
      gold: acc.gold + a.lootGold,
      food: acc.food + a.lootFood,
    }),
    { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 },
  )

  const territoriesByContinent = continents.map((c) => ({ continentId: c.continentId, villages: c._count._all }))

  const activeWars = wars.map((w) => ({
    id: w.id,
    against:
      w.attackerTribeId === tribeId
        ? { id: w.defenderTribe.id, name: w.defenderTribe.name, tag: w.defenderTribe.tag }
        : { id: w.attackerTribe.id, name: w.attackerTribe.name, tag: w.attackerTribe.tag },
  }))

  const military: TribeStatsPayload["military"] = { attacksLaunched, successRate, resourcesPlundered, territoriesByContinent, activeWars }

  // Territory details
  const heatmapByContinent = territoriesByContinent

  // Frontline villages: within 10 tiles of any non-tribe village
  const tribeVillages = await prisma.village.findMany({ where: { playerId: { in: memberIds } }, select: { id: true, x: true, y: true } })
  const nonTribeVillages = await prisma.village.findMany({ where: { player: { tribeId: { not: tribeId } } }, select: { x: true, y: true } })
  const FRONTLINE_RADIUS = 10
  let frontlineVillageCount = 0
  for (const v of tribeVillages) {
    const isFrontline = nonTribeVillages.some((o) => {
      const dx = v.x - o.x
      const dy = v.y - o.y
      return Math.sqrt(dx * dx + dy * dy) <= FRONTLINE_RADIUS
    })
    if (isFrontline) frontlineVillageCount += 1
  }

  // Expansion opportunities: barbarian villages within 15 tiles of any tribe village
  const barbarians = await prisma.barbarian.findMany({ select: { x: true, y: true } })
  const EXPANSION_RADIUS = 15
  let nearbyBarbarians = 0
  for (const b of barbarians) {
    const isNear = tribeVillages.some((v) => {
      const dx = v.x - b.x
      const dy = v.y - b.y
      return Math.sqrt(dx * dx + dy * dy) <= EXPANSION_RADIUS
    })
    if (isNear) nearbyBarbarians += 1
  }

  // Defensive coverage: total support stacks in tribe villages
  const supportStacks = await prisma.garrisonStack.findMany({ where: { village: { playerId: { in: memberIds } } }, select: { count: true } })
  const totalSupportStacks = supportStacks.reduce((sum, s) => sum + s.count, 0)
  const avgSupportPerVillage = tribeVillages.length > 0 ? totalSupportStacks / tribeVillages.length : 0

  const territory: TribeStatsPayload["territory"] = {
    heatmapByContinent,
    frontlineVillageCount,
    expansionOpportunities: { nearbyBarbarians },
    defensiveCoverage: { totalSupportStacks, avgSupportPerVillage },
  }

  return {
    tribe: { id: tribe.id, name: tribe.name, tag: tribe.tag, memberCount: tribe.memberCount, totalPoints: tribe.totalPoints },
    memberPerformance,
    contributions,
    military,
    territory,
  }
}

