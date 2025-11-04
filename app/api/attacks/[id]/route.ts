import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const attack = await prisma.attack.findUnique({
      where: { id },
      include: {
        attackUnits: { include: { troop: true } },
        defenseUnits: { include: { troop: true } },
        fromVillage: true,
        toVillage: true,
      },
    })

    if (!attack) {
      return NextResponse.json({ error: "Attack not found" }, { status: 404 })
    }

    return NextResponse.json(attack, { status: 200 })
  } catch (error) {
    console.error("[v0] Get attack error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
