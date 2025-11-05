import { prisma } from "@/lib/db"
import type { ReinforcementStatus } from "@prisma/client"

export class ReinforcementService {
  /**
   * Process arrived reinforcements - convert them to defense units
   */
  static async processArrivedReinforcements(): Promise<void> {
    const arrivedReinforcements = await prisma.reinforcement.findMany({
      where: {
        status: "IN_PROGRESS",
        arrivalAt: { lte: new Date() },
      },
      include: {
        reinforcementUnits: { include: { troop: true } },
        toVillage: { include: { player: true } },
        fromVillage: { include: { player: true } },
      },
    })

    for (const reinforcement of arrivedReinforcements) {
      await this.processReinforcementArrival(reinforcement.id)
    }
  }

  /**
   * Process a single reinforcement arrival
   */
  static async processReinforcementArrival(reinforcementId: string): Promise<void> {
    const reinforcement = await prisma.reinforcement.findUnique({
      where: { id: reinforcementId },
      include: {
        reinforcementUnits: { include: { troop: true } },
        toVillage: { include: { player: true } },
        fromVillage: { include: { player: true } },
      },
    })

    if (!reinforcement) return

    // Create defense units for each reinforcement unit
    for (const unit of reinforcement.reinforcementUnits) {
      await prisma.defenseUnit.create({
        data: {
          attackId: "", // This is a bit of a hack - defense units are tied to attacks
          troopId: unit.troopId,
          quantity: unit.quantity,
        },
      })
    }

    // Update reinforcement status
    await prisma.reinforcement.update({
      where: { id: reinforcementId },
      data: {
        status: "ARRIVED" as ReinforcementStatus,
        resolvedAt: new Date(),
      },
    })

    // Send notification to receiver
    await prisma.message.create({
      data: {
        senderId: reinforcement.fromVillage.playerId,
        villageId: reinforcement.toVillageId,
        type: "SYSTEM",
        subject: "Reinforcements Arrived",
        content: `Reinforcements from ${reinforcement.fromVillage.player.playerName} have arrived at your village.`,
      },
    })
  }

  /**
   * Withdraw reinforcements back to sender
   */
  static async withdrawReinforcements(reinforcementId: string, withdrawingPlayerId: string): Promise<boolean> {
    const reinforcement = await prisma.reinforcement.findUnique({
      where: { id: reinforcementId },
      include: {
        reinforcementUnits: { include: { troop: true } },
        toVillage: { include: { player: true } },
        fromVillage: { include: { player: true } },
      },
    })

    if (!reinforcement) return false

    // Only the sender or receiver can withdraw
    if (reinforcement.fromVillage.playerId !== withdrawingPlayerId &&
        reinforcement.toVillage.playerId !== withdrawingPlayerId) {
      return false
    }

    // If arrived, convert back to movement and return troops
    if (reinforcement.status === "ARRIVED") {
      // Remove defense units and return troops to sender
      for (const unit of reinforcement.reinforcementUnits) {
        // Return troops to sender village
        await prisma.troop.update({
          where: { id: unit.troopId },
          data: { quantity: { increment: unit.quantity } },
        })

        // Remove defense units (this is tricky since they're not properly linked)
        // For now, we'll just return the troops
      }
    }

    // Update status
    await prisma.reinforcement.update({
      where: { id: reinforcementId },
      data: {
        status: "RETURNED" as ReinforcementStatus,
        resolvedAt: new Date(),
      },
    })

    return true
  }

  /**
   * Auto-return reinforcements when alliance ends
   */
  static async returnReinforcementsOnAllianceEnd(fromPlayerId: string, toPlayerId: string): Promise<void> {
    const reinforcements = await prisma.reinforcement.findMany({
      where: {
        fromVillage: { playerId: fromPlayerId },
        toVillage: { playerId: toPlayerId },
        status: "ARRIVED",
      },
      include: {
        reinforcementUnits: { include: { troop: true } },
      },
    })

    for (const reinforcement of reinforcements) {
      await this.withdrawReinforcements(reinforcement.id, fromPlayerId)
    }
  }
}
