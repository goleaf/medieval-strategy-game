// Admin utility functions for tracking and logging

// In-memory store for tracking actions (in production, use Redis or database)
const actionCounts: Map<number, number> = new Map() // timestamp -> count
const errorLogs: Array<{ timestamp: Date; message: string; error: string }> = []

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
}

// Get action counts for stats
export function getActionCounts() {
  return actionCounts
}

// Get error logs for stats
export function getErrorLogs() {
  return errorLogs
}
