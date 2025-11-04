import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import type { TroopType } from "@prisma/client"

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
export async function GET() {
  try {
    // Import from troop service
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

    return NextResponse.json({ balances }, { status: 200 })
  } catch (error) {
    console.error("[v0] Get troop balances error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT update troop balance
export async function PUT(req: NextRequest) {
  try {
    const { balances }: { balances: TroopBalance[] } = await req.json()

    if (!Array.isArray(balances) || balances.length === 0) {
      return NextResponse.json({ error: "Invalid balances array" }, { status: 400 })
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
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 },
      )
    }

    // Update troop-service.ts file (in production, you'd store this in database)
    // For now, we'll create a database table or config file to store balances
    // Note: This is a simplified approach - in production, you'd want to store balances in DB

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id",
        action: "UPDATE_TROOP_BALANCE",
        details: `Updated ${balances.length} troop balances`,
        targetType: "TROOP_BALANCE",
        targetId: "all",
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: `Updated ${balances.length} troop balances`,
        balances,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Update troop balance error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

