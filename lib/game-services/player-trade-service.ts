import { prisma } from "@/lib/db"
import { ShipmentService } from "./shipment-service"
import type { ResourceBundle } from "./storage-service"
import { DiplomacyService } from "./diplomacy-service"
import { ProtectionService } from "./protection-service"
import { ResourceReservationService } from "./resource-reservation-service"
import { TradeRouteService } from "./trade-route-service"
import type { TradeRouteSchedule } from "./trade-route-service"
import { StorageService } from "./storage-service"

const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const

type TradeDestination =
  | { villageId: string; coordinates?: never }
  | { villageId?: never; coordinates: { x: number; y: number } }

export class PlayerTradeService {
  static async initiateDirectTrade(params: {
    playerId: string
    sourceVillageId: string
    destination: TradeDestination
    resources: ResourceBundle
  }) {
    const totalPayload = Object.values(params.resources).reduce(
      (sum, value) => sum + Math.max(0, value ?? 0),
      0,
    )

    if (totalPayload <= 0) {
      throw new Error("Trade must include at least one resource")
    }

    const sourceVillage = await prisma.village.findUnique({
      where: { id: params.sourceVillageId },
      select: {
        id: true,
        playerId: true,
        name: true,
        wood: true,
        stone: true,
        iron: true,
        gold: true,
        food: true,
        player: { select: { id: true, playerName: true } },
      },
    })

    if (!sourceVillage) {
      throw new Error("Source village not found")
    }
    if (sourceVillage.playerId !== params.playerId) {
      throw new Error("You can only send merchants from your own villages")
    }

    const targetVillage = await this.resolveDestination(params.destination)
    if (!targetVillage) {
      throw new Error("Target village not found")
    }
    if (targetVillage.id === sourceVillage.id) {
      throw new Error("Choose a different village as the destination")
    }

    const atWar = await DiplomacyService.arePlayersAtWar(
      sourceVillage.playerId,
      targetVillage.playerId,
    )
    if (atWar) {
      throw new Error("Cannot trade with this village while your alliances are at war")
    }

    const sourceProtected = await ProtectionService.isPlayerProtected(sourceVillage.playerId)
    const targetProtected = await ProtectionService.isPlayerProtected(targetVillage.playerId)
    const differentPlayers = sourceVillage.playerId !== targetVillage.playerId

    if (sourceProtected && differentPlayers) {
      throw new Error("Players under beginner protection cannot send resources to other players")
    }
    if (targetProtected && differentPlayers) {
      throw new Error("Target village is protected and cannot receive resources yet")
    }

    await this.assertVillageCanAfford(sourceVillage, params.resources)

    const shipment = await ShipmentService.createDirectShipment({
      sourceVillageId: sourceVillage.id,
      targetVillageId: targetVillage.id,
      bundle: params.resources,
      createdBy: "PLAYER",
      metadata: {
        intent: "player_trade",
        targetVillageId: targetVillage.id,
        targetPlayerId: targetVillage.playerId,
      },
    })

    return {
      shipment,
      sourceVillage,
      targetVillage,
    }
  }

  static async createRecurringTransfer(params: {
    playerId: string
    sourceVillageId: string
    targetVillageId: string
    resources: ResourceBundle
    schedule: TradeRouteSchedule
    skipIfInsufficient?: boolean
    startsAt?: Date | null
    endsAt?: Date | null
  }) {
    const [sourceVillage, targetVillage] = await Promise.all([
      prisma.village.findUnique({ where: { id: params.sourceVillageId } }),
      prisma.village.findUnique({ where: { id: params.targetVillageId } }),
    ])

    if (!sourceVillage || !targetVillage) {
      throw new Error("Villages not found for recurring transfer")
    }
    if (sourceVillage.playerId !== params.playerId || targetVillage.playerId !== params.playerId) {
      throw new Error("Recurring transfers are limited to your own villages")
    }
    if (sourceVillage.id === targetVillage.id) {
      throw new Error("Select two different villages for a transfer")
    }

    await this.assertVillageCanAfford(sourceVillage, params.resources)

    return TradeRouteService.createRoute({
      sourceVillageId: sourceVillage.id,
      targetVillageId: targetVillage.id,
      bundle: params.resources,
      schedule: params.schedule,
      skipIfInsufficient: params.skipIfInsufficient ?? true,
      startsAt: params.startsAt ?? null,
      endsAt: params.endsAt ?? null,
      createdByPlayerId: params.playerId,
    })
  }

  static async listRecurringTransfers(playerId: string) {
    return prisma.tradeRoute.findMany({
      where: {
        createdByPlayerId: playerId,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
      include: {
        sourceVillage: { select: { id: true, name: true, x: true, y: true } },
        targetVillage: { select: { id: true, name: true, x: true, y: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    })
  }

  static async cancelRecurringTransfer(playerId: string, routeId: string) {
    const route = await prisma.tradeRoute.findUnique({
      where: { id: routeId },
      select: { id: true, createdByPlayerId: true, status: true },
    })

    if (!route) {
      throw new Error("Recurring transfer not found")
    }
    if (route.createdByPlayerId !== playerId) {
      throw new Error("You can only manage your own recurring transfers")
    }

    if (route.status === "CANCELLED") {
      return route
    }

    return prisma.tradeRoute.update({
      where: { id: route.id },
      data: {
        status: "CANCELLED",
        nextRunAt: null,
      },
    })
  }

  private static async resolveDestination(destination: TradeDestination) {
    if ("villageId" in destination && destination.villageId) {
      return prisma.village.findUnique({
        where: { id: destination.villageId },
        include: { player: { select: { id: true, playerName: true } } },
      })
    }

    if ("coordinates" in destination) {
      const { x, y } = destination.coordinates
      return prisma.village.findUnique({
        where: { x_y: { x, y } },
        include: { player: { select: { id: true, playerName: true } } },
      })
    }

    return null
  }

  private static async assertVillageCanAfford(
    village: {
      id: string
      wood: number
      stone: number
      iron: number
      gold: number
      food: number
    },
    bundle: ResourceBundle,
  ) {
    const sanitized = this.sanitizeBundle(bundle)
    const canAfford = await StorageService.canAfford(village.id, sanitized)
    if (!canAfford) {
      throw new Error("Insufficient resources in the source village")
    }

    const reservedTotals = await ResourceReservationService.getVillageReservedTotals(village.id)
    for (const key of RESOURCE_KEYS) {
      const available = (village[key] ?? 0) - (reservedTotals[key] ?? 0)
      if (available < (sanitized[key] ?? 0)) {
        throw new Error(`Cannot send reserved ${key} (available after reservations: ${available})`)
      }
    }
  }

  private static sanitizeBundle(bundle: ResourceBundle): ResourceBundle {
    const result: ResourceBundle = {}
    for (const key of RESOURCE_KEYS) {
      const value = bundle[key]
      if (value && value > 0) {
        result[key] = Math.floor(value)
      }
    }
    return result
  }
}
