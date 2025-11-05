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

    // Get all simulation logs
    const logs = await prisma.combatSimulationLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        player: {
          select: { username: true }
        }
      }
    })

    // Create CSV content
    const csvHeader = [
      "ID",
      "Timestamp",
      "Attack Type",
      "Wall Level",
      "Hero Bonus (%)",
      "Attacker Offense",
      "Defender Defense",
      "Attacker Won",
      "Total Troops",
      "Username",
      "Attacker Casualties",
      "Defender Casualties",
      "Loot (Wood)",
      "Loot (Stone)",
      "Loot (Iron)",
      "Loot (Gold)",
      "Loot (Food)",
      "Wall Damage"
    ].join(",")

    const csvRows = logs.map(log => {
      const loot = log.loot as any || {}
      return [
        log.id,
        log.createdAt.toISOString(),
        log.attackType,
        log.wallLevel,
        log.heroBonus,
        log.attackerOffense,
        log.defenderDefense,
        log.attackerWon ? "Yes" : "No",
        log.totalTroops,
        log.player?.username || "",
        JSON.stringify(log.attackerCasualties),
        JSON.stringify(log.defenderCasualties),
        loot.wood || 0,
        loot.stone || 0,
        loot.iron || 0,
        loot.gold || 0,
        loot.food || 0,
        log.wallDamage
      ].map(field => `"${field}"`).join(",")
    })

    const csvContent = [csvHeader, ...csvRows].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="combat-simulator-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })

  } catch (error) {
    console.error("Combat simulator logs export error:", error)
    return NextResponse.json({ error: "Failed to export logs" }, { status: 500 })
  }
}

