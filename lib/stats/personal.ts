import { prisma } from "@/lib/db"
import { computeReportAnalytics } from "@/lib/reports/analytics"
import { fetchCombatReportList } from "@/lib/reports/queries" 
import { resolveRange, dayKey, type TimeRangeKey } from "./time"

type ResourceTotals = { wood: number; stone: number; iron: number; gold: number; food: number }

function emptyRes(): ResourceTotals {
  return { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }
}

function addRes(a: ResourceTotals, b: Partial<ResourceTotals>): ResourceTotals {
  return {
    wood: a.wood + (b.wood ?? 0),
    stone: a.stone + (b.stone ?? 0),
    iron: a.iron + (b.iron ?? 0),
    gold: a.gold + (b.gold ?? 0),
    food: a.food + (b.food ?? 0),
  }
}

export interface PersonalStatsPayload {
  overview: {
    totalPoints: number
    rank: number
    villagesOwned: number
    od: { attacking: number; defending: number; supporting: number }
    growthRatePerDay: number
  }
  economy: {
    totalProducedAllTime: ResourceTotals
    productionPerHour: ResourceTotals
    trading: { sent: ResourceTotals; received: ResourceTotals; merchantsUsed: number; merchantEfficiency: number }
    resourceEfficiency: { gained: ResourceTotals; spent: ResourceTotals; ratio: number }
  }
  military: {
    unitsTrainedEstimate: number
    unitsLost: { asAttacker: number; asDefender: number }
    attackSuccessRate: number
    favoriteUnits: Array<{ unitTypeId: string; count: number }>
    combatEfficiency: { killed: number; lost: number; ratio: number }
  }
  timeSeries: {
    combat: Array<{ day: string; sent: number; received: number }>
    villageAcquisitions: Array<{ day: string; count: number }>
    resourceProduction: Array<{ day: string } & ResourceTotals>
    activityByHour: Array<{ hour: number; count: number }>
  }
  comparison?: {
    tribe?: { avgPoints: number; avgVillages: number; avgOD: number }
    world?: { avgPoints: number; avgVillages: number; avgOD: number }
  }
}

export async function computePersonalStats(params: {
  playerId: string
  range?: TimeRangeKey | string
  includeComparison?: boolean
}): Promise<PersonalStatsPayload> {
  const { playerId, range, includeComparison } = params
  const { from, to } = resolveRange(range)

  const player = await prisma.player.findUnique({ where: { id: playerId }, include: { tribe: true } })
  if (!player) throw new Error("Player not found")

  const villages = await prisma.village.findMany({ where: { playerId }, select: { id: true } })
  const villageIds = villages.map((v) => v.id)

  // Overview
  const ageDays = Math.max(1, Math.floor((Date.now() - new Date(player.createdAt).getTime()) / 86_400_000))
  const overview: PersonalStatsPayload["overview"] = {
    totalPoints: player.totalPoints,
    rank: player.rank,
    villagesOwned: villages.length,
    od: { attacking: player.odAttacking, defending: player.odDefending, supporting: player.odSupporting },
    growthRatePerDay: player.totalPoints / ageDays,
  }

  // Economy
  const [resourceLedgers, storageLedgers, shipments, prodRows] = await Promise.all([
    prisma.villageResourceLedger.findMany({ where: { villageId: { in: villageIds } } }),
    prisma.villageStorageLedger.findMany({
      where: {
        villageId: { in: villageIds },
        createdAt: from ? { gte: from, lte: to } : { lte: to },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.shipment.findMany({
      where: {
        OR: [{ sourceVillageId: { in: villageIds } }, { targetVillageId: { in: villageIds } }],
        createdAt: from ? { gte: from, lte: to } : { lte: to },
      },
    }),
    prisma.villageStorageLedger.findMany({
      where: {
        villageId: { in: villageIds },
        reason: "PRODUCTION",
      },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const productionPerHour = resourceLedgers.reduce((acc, r) => {
    switch (r.resourceType) {
      case "WOOD":
        acc.wood += r.productionPerHour
        break
      case "CLAY":
        acc.stone += r.productionPerHour
        break
      case "IRON":
        acc.iron += r.productionPerHour
        break
      case "CROP":
        acc.food += r.productionPerHour
        break
    }
    return acc
  }, { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 } as ResourceTotals)

  // Total produced all time (sum of PRODUCTION deltas without range filtering)
  const totalProducedAllTime = prodRows.reduce((acc, row) => {
    return addRes(acc, {
      wood: Math.max(0, row.woodDelta),
      stone: Math.max(0, row.stoneDelta),
      iron: Math.max(0, row.ironDelta),
      food: Math.max(0, row.foodDelta),
      gold: Math.max(0, row.goldDelta),
    })
  }, emptyRes())

  // Trading (range-filtered)
  const trading = shipments.reduce(
    (acc, s) => {
      const payload = { wood: s.wood, stone: s.stone, iron: s.iron, gold: s.gold, food: s.food }
      const isSent = villageIds.includes(s.sourceVillageId)
      if (isSent) {
        acc.sent = addRes(acc.sent, payload)
      }
      const isReceived = villageIds.includes(s.targetVillageId)
      if (isReceived) {
        acc.received = addRes(acc.received, payload)
      }
      if (isSent || isReceived) acc.merchantsUsed += s.merchantsUsed
      return acc
    },
    { sent: emptyRes(), received: emptyRes(), merchantsUsed: 0, merchantEfficiency: 0 },
  )
  const totalTraded = Object.values(addRes(trading.sent, trading.received)).reduce((a, b) => a + b, 0)
  trading.merchantEfficiency = trading.merchantsUsed > 0 ? totalTraded / trading.merchantsUsed : 0

  // Resource efficiency (range-filtered)
  const efficiency = storageLedgers.reduce(
    (acc, row) => {
      const delta: ResourceTotals = {
        wood: row.woodDelta,
        stone: row.stoneDelta,
        iron: row.ironDelta,
        gold: row.goldDelta,
        food: row.foodDelta,
      }
      // Classify
      const gainReasons = new Set(["PRODUCTION", "TRADE_IN", "QUEST_REWARD", "ADMIN", "NPC_CONVERT"])
      const spendReasons = new Set(["BUILD_COST", "TRAINING_COST", "TRADE_OUT", "RAID_LOSS", "CONSUMPTION"])
      if (gainReasons.has(row.reason)) acc.gained = addRes(acc.gained, {
        wood: Math.max(0, delta.wood),
        stone: Math.max(0, delta.stone),
        iron: Math.max(0, delta.iron),
        gold: Math.max(0, delta.gold),
        food: Math.max(0, delta.food),
      })
      if (spendReasons.has(row.reason)) acc.spent = addRes(acc.spent, {
        wood: Math.abs(Math.min(0, delta.wood)),
        stone: Math.abs(Math.min(0, delta.stone)),
        iron: Math.abs(Math.min(0, delta.iron)),
        gold: Math.abs(Math.min(0, delta.gold)),
        food: Math.abs(Math.min(0, delta.food)),
      })
      return acc
    },
    { gained: emptyRes(), spent: emptyRes(), ratio: 0 },
  )
  const gainedTotal = Object.values(efficiency.gained).reduce((a, b) => a + b, 0)
  const spentTotal = Object.values(efficiency.spent).reduce((a, b) => a + b, 0)
  efficiency.ratio = spentTotal > 0 ? gainedTotal / spentTotal : 0

  const economy: PersonalStatsPayload["economy"] = {
    totalProducedAllTime,
    productionPerHour,
    trading,
    resourceEfficiency: efficiency,
  }

  // Military
  const [reportAnalytics, reportList, troopCounts] = await Promise.all([
    computeReportAnalytics(playerId),
    fetchCombatReportList(playerId),
    prisma.troop.findMany({ where: { villageId: { in: villageIds } } }),
  ])
  const unitsLost = reportList.reduce(
    (acc, r) => {
      if (r.direction === "sent") acc.asAttacker += r.losses.attacker
      else acc.asDefender += r.losses.defender
      return acc
    },
    { asAttacker: 0, asDefender: 0 },
  )
  const favoriteUnitsMap = new Map<string, number>()
  for (const t of troopCounts) {
    favoriteUnitsMap.set(t.type, (favoriteUnitsMap.get(t.type) ?? 0) + t.quantity)
  }
  const favoriteUnits = Array.from(favoriteUnitsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([unitTypeId, count]) => ({ unitTypeId, count }))

  // Units trained estimate from completed TroopProduction records
  const trainedAgg = await prisma.troopProduction.aggregate({
    where: {
      building: { villageId: { in: villageIds } },
      completionAt: { lte: new Date() },
    },
    _sum: { quantity: true },
  })
  const trainedEstimate = trainedAgg._sum.quantity ?? 0

  const military: PersonalStatsPayload["military"] = {
    unitsTrainedEstimate: trainedEstimate,
    unitsLost,
    attackSuccessRate: reportAnalytics.rates.attackSuccess,
    favoriteUnits,
    combatEfficiency: {
      killed: player.troopsKilled,
      lost: player.troopsLost,
      ratio: player.troopsLost > 0 ? player.troopsKilled / player.troopsLost : player.troopsKilled > 0 ? Infinity : 0,
    },
  }

  // Time-series
  // Combat timeline is already available
  const combat = reportAnalytics.timeline

  // Village acquisition timeline
  const villageAcqRows = await prisma.village.findMany({
    where: {
      playerId,
      createdAt: from ? { gte: from, lte: to } : { lte: to },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  const villageAcquisitionsMap = new Map<string, number>()
  for (const row of villageAcqRows) {
    const key = dayKey(row.createdAt)
    villageAcquisitionsMap.set(key, (villageAcquisitionsMap.get(key) ?? 0) + 1)
  }
  const villageAcquisitions = Array.from(villageAcquisitionsMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, count]) => ({ day, count }))

  // Resource production per day (range-filtered)
  const prodRangeRows = storageLedgers.filter((r) => r.reason === "PRODUCTION")
  const prodByDay = new Map<string, ResourceTotals>()
  for (const r of prodRangeRows) {
    const key = dayKey(r.createdAt)
    const prev = prodByDay.get(key) ?? emptyRes()
    prodByDay.set(
      key,
      addRes(prev, {
        wood: Math.max(0, r.woodDelta),
        stone: Math.max(0, r.stoneDelta),
        iron: Math.max(0, r.ironDelta),
        gold: Math.max(0, r.goldDelta),
        food: Math.max(0, r.foodDelta),
      }),
    )
  }
  const resourceProduction = Array.from(prodByDay.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, totals]) => ({ day, ...totals }))

  // Activity by hour (0-23) from AccountActionLog
  const actions = await prisma.accountActionLog.findMany({
    where: { playerId, createdAt: from ? { gte: from, lte: to } : { lte: to } },
    select: { createdAt: true },
  })
  const byHour = new Array(24).fill(0) as number[]
  for (const a of actions) {
    const hour = new Date(a.createdAt).getHours()
    byHour[hour] += 1
  }
  const activityByHour = byHour.map((count, hour) => ({ hour, count }))

  const timeSeries: PersonalStatsPayload["timeSeries"] = { combat, villageAcquisitions, resourceProduction, activityByHour }

  // Comparison (simple averages)
  let comparison: PersonalStatsPayload["comparison"] | undefined
  if (includeComparison) {
    const [tribeAgg, worldAgg] = await Promise.all([
      player.tribeId
        ? prisma.player.aggregate({
            where: { tribeId: player.tribeId, isDeleted: false },
            _avg: { totalPoints: true, villagesUsed: true },
            _sum: { odAttacking: true, odDefending: true, odSupporting: true },
            _count: { _all: true },
          })
        : null,
      prisma.player.aggregate({ where: { isDeleted: false }, _avg: { totalPoints: true, villagesUsed: true }, _sum: { odAttacking: true, odDefending: true, odSupporting: true }, _count: { _all: true } }),
    ])

    comparison = {
      tribe: tribeAgg
        ? {
            avgPoints: tribeAgg._avg.totalPoints ?? 0,
            avgVillages: tribeAgg._avg.villagesUsed ?? 0,
            avgOD:
              tribeAgg._count._all > 0
                ? ((tribeAgg._sum.odAttacking ?? 0) + (tribeAgg._sum.odDefending ?? 0) + (tribeAgg._sum.odSupporting ?? 0)) / tribeAgg._count._all
                : 0,
          }
        : undefined,
      world: worldAgg
        ? {
            avgPoints: worldAgg._avg.totalPoints ?? 0,
            avgVillages: worldAgg._avg.villagesUsed ?? 0,
            avgOD:
              worldAgg._count._all > 0
                ? ((worldAgg._sum.odAttacking ?? 0) + (worldAgg._sum.odDefending ?? 0) + (worldAgg._sum.odSupporting ?? 0)) / worldAgg._count._all
                : 0,
          }
        : undefined,
    }
  }

  return { overview, economy, military, timeSeries, comparison }
}
