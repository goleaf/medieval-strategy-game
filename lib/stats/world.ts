import { prisma } from "@/lib/db"
import { resolveRange, dayKey, type TimeRangeKey } from "./time"

export interface WorldStatsPayload {
  world: { id: string; worldName: string; worldCode: string; ageDays: number; startedAt: string | null; estimatedEndDate: string | null }
  population: {
    totalPlayers: number
    active24h: number
    tribeMembershipPct: number
    byPoints: Array<{ bucket: string; count: number }>
  }
  economy: {
    totalProducedRange: { wood: number; stone: number; iron: number; gold: number; food: number }
    avgVillagePopulation: number
    netProductionVsConsumption: number
  }
  military: {
    totalBattles: number
    mostAggressivePlayers: Array<{ id: string; playerName: string | null; attacks: number }>
    mostDefensivePlayers: Array<{ id: string; playerName: string | null; defenses: number }>
    mostAggressiveTribes: Array<{ id: string; name: string; tag: string; attacks: number }>
    activeWars: Array<{ id: string; attacker: { id: string; name: string; tag: string }; defender: { id: string; name: string; tag: string } }>
  }
  timeSeries: {
    battlesPerDay: Array<{ day: string; count: number }>
    productionPerDay: Array<{ day: string; wood: number; stone: number; iron: number; gold: number; food: number }>
    registrationsPerDay: Array<{ day: string; players: number }>
  }
}

function emptyRes() { return { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 } }

export async function computeWorldStats(params: { worldId?: string; range?: TimeRangeKey | string }): Promise<WorldStatsPayload> {
  const { worldId, range } = params
  const { from, to } = resolveRange(range)

  const world = await (async () => {
    if (worldId) return prisma.gameWorld.findUnique({ where: { id: worldId } })
    const first = await prisma.gameWorld.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } })
    return first
  })()
  if (!world) throw new Error("World not found")

  const ageDays = world.startedAt ? Math.max(0, Math.floor((Date.now() - new Date(world.startedAt).getTime()) / 86_400_000)) : 0

  // Population
  const [players, active24h] = await Promise.all([
    prisma.player.findMany({ where: { gameWorldId: world.id, isDeleted: false }, select: { id: true, playerName: true, totalPoints: true, tribeId: true, createdAt: true } }),
    prisma.player.count({ where: { gameWorldId: world.id, lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ])
  const totalPlayers = players.length
  const tribeMembers = players.filter((p) => p.tribeId).length
  const tribeMembershipPct = totalPlayers > 0 ? tribeMembers / totalPlayers : 0
  // Points buckets
  const buckets = [
    { min: 0, max: 999, label: "0-999" },
    { min: 1000, max: 4999, label: "1k-4.9k" },
    { min: 5000, max: 9999, label: "5k-9.9k" },
    { min: 10000, max: 24999, label: "10k-24.9k" },
    { min: 25000, max: 49999, label: "25k-49.9k" },
    { min: 50000, max: Infinity, label: "50k+" },
  ]
  const byPoints = buckets.map((b) => ({ bucket: b.label, count: players.filter((p) => p.totalPoints >= b.min && p.totalPoints <= b.max).length }))

  // Economy
  const villageIds = (
    await prisma.village.findMany({ where: { continent: { worldId: world.id } }, select: { id: true, population: true } })
  )
  const ids = villageIds.map((v) => v.id)
  const avgVillagePopulation = villageIds.length ? villageIds.reduce((s, v) => s + v.population, 0) / villageIds.length : 0

  const storageRows = await prisma.villageStorageLedger.findMany({
    where: { villageId: { in: ids }, createdAt: from ? { gte: from, lte: to } : { lte: to } },
    select: { reason: true, woodDelta: true, stoneDelta: true, ironDelta: true, goldDelta: true, foodDelta: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  const totalProducedRange = storageRows
    .filter((r) => r.reason === "PRODUCTION")
    .reduce(
      (acc, r) => ({
        wood: acc.wood + Math.max(0, r.woodDelta),
        stone: acc.stone + Math.max(0, r.stoneDelta),
        iron: acc.iron + Math.max(0, r.ironDelta),
        gold: acc.gold + Math.max(0, r.goldDelta),
        food: acc.food + Math.max(0, r.foodDelta),
      }),
      emptyRes(),
    )
  const net = storageRows.reduce((acc, r) => acc + r.woodDelta + r.stoneDelta + r.ironDelta + r.goldDelta + r.foodDelta, 0)
  const cons = storageRows
    .filter((r) => r.reason === "CONSUMPTION")
    .reduce((acc, r) => acc + Math.abs(Math.min(0, r.woodDelta + r.stoneDelta + r.ironDelta + r.goldDelta + r.foodDelta)), 0)
  const netProductionVsConsumption = cons > 0 ? net / cons : 0

  // Military
  const reports = await prisma.rallyPointMovementReport.findMany({
    where: { movement: { fromVillage: { continent: { worldId: world.id } } }, createdAt: from ? { gte: from, lte: to } : { lte: to } },
    include: { movement: { select: { ownerAccountId: true, toVillage: { select: { playerId: true } } } } },
    orderBy: { createdAt: "desc" },
  })
  const totalBattles = reports.length
  const attackCounts = new Map<string, number>()
  const defenseCounts = new Map<string, number>()
  for (const r of reports) {
    const attackerId = r.movement.ownerAccountId
    attackCounts.set(attackerId, (attackCounts.get(attackerId) ?? 0) + 1)
    const defenderId = r.movement.toVillage?.playerId
    if (defenderId) defenseCounts.set(defenderId, (defenseCounts.get(defenderId) ?? 0) + 1)
  }
  const attackerIds = Array.from(attackCounts.keys())
  const defenderIds = Array.from(defenseCounts.keys())
  const playersMap = new Map((await prisma.player.findMany({ where: { id: { in: [...attackerIds, ...defenderIds] } }, select: { id: true, playerName: true, tribeId: true } })).map((p) => [p.id, p]))
  const tribeAttackCounts = new Map<string, number>()
  for (const [pid, count] of attackCounts.entries()) {
    const tribeId = playersMap.get(pid)?.tribeId
    if (!tribeId) continue
    tribeAttackCounts.set(tribeId, (tribeAttackCounts.get(tribeId) ?? 0) + count)
  }
  const tribesMap = new Map((await prisma.tribe.findMany({ where: { id: { in: Array.from(tribeAttackCounts.keys()) } } })).map((t) => [t.id, t]))
  const mostAggressiveTribes = Array.from(tribeAttackCounts.entries())
    .map(([id, attacks]) => ({ id, name: tribesMap.get(id)?.name ?? "", tag: tribesMap.get(id)?.tag ?? "", attacks }))
    .sort((a, b) => b.attacks - a.attacks)
    .slice(0, 10)
  const mostAggressivePlayers = Array.from(attackCounts.entries())
    .map(([id, attacks]) => ({ id, playerName: playersMap.get(id)?.playerName ?? null, attacks }))
    .sort((a, b) => b.attacks - a.attacks)
    .slice(0, 10)
  const mostDefensivePlayers = Array.from(defenseCounts.entries())
    .map(([id, defenses]) => ({ id, playerName: playersMap.get(id)?.playerName ?? null, defenses }))
    .sort((a, b) => b.defenses - a.defenses)
    .slice(0, 10)

  const activeWars = (await prisma.war.findMany({ where: { status: "ACTIVE" }, include: { attackerTribe: true, defenderTribe: true } })).map((w) => ({ id: w.id, attacker: { id: w.attackerTribe.id, name: w.attackerTribe.name, tag: w.attackerTribe.tag }, defender: { id: w.defenderTribe.id, name: w.defenderTribe.name, tag: w.defenderTribe.tag } }))

  // Timelines
  const battlesPerDayMap = new Map<string, number>()
  for (const r of reports) {
    const k = dayKey(r.createdAt)
    battlesPerDayMap.set(k, (battlesPerDayMap.get(k) ?? 0) + 1)
  }
  const battlesPerDay = Array.from(battlesPerDayMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, count]) => ({ day, count }))

  const prodPerDayMap = new Map<string, ReturnType<typeof emptyRes>>()
  for (const r of storageRows.filter((x) => x.reason === "PRODUCTION")) {
    const k = dayKey(r.createdAt)
    const prev = prodPerDayMap.get(k) ?? emptyRes()
    prodPerDayMap.set(k, {
      wood: prev.wood + Math.max(0, r.woodDelta),
      stone: prev.stone + Math.max(0, r.stoneDelta),
      iron: prev.iron + Math.max(0, r.ironDelta),
      gold: prev.gold + Math.max(0, r.goldDelta),
      food: prev.food + Math.max(0, r.foodDelta),
    })
  }
  const productionPerDay = Array.from(prodPerDayMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, r]) => ({ day, ...r }))

  const registrationsPerDayMap = new Map<string, number>()
  for (const p of players) {
    const k = dayKey(p.createdAt)
    registrationsPerDayMap.set(k, (registrationsPerDayMap.get(k) ?? 0) + 1)
  }
  const registrationsPerDay = Array.from(registrationsPerDayMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, players]) => ({ day, players }))

  return {
    world: {
      id: world.id,
      worldName: world.worldName,
      worldCode: world.worldCode,
      ageDays,
      startedAt: world.startedAt?.toISOString() ?? null,
      estimatedEndDate: null,
    },
    population: { totalPlayers, active24h, tribeMembershipPct, byPoints },
    economy: { totalProducedRange, avgVillagePopulation, netProductionVsConsumption },
    military: { totalBattles, mostAggressivePlayers, mostDefensivePlayers, mostAggressiveTribes, activeWars },
    timeSeries: { battlesPerDay, productionPerDay, registrationsPerDay },
  }
}

