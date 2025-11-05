import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    // Get basic player statistics
    const totalPlayers = await prisma.player.count({
      where: { isDeleted: false }
    })

    // Get active players (active in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeUsers = await prisma.player.count({
      where: {
        isDeleted: false,
        lastActiveAt: {
          gte: oneDayAgo
        }
      }
    })

    // Calculate total villages (as a proxy for "views" since we don't track actual views)
    const totalVillages = await prisma.village.count({
      where: {
        player: {
          isDeleted: false
        }
      }
    })

    // Mock data for demonstration (in a real app, you'd track these metrics)
    const totalViews = Math.floor(totalVillages * 2.5) // Estimate based on villages
    const averageLoadTime = 1.2 + Math.random() * 0.8 // 1.2-2.0 seconds
    const errorRate = Math.random() * 0.05 // 0-5% error rate

    // Mock top features data
    const topFeatures = [
      { feature: "Resources Tab", usage: Math.floor(totalViews * 0.35) },
      { feature: "Overview Tab", usage: Math.floor(totalViews * 0.28) },
      { feature: "Troops Tab", usage: Math.floor(totalViews * 0.20) },
      { feature: "Warehouse Tab", usage: Math.floor(totalViews * 0.12) },
      { feature: "Culture Points Tab", usage: Math.floor(totalViews * 0.05) },
    ]

    return successResponse({
      totalPlayers,
      activeUsers,
      totalViews,
      averageLoadTime,
      errorRate,
      topFeatures,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
