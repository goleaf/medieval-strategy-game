import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
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
    })

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 })
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

    // Relocate village
    await prisma.village.update({
      where: { id: villageId },
      data: {
        x: newX,
        y: newY,
      },
    })

    // Update barbarian record if it exists
    await prisma.barbarian.updateMany({
      where: { villageId },
      data: {
        x: newX,
        y: newY,
      },
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id",
        action: "RELOCATE_TILE",
        details: `Relocated village "${village.name}" from (${oldX}, ${oldY}) to (${newX}, ${newY})`,
        targetType: "VILLAGE",
        targetId: villageId,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: `Village relocated from (${oldX}, ${oldY}) to (${newX}, ${newY})`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Relocate tile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

