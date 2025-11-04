import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { trackAction, trackError } from "@/lib/admin-utils"

export async function POST(req: NextRequest) {
  try {
    const { confirm } = await req.json()

    if (confirm !== true) {
      return NextResponse.json(
        { error: "Confirmation required. Set confirm: true in request body" },
        { status: 400 },
      )
    }

    // Find empty villages (no buildings above level 1, no troops, no resources)
    const emptyVillages = await prisma.village.findMany({
      where: {
        OR: [
          {
            wood: { lte: 100 },
            stone: { lte: 100 },
            iron: { lte: 50 },
            gold: { lte: 20 },
            food: { lte: 200 },
          },
        ],
      },
      include: {
        buildings: true,
        troops: true,
      },
    })

    const villagesToWipe = emptyVillages.filter((village) => {
      // Check if village has any significant buildings (level > 1)
      const hasBuildings = village.buildings.some((b) => b.level > 1)

      // Check if village has any troops
      const hasTroops = village.troops.some((t) => t.quantity > 0)

      // Check if village has significant resources
      const hasResources =
        village.wood > 100 ||
        village.stone > 100 ||
        village.iron > 50 ||
        village.gold > 20 ||
        village.food > 200

      // Wipe if no buildings, no troops, and minimal resources
      return !hasBuildings && !hasTroops && !hasResources
    })

    if (villagesToWipe.length === 0) {
      return NextResponse.json({ message: "No empty villages found to wipe" }, { status: 200 })
    }

    const villageIds = villagesToWipe.map((v) => v.id)

    // Delete related records first
    await prisma.troop.deleteMany({
      where: { villageId: { in: villageIds } },
    })

    await prisma.building.deleteMany({
      where: { villageId: { in: villageIds } },
    })

    await prisma.barbarian.deleteMany({
      where: { villageId: { in: villageIds } },
    })

    // Delete villages
    await prisma.village.deleteMany({
      where: { id: { in: villageIds } },
    })

    // Track action
    trackAction()

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id",
        action: "WIPE_EMPTY_VILLAGES",
        details: `Wiped ${villagesToWipe.length} empty villages`,
        targetType: "VILLAGE",
        targetId: "multiple",
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: `Wiped ${villagesToWipe.length} empty villages`,
        count: villagesToWipe.length,
      },
      { status: 200 },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Wipe empty villages failed", errorMessage)
    console.error("[v0] Wipe empty villages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

