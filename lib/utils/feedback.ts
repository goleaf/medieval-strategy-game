import { trackError } from "@/lib/admin-utils"

export type FeedbackStatus = "open" | "triaged" | "resolved"

export interface FeedbackEntry {
  id: number
  createdAt: Date
  playerId?: string
  category: string
  severity: "low" | "medium" | "high"
  summary: string
  details?: string
  contact?: string
  status: FeedbackStatus
}

let nextId = 1
const FEEDBACK_LIMIT = 500
const entries: FeedbackEntry[] = []

export async function submitFeedback(payload: Omit<FeedbackEntry, "id" | "createdAt" | "status"> & { status?: FeedbackStatus }): Promise<FeedbackEntry> {
  try {
    const { prisma } = await import("@/lib/db")
    const saved = await prisma.feedbackEntry.create({
      data: {
        playerId: payload.playerId ?? null,
        category: payload.category,
        severity: payload.severity,
        summary: payload.summary,
        details: payload.details ?? null,
        contact: payload.contact ?? null,
        status: payload.status ?? "open",
      },
    })
    return {
      id: saved.id,
      createdAt: saved.createdAt,
      playerId: saved.playerId ?? undefined,
      category: saved.category,
      severity: saved.severity as any,
      summary: saved.summary,
      details: saved.details ?? undefined,
      contact: saved.contact ?? undefined,
      status: saved.status as FeedbackStatus,
    }
  } catch (e) {
    // Fallback to in-memory
    const entry: FeedbackEntry = {
      id: nextId++,
      createdAt: new Date(),
      status: payload.status ?? "open",
      ...payload,
    }
    entries.push(entry)
    if (entries.length > FEEDBACK_LIMIT) entries.shift()
    return entry
  }
}

export async function listFeedback(): Promise<FeedbackEntry[]> {
  try {
    const { prisma } = await import("@/lib/db")
    const rows = await prisma.feedbackEntry.findMany({ orderBy: { createdAt: "desc" }, take: 500 })
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      playerId: r.playerId ?? undefined,
      category: r.category,
      severity: r.severity as any,
      summary: r.summary,
      details: r.details ?? undefined,
      contact: r.contact ?? undefined,
      status: r.status as FeedbackStatus,
    }))
  } catch (_e) {
    // In-memory fallback
    return [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

export async function updateFeedbackStatus(id: number, status: FeedbackStatus): Promise<FeedbackEntry | null> {
  try {
    const { prisma } = await import("@/lib/db")
    const updated = await prisma.feedbackEntry.update({ where: { id }, data: { status } })
    return {
      id: updated.id,
      createdAt: updated.createdAt,
      playerId: updated.playerId ?? undefined,
      category: updated.category,
      severity: updated.severity as any,
      summary: updated.summary,
      details: updated.details ?? undefined,
      contact: updated.contact ?? undefined,
      status: updated.status as FeedbackStatus,
    }
  } catch (_e) {
    const idx = entries.findIndex((e) => e.id === id)
    if (idx === -1) return null
    entries[idx].status = status
    return entries[idx]
  }
}
