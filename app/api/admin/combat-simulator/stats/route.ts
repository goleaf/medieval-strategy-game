import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/lib/admin-utils"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await authenticateAdmin(req)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get combat simulator statistics
    const totalSimulations = await prisma.combatSimulationLog.count()

    const raidSimulations = await prisma.combatSimulationLog.count({
      where: { attackType: "RAID" }
    })

    const conquestSimulations = await prisma.combatSimulationLog.count({
      where: { attackType: "CONQUEST" }
    })

    const winStats = await prisma.combatSimulationLog.aggregate({
      _count: { id: true },
      _avg: { attackerWon: true }
    })

    const troopStats = await prisma.combatSimulationLog.aggregate({
      _avg: { totalTroops: true },
      _sum: { wallDamage: true }
    })

    const stats = {
      totalSimulations,
      raidSimulations,
      conquestSimulations,
      averageWinRate: winStats._avg.attackerWon || 0,
      totalWallDamage: troopStats._sum.wallDamage || 0,
      averageTroopCount: troopStats._avg.totalTroops || 0,
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error("Combat simulator stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

