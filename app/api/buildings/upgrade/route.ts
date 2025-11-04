import { prisma } from "@/lib/db"
import { BuildingService } from "@/lib/game-services/building-service"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { buildingId } = await req.json()

    if (!buildingId) {
      return NextResponse.json({ error: "Building ID required" }, { status: 400 })
    }

    await BuildingService.upgradeBuilding(buildingId)

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    return NextResponse.json(building, { status: 200 })
  } catch (error: any) {
    console.error("[v0] Upgrade building error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 })
  }
}
