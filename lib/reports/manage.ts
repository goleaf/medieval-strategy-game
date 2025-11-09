import { prisma } from "@/lib/db"
import type { ReportKind } from "@prisma/client"

import { fetchCombatReportList, fetchCombatReportDetail, fetchSupportStatus } from "@/lib/reports/queries"

export type SystemFolderKey = "attacks_sent" | "attacks_received" | "scouting" | "support" | "trading"

export interface FolderNode {
  id: string
  name: string
  count: number
  system?: boolean
  key?: SystemFolderKey
}

export interface TagSummary {
  id: string
  label: string
  color?: string | null
  count: number
}

export interface FolderOverviewPayload {
  system: FolderNode[]
  custom: FolderNode[]
  tags: TagSummary[]
  starredCount: number
  archivedCount: number
  unreadCount: number
}

export async function getFolderOverview(playerId: string): Promise<FolderOverviewPayload> {
  const [list, support, starredCount, archivedCount, unreadCount, customFolders, tagRows] = await Promise.all([
    fetchCombatReportList(playerId).catch(() => []),
    fetchSupportStatus(playerId).catch(() => ({ stationedAbroad: [], supportReceived: [], returningMissions: [] })),
    prisma.reportMetadata.count({ where: { ownerAccountId: playerId, starred: true } }),
    prisma.reportMetadata.count({ where: { ownerAccountId: playerId, archived: true } }),
    prisma.reportMetadata.count({ where: { ownerAccountId: playerId, readAt: null } }),
    prisma.reportFolder.findMany({
      where: { ownerAccountId: playerId },
      include: { entries: { select: { refId: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.reportTag.findMany({
      where: { ownerAccountId: playerId },
      include: { entries: { select: { refId: true } } },
      orderBy: { label: "asc" },
    }),
  ])

  const sent = list.filter((r) => r.direction === "sent").length
  const received = list.filter((r) => r.direction === "received").length
  // Approximate counts for support and trading for now
  const scoutingCount = await prisma.attack.count({
    where: { type: "SCOUT", status: "RESOLVED", fromVillage: { playerId } },
  })
  const supportCount = support.returningMissions.length + support.stationedAbroad.length + support.supportReceived.length
  const tradingCount = 0

  const system: FolderNode[] = [
    { id: "sys:attacks_sent", name: "Attacks Sent", count: sent, system: true, key: "attacks_sent" },
    { id: "sys:attacks_received", name: "Attacks Received", count: received, system: true, key: "attacks_received" },
    { id: "sys:scouting", name: "Scouting", count: scoutingCount, system: true, key: "scouting" },
    { id: "sys:support", name: "Support", count: supportCount, system: true, key: "support" },
    { id: "sys:trading", name: "Trading", count: tradingCount, system: true, key: "trading" },
  ]

  const custom: FolderNode[] = customFolders.map((f) => ({ id: f.id, name: f.name, count: f.entries.length }))
  const tags: TagSummary[] = tagRows.map((t) => ({ id: t.id, label: t.label, color: t.color, count: t.entries.length }))

  return { system, custom, tags, starredCount, archivedCount, unreadCount }
}

export async function createFolder(playerId: string, name: string) {
  return prisma.reportFolder.create({ data: { ownerAccountId: playerId, name } })
}

export async function updateMetadata(params: {
  playerId: string
  items: Array<{ kind: ReportKind; refId: string }>
  starred?: boolean
  archived?: boolean
  markRead?: boolean
}) {
  const { playerId, items, starred, archived, markRead } = params
  const updates = items.map((item) =>
    prisma.reportMetadata.upsert({
      where: { ownerAccountId_kind_refId: { ownerAccountId: playerId, kind: item.kind, refId: item.refId } },
      update: {
        ...(starred != null ? { starred } : {}),
        ...(archived != null ? { archived } : {}),
        ...(markRead ? { readAt: new Date() } : {}),
      },
      create: {
        ownerAccountId: playerId,
        kind: item.kind,
        refId: item.refId,
        starred: Boolean(starred),
        archived: Boolean(archived),
        readAt: markRead ? new Date() : null,
      },
    }),
  )
  await prisma.$transaction(updates)
}

export async function moveToFolder(params: {
  playerId: string
  folderId: string
  items: Array<{ kind: ReportKind; refId: string }>
}) {
  const { playerId, folderId, items } = params
  const folder = await prisma.reportFolder.findUnique({ where: { id: folderId } })
  if (!folder || folder.ownerAccountId !== playerId) {
    throw new Error("Folder not found")
  }
  const upserts = items.map((item) =>
    prisma.reportFolderEntry.upsert({
      where: { folderId_ownerAccountId_kind_refId: { folderId, ownerAccountId: playerId, kind: item.kind, refId: item.refId } },
      update: {},
      create: { folderId, ownerAccountId: playerId, kind: item.kind, refId: item.refId },
    }),
  )
  await prisma.$transaction(upserts)
}

export async function createShareToken(params: {
  playerId: string
  kind: ReportKind
  refId: string
  expiresHours?: number
}) {
  const { playerId, kind, refId, expiresHours = 72 } = params
  const expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000)
  const token = await prisma.reportShareToken.create({
    data: { ownerAccountId: playerId, kind, refId, visibility: "PUBLIC", expiresAt },
  })
  return token
}

export async function resolveSharedReport(token: string) {
  const entry = await prisma.reportShareToken.findUnique({ where: { token } })
  if (!entry) return null
  if (entry.expiresAt <= new Date()) return null
  if (entry.kind === "MOVEMENT") {
    // Use owner perspective when building the report
    const detail = await fetchCombatReportDetail(entry.refId, entry.ownerAccountId)
    return { kind: entry.kind, detail }
  }
  // SCOUT shares can be added later (by fetching the original scouting payload)
  return { kind: entry.kind, detail: null }
}

