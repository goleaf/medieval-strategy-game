import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

// NPC Merchant configuration constants (could be moved to database later)
const DEFAULT_GOLD_COST = 3
const DEFAULT_MIN_EXCHANGE = 50

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get("action")

    if (action === "analytics") {
      return getAnalytics()
    } else if (action === "transactions") {
      return getTransactions(req)
    } else if (action === "settings") {
      return getSettings()
    }

    return errorResponse("Invalid action parameter", 400)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

async function getAnalytics() {
  try {
    // Get total NPC merchant transactions
    const totalExchanges = await prisma.auditLog.count({
      where: { action: "NPC_MERCHANT_EXCHANGE" },
    })

    const totalBalances = await prisma.auditLog.count({
      where: { action: "NPC_MERCHANT_BALANCE" },
    })

    const totalTransactions = totalExchanges + totalBalances

    // Get gold spent on NPC merchant
    const goldSpentResult = await prisma.auditLog.findMany({
      where: {
        action: { in: ["NPC_MERCHANT_EXCHANGE", "NPC_MERCHANT_BALANCE"] },
      },
      select: {
        details: true,
      },
    })

    let totalGoldSpent = 0
    goldSpentResult.forEach(log => {
      try {
        const details = JSON.parse(log.details)
        totalGoldSpent += details.goldCost || DEFAULT_GOLD_COST
      } catch (error) {
        // Skip malformed entries
      }
    })

    // Get recent transactions (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentTransactions = await prisma.auditLog.count({
      where: {
        action: { in: ["NPC_MERCHANT_EXCHANGE", "NPC_MERCHANT_BALANCE"] },
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    // Get most active players
    const playerUsage = await prisma.auditLog.groupBy({
      by: ["targetId"],
      where: {
        action: { in: ["NPC_MERCHANT_EXCHANGE", "NPC_MERCHANT_BALANCE"] },
        targetType: "village",
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    })

    // Get village details for the most active players
    const villageIds = playerUsage.map(p => p.targetId)
    const villages = await prisma.village.findMany({
      where: { id: { in: villageIds } },
      include: { player: { select: { playerName: true } } },
    })

    const topPlayers = playerUsage.map(usage => {
      const village = villages.find(v => v.id === usage.targetId)
      return {
        villageId: usage.targetId,
        villageName: village?.name || "Unknown",
        playerName: village?.player?.playerName || "Unknown",
        transactionCount: usage._count.id,
      }
    })

    // Get resource exchange statistics
    const exchangeLogs = await prisma.auditLog.findMany({
      where: { action: "NPC_MERCHANT_EXCHANGE" },
      select: { details: true },
    })

    const resourceStats: Record<string, { from: number; to: number }> = {
      WOOD: { from: 0, to: 0 },
      STONE: { from: 0, to: 0 },
      IRON: { from: 0, to: 0 },
      GOLD: { from: 0, to: 0 },
      FOOD: { from: 0, to: 0 },
    }

    exchangeLogs.forEach(log => {
      try {
        const details = JSON.parse(log.details)
        const fromResource = details.fromResource
        const toResource = details.toResource
        const amount = details.amount

        if (resourceStats[fromResource]) {
          resourceStats[fromResource].from += amount
        }
        if (resourceStats[toResource]) {
          resourceStats[toResource].to += amount
        }
      } catch (error) {
        // Skip malformed entries
      }
    })

    return successResponse({
      totalTransactions,
      totalExchanges,
      totalBalances,
      totalGoldSpent,
      recentTransactions,
      topPlayers,
      resourceStats,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

async function getTransactions(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get("page") || "1")
    const limit = parseInt(url.searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    const transactions = await prisma.auditLog.findMany({
      where: {
        action: { in: ["NPC_MERCHANT_EXCHANGE", "NPC_MERCHANT_BALANCE"] },
      },
      include: {
        admin: { select: { user: { select: { username: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })

    const totalCount = await prisma.auditLog.count({
      where: {
        action: { in: ["NPC_MERCHANT_EXCHANGE", "NPC_MERCHANT_BALANCE"] },
      },
    })

    // Enhance transaction data
    const enhancedTransactions = transactions.map(log => {
      let details
      try {
        details = JSON.parse(log.details)
      } catch (error) {
        details = {}
      }

      return {
        id: log.id,
        action: log.action,
        villageId: log.targetId,
        playerId: details.playerId,
        details,
        createdAt: log.createdAt,
        adminUsername: log.admin?.user?.username || "system",
      }
    })

    return successResponse({
      transactions: enhancedTransactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

async function getSettings() {
  try {
    // For now, return hardcoded settings
    // In the future, this could be stored in a database table
    const settings = {
      goldCost: DEFAULT_GOLD_COST,
      minExchangeAmount: DEFAULT_MIN_EXCHANGE,
      enabled: true,
      availableResources: ["WOOD", "STONE", "IRON", "GOLD", "FOOD"],
    }

    return successResponse(settings)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "updateSettings") {
      // For now, settings are hardcoded
      // In the future, implement database storage for settings
      return successResponse({ message: "Settings updated successfully" })
    }

    return errorResponse("Invalid action", 400)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
