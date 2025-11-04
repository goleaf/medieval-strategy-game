import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import type { TroopType } from "@prisma/client"
import { authenticateAdmin } from "../../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

interface TroopBalance {
  type: TroopType
  cost: {
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  }
  stats: {
    attack: number
    defense: number
    speed: number
    health: number
  }
}

// Validation: Ensure stats sum doesn't exceed reasonable limits
const MAX_STAT_SUM = 200 // Maximum sum of attack + defense + speed + health/10
const MIN_STAT_SUM = 50 // Minimum sum to prevent useless units

function validateTroopBalance(balance: TroopBalance): { valid: boolean; error?: string } {
  const statSum = balance.stats.attack + balance.stats.defense + balance.stats.speed + balance.stats.health / 10

  if (statSum > MAX_STAT_SUM) {
    return {
      valid: false,
      error: `Total stat sum (${statSum.toFixed(1)}) exceeds maximum of ${MAX_STAT_SUM}`,
    }
  }

  if (statSum < MIN_STAT_SUM) {
    return {
      valid: false,
      error: `Total stat sum (${statSum.toFixed(1)}) is below minimum of ${MIN_STAT_SUM}`,
    }
  }

  // Validate all stats are positive
  if (
    balance.stats.attack < 0 ||
    balance.stats.defense < 0 ||
    balance.stats.speed < 0 ||
    balance.stats.health < 0
  ) {
    return { valid: false, error: "All stats must be positive" }
  }

  // Validate all costs are non-negative
  if (
    balance.cost.wood < 0 ||
    balance.cost.stone < 0 ||
    balance.cost.iron < 0 ||
    balance.cost.gold < 0 ||
    balance.cost.food < 0
  ) {
    return { valid: false, error: "All costs must be non-negative" }
  }

  return { valid: true }
}

// GET current troop balances
export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return new Response(JSON.stringify({
      success: false,
      error: "Admin authentication required"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    })
  }

  try {
    // First try to get balances from database
    const dbBalances = await prisma.troopBalance.findMany({
      orderBy: { troopType: 'asc' }
    })

    if (dbBalances.length > 0) {
      // Return database balances
      const balances: TroopBalance[] = dbBalances.map(balance => ({
        type: balance.troopType,
        cost: {
          wood: balance.costWood,
          stone: balance.costStone,
          iron: balance.costIron,
          gold: balance.costGold,
          food: balance.costFood,
        },
        stats: {
          attack: balance.attack,
          defense: balance.defense,
          speed: balance.speed,
          health: balance.health,
        },
      }))

      return NextResponse.json({
        success: true,
        data: balances,
        source: 'database'
      }, { status: 200 })
    }

    // Fallback to troop service if no database entries
    const { TroopService } = await import("@/lib/game-services/troop-service")
    const balances: TroopBalance[] = []

    const troopTypes: TroopType[] = [
      "WARRIOR",
      "SPEARMAN",
      "BOWMAN",
      "HORSEMAN",
      "PALADIN",
      "EAGLE_KNIGHT",
      "RAM",
      "CATAPULT",
      "KNIGHT",
      "NOBLEMAN",
    ]

    for (const type of troopTypes) {
      const stats = TroopService.getTroopStats(type)
      balances.push({
        type,
        cost: stats.cost,
        stats: stats.stats,
      })
    }

    return NextResponse.json({
      success: true,
      data: balances,
      source: 'fallback'
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Get troop balances error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve troop balances"
    }, { status: 500 })
  }
}

// PUT update troop balance
export async function PUT(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return new Response(JSON.stringify({
      success: false,
      error: "Admin authentication required"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    })
  }

  try {
    const { balances }: { balances: TroopBalance[] } = await req.json()

    if (!Array.isArray(balances) || balances.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Invalid balances array"
      }, { status: 400 })
    }

    // Validate all balances
    const validationErrors: string[] = []
    for (const balance of balances) {
      const validation = validateTroopBalance(balance)
      if (!validation.valid) {
        validationErrors.push(`${balance.type}: ${validation.error}`)
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Validation failed",
        details: validationErrors
      }, { status: 400 })
    }

    // Update balances in database using transaction
    const updatedBalances = await prisma.$transaction(async (tx) => {
      const results = []

      for (const balance of balances) {
        const updated = await tx.troopBalance.upsert({
          where: { troopType: balance.type },
          update: {
            costWood: balance.cost.wood,
            costStone: balance.cost.stone,
            costIron: balance.cost.iron,
            costGold: balance.cost.gold,
            costFood: balance.cost.food,
            health: balance.stats.health,
            attack: balance.stats.attack,
            defense: balance.stats.defense,
            speed: balance.stats.speed,
          },
          create: {
            troopType: balance.type,
            costWood: balance.cost.wood,
            costStone: balance.cost.stone,
            costIron: balance.cost.iron,
            costGold: balance.cost.gold,
            costFood: balance.cost.food,
            health: balance.stats.health,
            attack: balance.stats.attack,
            defense: balance.stats.defense,
            speed: balance.stats.speed,
          },
        })
        results.push(updated)
      }

      return results
    })

    // Track action
    trackAction()

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "UPDATE_TROOP_BALANCE",
        details: `Updated ${balances.length} troop balances in database`,
        targetType: "TROOP_BALANCE",
        targetId: "all",
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${balances.length} troop balances in database`,
      data: updatedBalances,
    }, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Update troop balance failed", errorMessage)
    console.error("[v0] Update troop balance error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to update troop balances"
    }, { status: 500 })
  }
}

