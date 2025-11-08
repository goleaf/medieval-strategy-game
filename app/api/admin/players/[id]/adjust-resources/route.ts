import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { villageId, wood, stone, iron, gold, food, reason } = await req.json()

    const village = await prisma.village.findUnique({
      where: { id: villageId },
    })

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 })
    }

    // Update resources
    const updates: any = {}
    if (wood !== undefined) updates.wood = Math.max(0, village.wood + wood)
    if (stone !== undefined) updates.stone = Math.max(0, village.stone + stone)
    if (iron !== undefined) updates.iron = Math.max(0, village.iron + iron)
    if (gold !== undefined) updates.gold = Math.max(0, village.gold + gold)
    if (food !== undefined) updates.food = Math.max(0, village.food + food)

    await prisma.village.update({
      where: { id: villageId },
      data: updates,
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id",
        action: "ADJUST_RESOURCES",
        details: `Adjusted: W:${wood} S:${stone} I:${iron} G:${gold} F:${food}. Reason: ${reason}`,
        targetType: "VILLAGE",
        targetId: villageId,
      },
    })

    return NextResponse.json({ success: true, message: "Resources adjusted" }, { status: 200 })
  } catch (error) {
    console.error("Adjust resources error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
