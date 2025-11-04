import { prisma } from "@/lib/db"
import { MovementService } from "@/lib/game-services/movement-service"
import { type NextRequest, NextResponse } from "next/server"
import type { AttackType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const { fromVillageId, toX, toY, troopSelection, attackType } = await req.json()

    if (!fromVillageId || toX === undefined || toY === undefined || !attackType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const fromVillage = await prisma.village.findUnique({
      where: { id: fromVillageId },
      include: { troops: true },
    })

    if (!fromVillage) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 })
    }

    // Validate troop selection
    for (const [troopId, quantity] of Object.entries(troopSelection) as any[]) {
      const troop = fromVillage.troops.find((t) => t.id === troopId)
      if (!troop || troop.quantity < quantity) {
        return NextResponse.json({ error: "Invalid troop selection" }, { status: 400 })
      }
    }

    // Calculate distance and travel time
    const distance = MovementService.distance(fromVillage.x, fromVillage.y, toX, toY)
    const avgSpeed = 5 // Average troop speed

    const travelTime = MovementService.calculateTravelTime(distance, avgSpeed)
    const arrivalAt = new Date(Date.now() + travelTime)

    // Create movement
    const path = MovementService.findPath(fromVillage.x, fromVillage.y, toX, toY)

    const movement = await prisma.movement.create({
      data: {
        troopId: fromVillage.troops[0].id,
        fromX: fromVillage.x,
        fromY: fromVillage.y,
        toX,
        toY,
        path: JSON.stringify(path),
        totalSteps: path.length,
        arrivalAt,
      },
    })

    // Create attack
    const attack = await prisma.attack.create({
      data: {
        fromVillageId,
        toVillageId: undefined,
        movementId: movement.id,
        type: attackType as AttackType,
        arrivalAt,
        attackUnits: {
          create: Object.entries(troopSelection).map(([troopId, quantity]) => ({
            troopId,
            quantity: quantity as number,
          })),
        },
      },
      include: { attackUnits: true },
    })

    return NextResponse.json(attack, { status: 201 })
  } catch (error) {
    console.error("[v0] Launch attack error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
