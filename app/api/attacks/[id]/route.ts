import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse } from "@/lib/utils/api-response"

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
        movement: true,
      },
    })

    if (!attack) {
      return notFoundResponse()
    }

    return successResponse(attack)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const attack = await prisma.attack.findUnique({
      where: { id },
      include: {
        movement: true,
        attackUnits: true,
        fromVillage: { include: { player: true } }
      },
    })

    if (!attack) {
      return notFoundResponse()
    }

    // Check if attack can be cancelled (Travian rule: within 90 seconds of sending)
    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000)
    if (attack.createdAt < ninetySecondsAgo) {
      return errorResponse("Cannot cancel attack after 90 seconds have passed", 400)
    }

    // Only allow cancellation if attack hasn't arrived
    if (attack.status !== "IN_PROGRESS") {
      return errorResponse("Cannot cancel attack that has already arrived", 400)
    }

    // Cancel movement and record cancellation time
    await prisma.movement.update({
      where: { id: attack.movementId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date()
      },
    })

    // Return troops to attacker
    for (const unit of attack.attackUnits || []) {
      await prisma.troop.update({
        where: { id: unit.troopId },
        data: { quantity: { increment: unit.quantity } },
      })
    }

    // Update attack status
    await prisma.attack.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return successResponse({ message: "Attack cancelled successfully" })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
