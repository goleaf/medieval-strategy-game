import { prisma } from "@/lib/db"
import { MovementService } from "@/lib/game-services/movement-service"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { type NextRequest } from "next/server"
import { reinforcementSendSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate basic structure first
    const validated = reinforcementSendSchema.safeParse({
      fromVillageId: body.fromVillageId,
      toVillageId: body.toVillageId,
      toX: body.toX,
      toY: body.toY,
      units: Object.entries(body.troopSelection || {}).map(([troopId, quantity]) => ({
        troopId,
        quantity: quantity as number,
      })),
    })

    if (!validated.success) {
      return errorResponse(validated.error, 400)
    }

    const { fromVillageId, toX, toY, units } = validated.data

    const fromVillage = await prisma.village.findUnique({
      where: { id: fromVillageId },
      include: { troops: true, player: true },
    })

    if (!fromVillage) {
      return notFoundResponse()
    }

    // Find target village
    const targetVillage = await prisma.village.findUnique({
      where: { x_y: { x: toX, y: toY } },
      include: { player: true },
    })

    if (!targetVillage) {
      return errorResponse("Target village not found", 404)
    }

    // Cannot reinforce your own village
    if (targetVillage.playerId === fromVillage.playerId) {
      return errorResponse("Cannot reinforce your own village", 400)
    }

    // TODO: Check alliance/confederacy relationship
    // For now, allow reinforcements to any village (will be restricted later)

    // Validate troop selection and deduct troops
    for (const unit of units) {
      const troop = fromVillage.troops.find((t) => t.id === unit.troopId)
      if (!troop || troop.quantity < unit.quantity) {
        return errorResponse("Invalid troop selection", 400)
      }
    }

    // Calculate distance and travel time
    const distance = MovementService.distance(fromVillage.x, fromVillage.y, toX, toY)
    const slowestSpeed = MovementService.getSlowestSpeed(
      units.map((u) => {
        const troop = fromVillage.troops.find((t) => t.id === u.troopId)!
        return { speed: troop.speed, quantity: u.quantity }
      }),
    )
    const travelTimeMs = await MovementService.calculateTravelTime(distance, [slowestSpeed])
    const arrivalAt = new Date(Date.now() + travelTimeMs)

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

    // Deduct troops from village
    for (const unit of units) {
      await prisma.troop.update({
        where: { id: unit.troopId },
        data: { quantity: { decrement: unit.quantity } },
      })
    }

    // Create reinforcement
    const reinforcement = await prisma.reinforcement.create({
      data: {
        fromVillageId,
        toVillageId: targetVillage.id,
        movementId: movement.id,
        arrivalAt,
        reinforcementUnits: {
          create: units.map((unit) => ({
            troopId: unit.troopId,
            quantity: unit.quantity,
          })),
        },
      },
      include: { reinforcementUnits: { include: { troop: true } } },
    })

    return successResponse(reinforcement, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
