// Admin utility functions for tracking and logging
import { authenticateAdmin } from "@/app/api/admin/middleware"

// In-memory store for tracking actions (in production, use Redis or database)
const actionCounts: Map<number, number> = new Map() // timestamp -> count
const errorLogs: Array<{ timestamp: Date; message: string; error: string }> = []
const errorCounts: Map<number, number> = new Map() // minute -> errors

// Track actions per minute
export function trackAction() {
  const now = Date.now()
  const minute = Math.floor(now / 60000)
  actionCounts.set(minute, (actionCounts.get(minute) || 0) + 1)

  // Clean up old entries (keep last 60 minutes)
  const cutoff = minute - 60
  for (const [key] of actionCounts) {
    if (key < cutoff) {
      actionCounts.delete(key)
    }
  }
}

// Track errors
export function trackError(message: string, error: string) {
  errorLogs.push({
    timestamp: new Date(),
    message,
    error,
  })

  // Keep only last 100 errors
  if (errorLogs.length > 100) {
    errorLogs.shift()
  }

  // Increment per-minute error counter
  const minute = Math.floor(Date.now() / 60000)
  errorCounts.set(minute, (errorCounts.get(minute) || 0) + 1)
  // Trim to last 60 minutes
  const cutoff = minute - 60
  for (const [m] of errorCounts) {
    if (m < cutoff) errorCounts.delete(m)
  }
}

// Get action counts for stats
export function getActionCounts() {
  return actionCounts
}

// Get error logs for stats
export function getErrorLogs() {
  return errorLogs
}

export function getErrorCounts() {
  return errorCounts
}

// Re-export admin authentication functions
export { authenticateAdmin }
