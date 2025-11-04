import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

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

export async function GET(req: NextRequest) {
  try {
    // Online users (users active in last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const onlineUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: fifteenMinutesAgo,
        },
      },
    })

    // Active players (players active in last 15 minutes)
    const onlinePlayers = await prisma.player.count({
      where: {
        lastActiveAt: {
          gte: fifteenMinutesAgo,
        },
        isDeleted: false,
      },
    })

    // Actions per minute (current minute)
    const now = Date.now()
    const currentMinute = Math.floor(now / 60000)
    const actionsPerMinute = actionCounts.get(currentMinute) || 0

    // Average actions per minute (last 10 minutes)
    let totalActions = 0
    let minuteCount = 0
    for (let i = 0; i < 10; i++) {
      const minute = currentMinute - i
      const count = actionCounts.get(minute) || 0
      totalActions += count
      if (count > 0) minuteCount++
    }
    const avgActionsPerMinute = minuteCount > 0 ? totalActions / minuteCount : 0

    // Queued jobs depth (simplified - in production, check actual job queue)
    // For now, count pending attacks and movements
    const queuedAttacks = await prisma.attack.count({
      where: {
        status: "IN_PROGRESS",
      },
    })

    const queuedMovements = await prisma.movement.count({
      where: {
        status: "IN_PROGRESS",
      },
    })

    const queuedJobsDepth = queuedAttacks + queuedMovements

    // Error logs (last 50)
    const recentErrors = errorLogs.slice(-50).map((e) => ({
      timestamp: e.timestamp.toISOString(),
      message: e.message,
      error: e.error.substring(0, 200), // Truncate long errors
    }))

    // Additional stats
    const totalPlayers = await prisma.player.count({
      where: { isDeleted: false },
    })

    const totalVillages = await prisma.village.count()

    const totalAttacks = await prisma.attack.count({
      where: {
        status: "IN_PROGRESS",
      },
    })

    const worldConfig = await prisma.worldConfig.findFirst()

    return NextResponse.json(
      {
        stats: {
          onlineUsers,
          onlinePlayers,
          actionsPerMinute,
          avgActionsPerMinute: Math.round(avgActionsPerMinute * 10) / 10,
          queuedJobsDepth,
          totalPlayers,
          totalVillages,
          activeAttacks: totalAttacks,
          worldSpeed: worldConfig?.speed || 1,
          gameRunning: worldConfig?.isRunning || false,
        },
        errorLogs: recentErrors,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Get stats error:", error)
    trackError("Failed to get stats", String(error))
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

