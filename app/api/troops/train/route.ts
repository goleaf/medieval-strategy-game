import { prisma } from "@/lib/db"
import { TroopService } from "@/lib/game-services/troop-service"
import { type NextRequest, NextResponse } from "next/server"
import type { TroopType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const { villageId, troopType, quantity } = await req.json()

    if (!villageId || !troopType || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (quantity < 1 || quantity > 1000) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 })
    }

    await TroopService.trainTroops(villageId, troopType as TroopType, quantity)

    const updatedVillage = await prisma.village.findUnique({
      where: { id: villageId },
      include: { troops: true },
    })

    return NextResponse.json(updatedVillage, { status: 200 })
  } catch (error: any) {
    console.error("[v0] Train troops error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 })
  }
}
