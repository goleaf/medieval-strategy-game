import { prisma } from "@/lib/db"
import { Prisma, Shipment, ShipmentCreatedBy, StorageLedgerReason } from "@prisma/client"
import { MerchantService } from "./merchant-service"
import { StorageService, type ResourceBundle } from "./storage-service"

type PrismaCtx = Prisma.TransactionClient | typeof prisma
const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const
type ResourceKey = (typeof RESOURCE_KEYS)[number]

type DirectShipmentParams = {
  sourceVillageId: string
  targetVillageId: string
  bundle: ResourceBundle
  createdBy?: ShipmentCreatedBy
  departAt?: Date
  ledgerReason?: StorageLedgerReason
  metadata?: Record<string, unknown>
  client?: PrismaCtx
  reserveMerchants?: boolean
  deductResources?: boolean
  merchantsToUse?: number
}

type TravelResult = {
  distance: number
  travelHours: number
  departAt: Date
  arriveAt: Date
  returnAt: Date
}

const MS_PER_HOUR = 60 * 60 * 1000

export class ShipmentService {
  static async createDirectShipment(params: DirectShipmentParams) {
    const sanitizedBundle = this.sanitizeBundle(params.bundle)
    if (this.getBundleTotal(sanitizedBundle) === 0) {
      throw new Error("Cannot create shipment without resources")
    }

    const departAt = params.departAt ?? new Date()
    const reason = params.ledgerReason ?? StorageLedgerReason.TRADE_OUT
    const client = params.client ?? prisma
    const shouldReserve = params.reserveMerchants ?? true
    const shouldDeduct = params.deductResources ?? true

    return this.runWithClient(client, async (tx) => {
      const merchantSnapshot = await MerchantService.getSnapshot(params.sourceVillageId, tx)
      const merchantsNeeded =
        params.merchantsToUse ??
        MerchantService.calculateRequiredMerchants(sanitizedBundle, merchantSnapshot.capacityPerMerchant)

      if (merchantsNeeded <= 0) {
        throw new Error("Unable to calculate merchant requirement for shipment")
      }

      if (shouldReserve) {
        // Default flow marks merchants busy so they cannot be double-booked.
        await MerchantService.reserveMerchants(params.sourceVillageId, merchantsNeeded, tx)
      }

      if (shouldDeduct) {
        // When shipments originate from storage (not prior reservations) the ledger records the outflow.
        await StorageService.deductResources(params.sourceVillageId, sanitizedBundle, reason, {
          client: tx,
          metadata: {
            targetVillageId: params.targetVillageId,
            shipmentIntent: params.metadata?.intent ?? "direct_shipment",
          },
        })
      }

      const travel = await this.calculateTravelWindow({
        sourceVillageId: params.sourceVillageId,
        targetVillageId: params.targetVillageId,
        tilesPerHour: merchantSnapshot.tilesPerHour,
        departAt,
        client: tx,
      })

      const shipment = await tx.shipment.create({
        data: {
          sourceVillageId: params.sourceVillageId,
          targetVillageId: params.targetVillageId,
          wood: sanitizedBundle.wood ?? 0,
          stone: sanitizedBundle.stone ?? 0,
          iron: sanitizedBundle.iron ?? 0,
          gold: sanitizedBundle.gold ?? 0,
          food: sanitizedBundle.food ?? 0,
          merchantsUsed: merchantsNeeded,
          departAt: travel.departAt,
          arriveAt: travel.arriveAt,
          returnAt: travel.returnAt,
          status: travel.departAt > new Date() ? "SCHEDULED" : "EN_ROUTE",
          createdBy: params.createdBy ?? "PLAYER",
        },
      })

      return shipment
    })
  }

  static async processDueArrivals(now = new Date()) {
    const shipments = await prisma.shipment.findMany({
      where: {
        status: "EN_ROUTE",
        arriveAt: { lte: now },
      },
    })

    for (const shipment of shipments) {
      await this.markShipmentArrived(shipment, now)
    }
  }

  static async processDueReturns(now = new Date()) {
    const shipments = await prisma.shipment.findMany({
      where: {
        status: { in: ["RETURNING", "DELIVERED", "CANCELLED"] },
        returnAt: { lte: now },
      },
    })

    for (const shipment of shipments) {
      await this.markShipmentReturned(shipment, now)
    }
  }

  static async cancelShipment(shipmentId: string, actorPlayerId: string) {
    const now = new Date()
    return prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          sourceVillage: {
            select: {
              playerId: true,
            },
          },
        },
      })

      if (!shipment) {
        throw new Error("Shipment not found")
      }
      if (shipment.sourceVillage.playerId !== actorPlayerId) {
        throw new Error("You can only cancel your own shipments")
      }
      if (!["SCHEDULED", "EN_ROUTE"].includes(shipment.status)) {
        throw new Error("Only active shipments can be cancelled")
      }
      if (shipment.arriveAt <= now) {
        throw new Error("Shipment already arrived")
      }

      const travelDuration = Math.max(0, shipment.arriveAt.getTime() - shipment.departAt.getTime())
      const elapsed = Math.max(0, now.getTime() - shipment.departAt.getTime())
      const returnDuration = Math.min(travelDuration, elapsed)
      const returnAt = new Date(now.getTime() + returnDuration)

      return tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          returnAt,
        },
      })
    })
  }

  private static async markShipmentArrived(shipment: Shipment, timestamp: Date) {
    await prisma.$transaction(async (tx) => {
      const bundle = this.extractBundle(shipment)
      const { appliedDelta } = await StorageService.addResources(
        shipment.targetVillageId,
        bundle,
        StorageLedgerReason.TRADE_IN,
        {
        client: tx,
        metadata: {
          shipmentId: shipment.id,
          fromVillageId: shipment.sourceVillageId,
        },
      })

      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "RETURNING",
          deliveredAt: timestamp,
        },
      })

      // If there was overflow, log it as a ledger entry tied to the source village for visibility
      const overflow = this.calculateOverflow(bundle, appliedDelta)
      if (overflow > 0) {
        await tx.villageStorageLedger.create({
          data: {
            villageId: shipment.targetVillageId,
            woodDelta: 0,
            stoneDelta: 0,
            ironDelta: 0,
            goldDelta: 0,
            foodDelta: 0,
            reason: StorageLedgerReason.OTHER,
            metadata: {
              shipmentId: shipment.id,
              overflow,
            },
          },
        })
      }
    })
  }

  private static async markShipmentReturned(shipment: Shipment, timestamp: Date) {
    await prisma.$transaction(async (tx) => {
      const returningWithCargo = !!shipment.cancelledAt && !shipment.deliveredAt
      if (returningWithCargo) {
        const bundle = this.extractBundle(shipment)
        await StorageService.addResources(
          shipment.sourceVillageId,
          bundle,
          StorageLedgerReason.TRADE_IN,
          {
            client: tx,
            metadata: {
              shipmentId: shipment.id,
              intent: "trade_cancel_return",
            },
          },
        )
      }

      await MerchantService.releaseMerchants(shipment.sourceVillageId, shipment.merchantsUsed, tx)
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "RETURNED",
          returnedAt: timestamp,
        },
      })
    })
  }

  private static async calculateTravelWindow(params: {
    sourceVillageId: string
    targetVillageId: string
    tilesPerHour: number
    departAt: Date
    client?: PrismaCtx
  }): Promise<TravelResult> {
    const client = params.client ?? prisma
    const villages = await client.village.findMany({
      where: { id: { in: [params.sourceVillageId, params.targetVillageId] } },
      select: {
        id: true,
        x: true,
        y: true,
        player: {
          select: {
            gameWorld: {
              select: { speed: true },
            },
          },
        },
      },
    })

    const source = villages.find((v) => v.id === params.sourceVillageId)
    const target = villages.find((v) => v.id === params.targetVillageId)
    if (!source || !target) {
      throw new Error("Unable to load village coordinates for shipment")
    }

    const [minId, maxId] =
      source.id < target.id ? [source.id, target.id] : [target.id, source.id]

    let distanceRecord = await client.villageDistanceCache.findUnique({
      where: {
        villageAId_villageBId: {
          villageAId: minId,
          villageBId: maxId,
        },
      },
    })

    const distance =
      distanceRecord?.distance ??
      Math.hypot(source.x - target.x, source.y - target.y)

    if (!distanceRecord) {
      await client.villageDistanceCache.create({
        data: {
          villageAId: minId,
          villageBId: maxId,
          distance,
        },
      })
    }

    const worldSpeed = source.player?.gameWorld?.speed ?? 1
    const adjustedSpeed = params.tilesPerHour * worldSpeed
    const travelHours = adjustedSpeed <= 0 ? 0 : distance / adjustedSpeed
    const departAt = params.departAt
    const arriveAt = new Date(departAt.getTime() + travelHours * MS_PER_HOUR)
    const returnAt = new Date(arriveAt.getTime() + travelHours * MS_PER_HOUR)

    return { distance, travelHours, departAt, arriveAt, returnAt }
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

  private static extractBundle(shipment: Shipment): ResourceBundle {
    return {
      wood: shipment.wood,
      stone: shipment.stone,
      iron: shipment.iron,
      gold: shipment.gold,
      food: shipment.food,
    }
  }

  private static getBundleTotal(bundle: ResourceBundle) {
    return RESOURCE_KEYS.reduce((sum, key) => {
      return sum + Math.max(0, bundle[key] ?? 0)
    }, 0)
  }

  private static calculateOverflow(requested: ResourceBundle, appliedDelta: Record<ResourceKey, number>) {
    return RESOURCE_KEYS.reduce((overflow, key) => {
      const requestedAmount = requested[key] ?? 0
      const applied = appliedDelta[key] ?? 0
      return overflow + Math.max(0, requestedAmount - applied)
    }, 0)
  }

  private static runWithClient<T>(client: PrismaCtx, cb: (tx: Prisma.TransactionClient) => Promise<T>) {
    // Mirror MerchantService helper so callers can provide existing transactions.
    const maybeClient = client as Prisma.TransactionClient & { $transaction?: typeof prisma.$transaction }
    if (typeof (maybeClient as any).$transaction === "function") {
      return (client as typeof prisma).$transaction(cb)
    }
    return cb(client as Prisma.TransactionClient)
  }
}
