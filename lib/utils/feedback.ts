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

export function submitFeedback(payload: Omit<FeedbackEntry, "id" | "createdAt" | "status"> & { status?: FeedbackStatus }): FeedbackEntry {
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

export function listFeedback(): FeedbackEntry[] {
  // Most recent first
  return [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function updateFeedbackStatus(id: number, status: FeedbackStatus): FeedbackEntry | null {
  const idx = entries.findIndex((e) => e.id === id)
  if (idx === -1) return null
  entries[idx].status = status
  return entries[idx]
}

