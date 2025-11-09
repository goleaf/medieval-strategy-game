import { prisma } from "@/lib/db"
import { MovementService } from "./movement-service"
import { TroopService } from "./troop-service"
import { LoyaltyService } from "./loyalty-service"
import { VillageService } from "./village-service"
import { handleVillageConquest } from "./task-service"
import { EventQueueService } from "@/lib/game-services/event-queue-service"
import type {
  Building,
  BuildingType,
  ExpansionLinkType,
  Movement,
  TroopType,
  Village,
} from "@prisma/client"

const SETTLER_GROUP_SIZE = 3
const FOUNDING_COST = {
  wood: 750,
  stone: 750,
  iron: 750,
  gold: 0,
  food: 750,
}

const EXPANSION_SLOT_THRESHOLDS: Partial<Record<BuildingType, number[]>> = {
  RESIDENCE: [10, 20, 30],
  PALACE: [10, 15, 20],
  COMMAND_CENTER: [10, 20, 30],
}

type VillageWithOwner = Village & {
  player: {
    id: string
    playerName: string
    villagesAllowed: number
    villagesUsed: number
  }
  buildings?: Building[]
}

export class ExpansionService {
  static getFoundingCost() {
    return FOUNDING_COST
  }

  /**
   * Calculate unlocked expansion slots based on admin building levels.
   */
  static calculateExpansionSlots(buildings: Array<Pick<Building, "type" | "level">>): number {
    if (!buildings || buildings.length === 0) return 0

    let slots = 0
    for (const [buildingType, thresholds] of Object.entries(EXPANSION_SLOT_THRESHOLDS)) {
      if (!thresholds) continue
      const building = buildings.find((b) => b.type === buildingType)
      if (!building) continue
      const unlocked = thresholds.filter((level) => building.level >= level).length
      slots = Math.max(slots, unlocked)
    }
    return slots
  }

  /**
   * Sync expansion slot totals for a village (Residence/Palace/Command Center levels).
   */
  static async syncExpansionSlotsForVillage(villageId: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) return

    const slots = this.calculateExpansionSlots(village.buildings)
    if (slots === village.expansionSlotsTotal) return

    await prisma.village.update({
      where: { id: villageId },
      data: { expansionSlotsTotal: slots },
    })
  }

  static assertPlayerHasVillageSlot(player: VillageWithOwner["player"]) {
    if (player.villagesUsed >= player.villagesAllowed) {
      throw new Error("No available culture point slots to settle or conquer a new village")
    }
  }

  static assertVillageHasExpansionSlot(village: Village) {
    if (village.expansionSlotsTotal <= 0 || village.expansionSlotsUsed >= village.expansionSlotsTotal) {
      throw new Error("No available expansion slots in this village")
    }
  }

  /**
   * Launch a settler wave that will found a new village if the tile stays empty.
   */
  static async sendSettlers({
    sourceVillageId,
    targetX,
    targetY,
  }: {
    sourceVillageId: string
    targetX: number
    targetY: number
  }): Promise<Movement> {
    const sourceVillage = await prisma.village.findUnique({
      where: { id: sourceVillageId },
      include: {
        player: true,
        troops: true,
        buildings: true,
      },
    })

    if (!sourceVillage) {
      throw new Error("Source village not found")
    }

    this.assertPlayerHasVillageSlot(sourceVillage.player)

    await this.syncExpansionSlotsForVillage(sourceVillage.id)
    const refreshedVillage = await prisma.village.findUnique({
      where: { id: sourceVillage.id },
    })

    if (!refreshedVillage) throw new Error("Source village not found after refresh")
    this.assertVillageHasExpansionSlot(refreshedVillage)

    const existingVillage = await prisma.village.findUnique({
      where: { x_y: { x: targetX, y: targetY } },
    })
    if (existingVillage) {
      throw new Error("Target tile already occupied")
    }

    const settlers = sourceVillage.troops.find((t) => t.type === "SETTLER")
    if (!settlers || settlers.quantity < SETTLER_GROUP_SIZE) {
      throw new Error("Not enough settlers trained in this village")
    }

    const foundingCost = this.getFoundingCost()
    if (
      sourceVillage.wood < foundingCost.wood ||
      sourceVillage.stone < foundingCost.stone ||
      sourceVillage.iron < foundingCost.iron ||
      sourceVillage.gold < foundingCost.gold ||
      sourceVillage.food < foundingCost.food
    ) {
      throw new Error("Insufficient resources to send settlers")
    }

    const settlerSpeed = settlers.speed || TroopService.getTroopStats("SETTLER" as TroopType).stats.speed
    const distance = MovementService.distance(sourceVillage.x, sourceVillage.y, targetX, targetY)
    const travelTimeMs = await MovementService.calculateTravelTime(distance, [settlerSpeed])
    const arrivalAt = new Date(Date.now() + travelTimeMs)
    const path = MovementService.findPath(sourceVillage.x, sourceVillage.y, targetX, targetY)

    const movement = await prisma.movement.create({
      data: {
        kind: "SETTLER_FOUND",
        fromVillageId: sourceVillage.id,
        fromX: sourceVillage.x,
        fromY: sourceVillage.y,
        toX: targetX,
        toY: targetY,
        path: JSON.stringify(path),
        totalSteps: Math.max(1, path.length),
        arrivalAt,
        payload: {
          settlers: SETTLER_GROUP_SIZE,
          foundingCost,
        },
      },
    })

    await EventQueueService.scheduleEvent(
      "TROOP_MOVEMENT",
      arrivalAt,
      { movementId: movement.id },
      { dedupeKey: `movement:${movement.id}` },
    )

    await prisma.village.update({
      where: { id: sourceVillage.id },
      data: {
        wood: { decrement: foundingCost.wood },
        stone: { decrement: foundingCost.stone },
        iron: { decrement: foundingCost.iron },
        gold: { decrement: foundingCost.gold },
        food: { decrement: foundingCost.food },
      },
    })

    await prisma.troop.update({
      where: { id: settlers.id },
      data: {
        quantity: { decrement: SETTLER_GROUP_SIZE },
      },
    })

    return movement
  }

  /**
   * Handle settler arrival. Creates the village if the tile is still empty, otherwise returns settlers.
   */
  static async handleSettlerArrival(movementId: string): Promise<void> {
    const movement = await prisma.movement.findUnique({
      where: { id: movementId },
      include: {
        fromVillage: {
          include: {
            player: true,
          },
        },
      },
    })

    if (!movement || movement.kind !== "SETTLER_FOUND" || !movement.fromVillage) {
      return
    }

    const payload = (movement.payload as any) || {}
    const settlersToReturn = payload.settlers ?? SETTLER_GROUP_SIZE
    const foundingCost = payload.foundingCost ?? FOUNDING_COST

    const existingVillage = await prisma.village.findUnique({
      where: { x_y: { x: movement.toX, y: movement.toY } },
    })

    if (existingVillage) {
      await this.returnSettlers(movement.fromVillageId!, settlersToReturn, foundingCost)
      return
    }

    // Create the new village
    const villageName = `Outpost (${movement.toX}|${movement.toY})`
    const formedVillage = await VillageService.createVillage(
      movement.fromVillage.playerId,
      movement.fromVillage.continentId,
      villageName,
      movement.toX,
      movement.toY,
      false,
      undefined,
      {
        skipCultureCheck: true,
        foundedByVillageId: movement.fromVillageId ?? undefined,
      },
    )

    await prisma.player.update({
      where: { id: movement.fromVillage.playerId },
      data: { villagesUsed: { increment: 1 } },
    })

    await prisma.village.update({
      where: { id: movement.fromVillageId! },
      data: { expansionSlotsUsed: { increment: 1 } },
    })

    await prisma.expansionLink.create({
      data: {
        sourceVillageId: movement.fromVillageId!,
        targetVillageId: formedVillage.id,
        type: "FOUND",
      },
    })

    await LoyaltyService.syncVillageMaxLoyalty(formedVillage.id)
  }

  private static async returnSettlers(
    sourceVillageId: string,
    settlers: number,
    foundingCost: typeof FOUNDING_COST,
  ): Promise<void> {
    await prisma.village.update({
      where: { id: sourceVillageId },
      data: {
        wood: { increment: foundingCost.wood },
        stone: { increment: foundingCost.stone },
        iron: { increment: foundingCost.iron },
        gold: { increment: foundingCost.gold },
        food: { increment: foundingCost.food },
      },
    })

    await prisma.troop.upsert({
      where: {
        villageId_type: {
          villageId: sourceVillageId,
          type: "SETTLER",
        },
      },
      update: {
        quantity: { increment: settlers },
      },
      create: {
        villageId: sourceVillageId,
        type: "SETTLER",
        quantity: settlers,
        attack: 0,
        defense: 0,
        health: 100,
        speed: TroopService.getTroopStats("SETTLER" as TroopType).stats.speed,
      },
    })
  }

  /**
   * Attempt to transfer ownership of a village after loyalty hits zero.
   */
  static async attemptConquestTransfer({
    targetVillage,
    attackerVillage,
  }: {
    targetVillage: VillageWithOwner
    attackerVillage: VillageWithOwner
  }): Promise<{ status: "SUCCESS" | "CAPITAL_BLOCKED" | "NO_CP_SLOT" | "NO_EXPANSION_SLOT"; previousOwnerId?: string }> {
    const config = LoyaltyService.getConfig()

    if (!config.capitalConquerable && targetVillage.isCapital) {
      return { status: "CAPITAL_BLOCKED" }
    }

    if (config.requireCpSlotAtConquest && attackerVillage.player.villagesUsed >= attackerVillage.player.villagesAllowed) {
      return { status: "NO_CP_SLOT" }
    }

    if (config.consumeExpansionSlotOnConquest) {
      await this.syncExpansionSlotsForVillage(attackerVillage.id)
      const refreshed = await prisma.village.findUnique({ where: { id: attackerVillage.id } })
      if (!refreshed || refreshed.expansionSlotsUsed >= refreshed.expansionSlotsTotal) {
        return { status: "NO_EXPANSION_SLOT" }
      }
    }

    const previousOwnerId = targetVillage.playerId

    await prisma.$transaction(async (tx) => {
      await tx.village.update({
        where: { id: targetVillage.id },
        data: {
          playerId: attackerVillage.playerId,
          conqueredFromPlayerId: previousOwnerId,
          loyalty: config.newOwnerStartLoyalty,
          loyaltyUpdatedAt: new Date(),
          lastLoyaltyAttackAt: null,
        },
      })

      await tx.troop.deleteMany({
        where: { villageId: targetVillage.id },
      })

      if (targetVillage.player.villagesUsed > 0) {
        await tx.player.update({
          where: { id: previousOwnerId },
          data: { villagesUsed: { decrement: 1 } },
        })
      }

      await tx.player.update({
        where: { id: attackerVillage.playerId },
        data: { villagesUsed: { increment: 1 } },
      })

      if (config.consumeExpansionSlotOnConquest) {
        await tx.village.update({
          where: { id: attackerVillage.id },
          data: { expansionSlotsUsed: { increment: 1 } },
        })

        await tx.expansionLink.create({
          data: {
            sourceVillageId: attackerVillage.id,
            targetVillageId: targetVillage.id,
            type: "CONQUER",
          },
        })
      }
    })

    const adminBuilding = targetVillage.buildings?.find((b) =>
      ["PALACE", "RESIDENCE", "COMMAND_CENTER"].includes(b.type),
    )

    if (adminBuilding) {
      await prisma.building.update({
        where: { id: adminBuilding.id },
        data: { level: 0 },
      })
    }

    await LoyaltyService.syncVillageMaxLoyalty(targetVillage.id)
    await this.syncExpansionSlotsForVillage(targetVillage.id)
    await handleVillageConquest(targetVillage.id, attackerVillage.playerId)

    return { status: "SUCCESS", previousOwnerId }
  }
}
