import { prisma } from "@/lib/db"
import { MovementService } from "@/lib/game-services/movement-service"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { CombatService } from "@/lib/game-services/combat-service"
import { type NextRequest } from "next/server"
import { attackLaunchSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"
import type { AttackType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate basic structure first
    const validated = attackLaunchSchema.safeParse({
      fromVillageId: body.fromVillageId,
      toVillageId: body.toVillageId,
      toX: body.toX,
      toY: body.toY,
      type: body.attackType,
      units: Object.entries(body.troopSelection || {}).map(([troopId, quantity]) => ({
        troopId,
        quantity: quantity as number,
      })),
    })

    if (!validated.success) {
      return errorResponse(validated.error, 400)
    }

    const { fromVillageId, toX, toY, type, units } = validated.data

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

    // Check if attacker has beginner protection
    const attackerIsProtected = await ProtectionService.isPlayerProtected(fromVillage.playerId)

    if (attackerIsProtected) {
      // Protected players can only attack Natars and unoccupied oases
      const isValidTarget = !targetVillage || // Unoccupied oasis
        (targetVillage.player && targetVillage.player.playerName.toLowerCase().includes('natar'))

      if (!isValidTarget) {
        return errorResponse("Players under beginner protection can only attack Natars and unoccupied oases", 403)
      }
    }

    if (targetVillage) {
      // Check if target village is protected (except for scouting and when attacking Natars)
      if (type !== "SCOUT") {
        const isTargetProtected = await ProtectionService.isVillageProtected(targetVillage.id)
        const isNatar = targetVillage.player?.playerName.toLowerCase().includes('natar')

        if (isTargetProtected && !isNatar) {
          return errorResponse("Target village is protected by beginner protection", 403)
        }
      }

      // Check if attacking own village
      if (targetVillage.playerId === fromVillage.playerId) {
        return errorResponse("Cannot attack your own village", 400)
      }
    }

    // Validate troop selection and deduct troops
    const troopSpeeds: number[] = []
    for (const unit of units) {
      const troop = fromVillage.troops.find((t) => t.id === unit.troopId)
      if (!troop || troop.quantity < unit.quantity) {
        return errorResponse("Invalid troop selection", 400)
      }
      troopSpeeds.push(troop.speed)
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

    // Create attack
    const attack = await prisma.attack.create({
      data: {
        fromVillageId,
        toVillageId: targetVillage?.id || null,
        movementId: movement.id,
        type: type as AttackType,
        arrivalAt,
        attackUnits: {
          create: units.map((unit) => ({
            troopId: unit.troopId,
            quantity: unit.quantity,
          })),
        },
      },
      include: { attackUnits: { include: { troop: true } } },
    })

    // Send alliance attack notifications (Reign of Fire feature)
    if (targetVillage) {
      try {
        await CombatService.sendAllianceAttackNotifications(attack.id);
      } catch (error) {
        console.error("Failed to send alliance attack notifications:", error);
        // Don't fail the attack launch if notifications fail
      }
    }

    return successResponse(attack, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
