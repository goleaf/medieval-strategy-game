import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { authenticateAdmin } from "@/app/api/admin/middleware"

export async function GET(req: NextRequest) {
  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(req)
    if (!authResult.success) {
      return errorResponse("Unauthorized", 401)
    }

    // Get all instant completion audit logs
    const completionLogs = await prisma.auditLog.findMany({
      where: {
        action: "INSTANT_COMPLETE",
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Parse the details from audit logs
    const parsedLogs = completionLogs.map(log => {
      try {
        const details = JSON.parse(log.details || "{}")
        return {
          id: log.id,
          playerId: details.playerId,
          villageId: details.villageId,
          completedBuildings: details.completedBuildings || 0,
          completedResearch: details.completedResearch || 0,
          totalGoldCost: details.totalGoldCost || 0,
          createdAt: log.createdAt.toISOString(),
        }
      } catch {
        return null
      }
    }).filter(Boolean)

    // Get player names
    const playerIds = [...new Set(parsedLogs.map(log => log!.playerId).filter(Boolean))]
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
      },
      select: {
        id: true,
        playerName: true,
      },
    })

    const playerMap = new Map(players.map(p => [p.id, p.playerName]))

    // Calculate statistics
    const totalCompletions = parsedLogs.length
    const totalGoldSpent = parsedLogs.reduce((sum, log) => sum + (log!.totalGoldCost || 0), 0)
    const totalBuildingsCompleted = parsedLogs.reduce((sum, log) => sum + (log!.completedBuildings || 0), 0)
    const totalResearchCompleted = parsedLogs.reduce((sum, log) => sum + (log!.completedResearch || 0), 0)

    // Group by player
    const playerStats = new Map<string, { completions: number; totalGoldSpent: number }>()

    parsedLogs.forEach(log => {
      if (!log!.playerId) return

      const existing = playerStats.get(log!.playerId) || { completions: 0, totalGoldSpent: 0 }
      playerStats.set(log!.playerId, {
        completions: existing.completions + 1,
        totalGoldSpent: existing.totalGoldSpent + (log!.totalGoldCost || 0),
      })
    })

    const completionsByPlayer = Array.from(playerStats.entries())
      .map(([playerId, stats]) => ({
        playerId,
        playerName: playerMap.get(playerId) || "Unknown Player",
        completions: stats.completions,
        totalGoldSpent: stats.totalGoldSpent,
      }))
      .sort((a, b) => b.completions - a.completions)

    // Recent completions with player names
    const recentCompletions = parsedLogs.slice(0, 50).map(log => ({
      ...log,
      playerName: playerMap.get(log!.playerId!) || "Unknown Player",
    })) as any[]

    return successResponse({
      totalCompletions,
      totalGoldSpent,
      totalBuildingsCompleted,
      totalResearchCompleted,
      completionsByPlayer,
      recentCompletions,
    })

  } catch (error) {
    console.error("Failed to fetch instant completion stats:", error)
    return serverErrorResponse(error)
  }
}
