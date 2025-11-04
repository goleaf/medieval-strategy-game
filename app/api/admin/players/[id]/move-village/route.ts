import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { trackAction, trackError } from "@/app/api/admin/stats/route"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { villageId, newX, newY } = await req.json()

    if (!villageId || typeof newX !== "number" || typeof newY !== "number") {
      return NextResponse.json(
        { error: "Invalid parameters: villageId, newX, and newY are required" },
        { status: 400 },
      )
    }

    if (newX < 0 || newY < 0) {
      return NextResponse.json({ error: "Coordinates must be non-negative" }, { status: 400 })
    }

    // Get world config to check bounds
    const config = await prisma.worldConfig.findFirst()
    if (config && (newX > config.maxX || newY > config.maxY)) {
      return NextResponse.json(
        { error: `Coordinates out of bounds (max: ${config.maxX}, ${config.maxY})` },
        { status: 400 },
      )
    }

    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { player: true },
    })

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 })
    }

    if (village.playerId !== params.id) {
      return NextResponse.json({ error: "Village does not belong to this player" }, { status: 400 })
    }

    // Check if new position is already occupied
    const existingVillage = await prisma.village.findUnique({
      where: { x_y: { x: newX, y: newY } },
    })

    if (existingVillage && existingVillage.id !== villageId) {
      return NextResponse.json({ error: "Position already occupied by another village" }, { status: 400 })
    }

    const oldX = village.x
    const oldY = village.y

    // Move village
    await prisma.village.update({
      where: { id: villageId },
      data: {
        x: newX,
        y: newY,
      },
    })

    // Track action
    trackAction()

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id", // Get from auth context
        action: "MOVE_VILLAGE",
        details: `Moved village "${village.name}" from (${oldX}, ${oldY}) to (${newX}, ${newY})`,
        targetType: "VILLAGE",
        targetId: villageId,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: `Village moved from (${oldX}, ${oldY}) to (${newX}, ${newY})`,
      },
      { status: 200 },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Move village failed", errorMessage)
    console.error("[v0] Move village error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

