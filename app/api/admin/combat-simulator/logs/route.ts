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

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    const logs = await prisma.combatSimulationLog.findMany({
      take: Math.min(limit, 1000), // Max 1000 records
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        player: {
          select: { username: true, id: true }
        }
      }
    })

    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      attackType: log.attackType,
      wallLevel: log.wallLevel,
      heroBonus: log.heroBonus,
      attackerOffense: log.attackerOffense,
      defenderDefense: log.defenderDefense,
      attackerWon: log.attackerWon,
      totalTroops: log.totalTroops,
      userId: log.userId,
      username: log.player?.username,
    }))

    return NextResponse.json(formattedLogs)

  } catch (error) {
    console.error("Combat simulator logs error:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await authenticateAdmin(req)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Clear all simulation logs
    await prisma.combatSimulationLog.deleteMany()

    return NextResponse.json({ success: true, message: "Logs cleared" })

  } catch (error) {
    console.error("Combat simulator logs delete error:", error)
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 })
  }
}


