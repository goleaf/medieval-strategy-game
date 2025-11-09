import { prisma } from "@/lib/db"
import { MULTI_ACCOUNT_CONFIG } from "./config"
import type { LinkEvidence, MultiAccountReport, SuspiciousPair } from "./types"

function withinLookback(date: Date, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return date >= since
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

async function getAllowlistedPairs() {
  const allow = await prisma.multiAccountAllowlist.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  })
  const pair = new Set<string>()
  const ip = new Set<string>()
  const device = new Set<string>()
  for (const a of allow) {
    if (a.type === "PAIR" && a.userIdA && a.userIdB) pair.add(pairKey(a.userIdA, a.userIdB))
    if (a.type === "IP" && a.ipAddress) ip.add(a.ipAddress)
    if (a.type === "DEVICE" && a.deviceTokenHash) device.add(a.deviceTokenHash)
  }

  // Automatically allowlist pairs that are in an active Dual (co-play) relationship
  // A dual consists of a lobby user (lobbyUserId) and the owner player's user (player.user.id)
  const duals = await prisma.dual.findMany({
    where: { isActive: true, acceptedAt: { not: null } },
    include: { player: { include: { user: true } } },
  })
  for (const d of duals) {
    const userA = d.lobbyUserId
    const userB = d.player.user?.id
    if (userA && userB) pair.add(pairKey(userA, userB))
  }
  return { pair, ip, device }
}

export async function generateMultiAccountReport(): Promise<MultiAccountReport> {
  const days = MULTI_ACCOUNT_CONFIG.lookbackDays
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const allow = await getAllowlistedPairs()

  // 1) IP-based links
  const attempts = await prisma.loginAttempt.findMany({
    where: { createdAt: { gte: since }, success: true },
    select: { userId: true, ipAddress: true },
  })
  const ipToUsers = new Map<string, Set<string>>()
  for (const a of attempts) {
    if (!a.userId || !a.ipAddress) continue
    if (allow.ip.has(a.ipAddress)) continue
    if (!ipToUsers.has(a.ipAddress)) ipToUsers.set(a.ipAddress, new Set())
    ipToUsers.get(a.ipAddress)!.add(a.userId)
  }
  const ipEvidences = new Map<string, LinkEvidence>()
  for (const [ip, users] of ipToUsers) {
    if (users.size < 2) continue
    const list = [...users]
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = pairKey(list[i], list[j])
        if (allow.pair.has(key)) continue
        ipEvidences.set(key, {
          type: "IP",
          score: MULTI_ACCOUNT_CONFIG.baseIpScore,
          evidence: { ip, users: list },
        })
      }
    }
  }

  // 2) Device (trusted device token) links
  const devices = await prisma.trustedDevice.findMany({
    where: { expiresAt: { gte: since } },
    select: { userId: true, deviceTokenHash: true, userAgent: true },
  })
  const tokenToUsers = new Map<string, Set<string>>()
  for (const d of devices) {
    if (!d.deviceTokenHash) continue
    if (allow.device.has(d.deviceTokenHash)) continue
    if (!tokenToUsers.has(d.deviceTokenHash)) tokenToUsers.set(d.deviceTokenHash, new Set())
    tokenToUsers.get(d.deviceTokenHash)!.add(d.userId)
  }
  const deviceEvidences = new Map<string, LinkEvidence>()
  for (const [token, users] of tokenToUsers) {
    if (users.size < 2) continue
    const list = [...users]
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = pairKey(list[i], list[j])
        if (allow.pair.has(key)) continue
        deviceEvidences.set(key, {
          type: "DEVICE",
          score: MULTI_ACCOUNT_CONFIG.baseDeviceScore,
          evidence: { deviceTokenHash: token, users: list },
        })
      }
    }
  }

  // 3) Resource flow (shipments + market)
  // We approximate by shipments between different players' villages in lookback window.
  const shipments = await prisma.shipment.findMany({
    where: {
      createdAt: { gte: since },
    },
    select: {
      sourceVillage: { select: { playerId: true } },
      targetVillage: { select: { playerId: true } },
      wood: true,
      stone: true,
      iron: true,
      gold: true,
      food: true,
    },
  })
  const flow = new Map<string, { aToB: number; bToA: number }>()
  function addFlow(a: string, b: string, amount: number) {
    const key = pairKey(a, b)
    if (!flow.has(key)) flow.set(key, { aToB: 0, bToA: 0 })
    const rec = flow.get(key)!
    if (a < b) rec.aToB += amount
    else rec.bToA += amount
  }
  for (const s of shipments) {
    const a = s.sourceVillage.playerId
    const b = s.targetVillage.playerId
    if (!a || !b || a === b) continue
    const amt = (s.wood ?? 0) + (s.stone ?? 0) + (s.iron ?? 0) + (s.gold ?? 0) + (s.food ?? 0)
    if (amt <= 0) continue
    addFlow(a, b, amt)
  }
  const resourceEvidences = new Map<string, LinkEvidence>()
  for (const [key, rec] of flow) {
    const totalTransfers = rec.aToB + rec.bToA
    if (totalTransfers <= 0) continue
    const ratio = rec.aToB > rec.bToA ? rec.aToB / Math.max(1, rec.bToA) : rec.bToA / Math.max(1, rec.aToB)
    if (ratio >= MULTI_ACCOUNT_CONFIG.minNetResourceRatio && totalTransfers > 0) {
      resourceEvidences.set(key, {
        type: "RESOURCE_FLOW",
        score: Math.min(1, MULTI_ACCOUNT_CONFIG.resourceFlowWeight * (ratio / 10)),
        evidence: { totals: rec, ratio },
      })
    }
  }

  // 4) Support patterns (reinforcements)
  const reinforcements = await prisma.reinforcement.findMany({
    where: { createdAt: { gte: since } },
    select: {
      fromVillage: { select: { playerId: true } },
      toVillage: { select: { playerId: true } },
      status: true,
    },
  })
  const supportCounts = new Map<string, number>()
  for (const r of reinforcements) {
    const a = r.fromVillage.playerId
    const b = r.toVillage.playerId
    if (!a || !b || a === b) continue
    const key = pairKey(a, b)
    supportCounts.set(key, (supportCounts.get(key) ?? 0) + 1)
  }
  const supportEvidences = new Map<string, LinkEvidence>()
  for (const [key, count] of supportCounts) {
    if (count >= MULTI_ACCOUNT_CONFIG.minSupportArrivals) {
      supportEvidences.set(key, {
        type: "SUPPORT",
        score: Math.min(1, MULTI_ACCOUNT_CONFIG.supportWeight * (count / 10)),
        evidence: { arrivals: count },
      })
    }
  }

  // 5) Login patterns (simultaneous activity via sessions)
  const sessions = await prisma.userSession.findMany({
    where: { lastSeenAt: { gte: since } },
    select: { userId: true, ipAddress: true, lastSeenAt: true },
  })
  // Bucket per day user active
  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const dayToUsers = new Map<string, Set<string>>()
  for (const s of sessions) {
    const key = dayKey(s.lastSeenAt)
    if (!dayToUsers.has(key)) dayToUsers.set(key, new Set())
    dayToUsers.get(key)!.add(s.userId)
  }
  const pairToSimultaneousDays = new Map<string, number>()
  for (const [day, users] of dayToUsers) {
    const list = [...users]
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = pairKey(list[i], list[j])
        pairToSimultaneousDays.set(key, (pairToSimultaneousDays.get(key) ?? 0) + 1)
      }
    }
  }
  const loginEvidences = new Map<string, LinkEvidence>()
  for (const [key, daysTogether] of pairToSimultaneousDays) {
    if (daysTogether >= MULTI_ACCOUNT_CONFIG.minSimultaneousDays) {
      loginEvidences.set(key, {
        type: "LOGIN_PATTERN",
        score: Math.min(1, MULTI_ACCOUNT_CONFIG.loginPatternWeight * (daysTogether / 10)),
        evidence: { daysTogether },
      })
    }
  }

  // Collect pairs and compute weights
  const pairs = new Map<string, SuspiciousPair>()
  function upsertPair(key: string, e: LinkEvidence) {
    const [a, b] = key.split(":")
    if (!pairs.has(key)) pairs.set(key, { userIdA: a, userIdB: b, weight: 0, evidences: [] })
    const rec = pairs.get(key)!
    rec.evidences.push(e)
  }
  for (const [k, e] of ipEvidences) upsertPair(k, e)
  for (const [k, e] of deviceEvidences) upsertPair(k, e)
  for (const [k, e] of resourceEvidences) upsertPair(k, e)
  for (const [k, e] of supportEvidences) upsertPair(k, e)
  for (const [k, e] of loginEvidences) upsertPair(k, e)

  for (const rec of pairs.values()) {
    const ip = rec.evidences.find((e) => e.type === "IP")?.score ?? 0
    const dev = rec.evidences.find((e) => e.type === "DEVICE")?.score ?? 0
    const rf = rec.evidences.find((e) => e.type === "RESOURCE_FLOW")?.score ?? 0
    const sp = rec.evidences.find((e) => e.type === "SUPPORT")?.score ?? 0
    const lp = rec.evidences.find((e) => e.type === "LOGIN_PATTERN")?.score ?? 0
    const weight = Math.min(1, ip + dev + rf + sp + lp)
    rec.weight = weight
  }

  // Build per-user scores
  const userScores: Record<string, number> = {}
  for (const rec of pairs.values()) {
    userScores[rec.userIdA] = Math.max(userScores[rec.userIdA] ?? 0, rec.weight)
    userScores[rec.userIdB] = Math.max(userScores[rec.userIdB] ?? 0, rec.weight)
  }

  // Filter for report threshold
  const flagged = [...pairs.values()]
    .filter((p) => p.weight >= MULTI_ACCOUNT_CONFIG.autoReportThreshold)
    .sort((a, b) => b.weight - a.weight)

  return {
    generatedAt: new Date().toISOString(),
    lookbackDays: days,
    pairs: flagged,
    userScores,
  }
}

export async function persistReport(report: MultiAccountReport) {
  await prisma.moderationReport.create({
    data: {
      type: "MULTI_ACCOUNT",
      severity: report.pairs.length > 5 ? "HIGH" : report.pairs.length > 0 ? "MEDIUM" : "LOW",
      status: "OPEN",
      summary: `Multi-account report with ${report.pairs.length} flagged pairs`,
      details: report as unknown as any,
      involvedUserIds: Object.keys(report.userScores),
    },
  })
}
