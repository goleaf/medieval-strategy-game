import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { MerchantService } from "@/lib/game-services/merchant-service"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { ShipmentService } from "@/lib/game-services/shipment-service"
import { StorageService, type ResourceBundle } from "@/lib/game-services/storage-service"
import { marketOrderSchema } from "@/lib/utils/validation"
import {
  errorResponse,
  handleValidationError,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/utils/api-response"
import {
  OrderStatus,
  type OrderType,
  Resource,
  ShipmentCreatedBy,
  StorageLedgerReason,
} from "@prisma/client"
import type { NextRequest } from "next/server"
import { z } from "zod"

const ORDER_ACTION_SCHEMA = z.object({
  orderId: z.string().min(1, "Order ID required"),
  action: z.enum(["ACCEPT", "CANCEL"]),
  acceptingVillageId: z.string().optional(),
})

const DEFAULT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const now = new Date()
    // Mark outdated offers as expired before returning results so clients never see stale trades.
    await prisma.marketOrder.updateMany({
      where: { status: OrderStatus.OPEN, expiresAt: { lt: now } },
      data: { status: OrderStatus.EXPIRED },
    })

    const resource = req.nextUrl.searchParams.get("resource") as Resource | null
    const statusParam = req.nextUrl.searchParams.get("status")
    const desiredStatus = statusParam ? (statusParam as OrderStatus) : OrderStatus.OPEN

    const where = {
      ...(resource ? { offeringResource: resource } : {}),
      status: desiredStatus,
      ...(desiredStatus === OrderStatus.OPEN ? { expiresAt: { gte: now } } : {}),
    }

    const orders = await prisma.marketOrder.findMany({
      where,
      include: {
        player: { select: { playerName: true } },
        village: { select: { name: true, x: true, y: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return successResponse(orders)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const body = await req.json()
    // Enforcement: owner creating orders must not be trade-restricted
    {
      const { checkPermission } = await import("@/lib/moderation/enforcement")
      const permission = await checkPermission(auth.playerId, "TRADE")
      if (!permission.allowed) {
        return errorResponse(permission.reason || "Trading restricted", 403)
      }
    }
    const validated = marketOrderSchema.parse(body)

    const village = await prisma.village.findUnique({
      where: { id: validated.villageId },
      include: { player: true },
    })

    if (!village || village.playerId !== auth.playerId) {
      return errorResponse("Village not found or unauthorized", 403)
    }

    const isPlayerProtected = await ProtectionService.isPlayerProtected(village.playerId)
    if (isPlayerProtected && validated.type === "SELL") {
      // Protected players cannot move resources off account freely.
      return errorResponse("Players under beginner protection cannot create sell offers", 403)
    }

    const bundle = toBundle(validated.offeringResource, validated.offeringAmount)

    try {
      const order = await prisma.$transaction(async (tx) => {
        // Snapshot ensures we respect tribe-specific merchant capacity.
        const snapshot = await MerchantService.getSnapshot(validated.villageId, tx)
        if (snapshot.marketplaceLevel <= 0) {
          throw new Error("Marketplace required to create offers")
        }

        const merchantsNeeded = MerchantService.calculateRequiredMerchants(
          bundle,
          snapshot.capacityPerMerchant,
        )
        if (merchantsNeeded <= 0) {
          throw new Error("Offer must reserve at least one merchant")
        }

        await MerchantService.reserveMerchantsForOffer(validated.villageId, merchantsNeeded, tx)
        await StorageService.deductResources(validated.villageId, bundle, StorageLedgerReason.TRADE_OUT, {
          client: tx,
          metadata: { intent: "market_offer_hold" },
        })

        const expiresAt = validated.expiresAt
          ? new Date(validated.expiresAt)
          : new Date(Date.now() + DEFAULT_EXPIRATION_MS)

        return tx.marketOrder.create({
          data: {
            villageId: validated.villageId,
            playerId: village.playerId,
            type: validated.type as OrderType,
            offeringResource: validated.offeringResource,
            offeringAmount: validated.offeringAmount,
            requestResource: validated.requestResource,
            requestAmount: validated.requestAmount,
            expiresAt,
            merchantsRequired: merchantsNeeded,
          },
          include: {
            player: { select: { playerName: true } },
            village: { select: { name: true } },
          },
        })
      })

      return successResponse(order, 201)
    } catch (innerError) {
      // Translate transactional failures into friendly validation errors.
      return errorResponse((innerError as Error).message, 400)
    }
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = ORDER_ACTION_SCHEMA.parse(await req.json())
    const now = new Date()

    return await prisma.$transaction(async (tx) => {
      const order = await tx.marketOrder.findUnique({
        where: { id: payload.orderId },
        include: {
          village: { include: { player: true } },
        },
      })

      if (!order) {
        return notFoundResponse()
      }

      if (order.status !== OrderStatus.OPEN) {
        return errorResponse("Order is no longer available", 400)
      }

      if (order.expiresAt < now) {
        await tx.marketOrder.update({
          where: { id: order.id },
          data: { status: OrderStatus.EXPIRED },
        })
        return errorResponse("Order expired", 400)
      }

      if (payload.action === "CANCEL") {
        if (order.playerId !== auth.playerId) {
          return errorResponse("Only the offer owner can cancel", 403)
        }

        await MerchantService.releaseReservedMerchants(order.villageId, order.merchantsRequired, tx)
        await StorageService.addResources(
          order.villageId,
          toBundle(order.offeringResource, order.offeringAmount),
          StorageLedgerReason.TRADE_IN,
          {
            client: tx,
            metadata: { intent: "market_offer_cancel", orderId: order.id },
          },
        )

        const updated = await tx.marketOrder.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        })

        return successResponse(updated)
      }

      const acceptingVillageId = payload.acceptingVillageId
      if (!acceptingVillageId) {
        return errorResponse("Accepting village ID required", 400)
      }

      const acceptingVillage = await tx.village.findUnique({
        where: { id: acceptingVillageId },
        include: { player: true },
      })

      if (!acceptingVillage || acceptingVillage.playerId !== auth.playerId) {
        return errorResponse("Accepting village not found or unauthorized", 403)
      }

      // Enforcement: acceptor must not be trade-restricted
      {
        const { checkPermission } = await import("@/lib/moderation/enforcement")
        const permission = await checkPermission(auth.playerId, "TRADE")
        if (!permission.allowed) {
          return errorResponse(permission.reason || "Trading restricted", 403)
        }
      }

      const acceptingBundle = toBundle(order.requestResource, order.requestAmount)
      const tradeRatio = order.offeringAmount / Math.max(1, order.requestAmount)

      const isProtected = await ProtectionService.isPlayerProtected(acceptingVillage.playerId)
      const hasLowPopulation = acceptingVillage.population < 200

      if ((isProtected || hasLowPopulation) && tradeRatio < 1) {
        return errorResponse("Protected players can only accept 1:1 or better trades", 403)
      }

      const snapshotSeller = await MerchantService.getSnapshot(order.villageId, tx)
      const snapshotBuyer = await MerchantService.getSnapshot(acceptingVillageId, tx)

      if (snapshotSeller.reservedMerchants < order.merchantsRequired) {
        return errorResponse("Offer is missing reserved merchants", 409)
      }

      const buyerMerchantsNeeded = MerchantService.calculateRequiredMerchants(
        acceptingBundle,
        snapshotBuyer.capacityPerMerchant,
      )

      if (snapshotBuyer.availableMerchants < buyerMerchantsNeeded) {
        return errorResponse("Accepting village lacks free merchants", 409)
      }

      await StorageService.deductResources(acceptingVillageId, acceptingBundle, StorageLedgerReason.TRADE_OUT, {
        client: tx,
        metadata: { intent: "market_offer_accept", orderId: order.id },
      })

      await MerchantService.releaseReservedMerchants(order.villageId, order.merchantsRequired, tx)
      await MerchantService.reserveMerchants(order.villageId, order.merchantsRequired, tx)
      await MerchantService.reserveMerchants(acceptingVillageId, buyerMerchantsNeeded, tx)

      await ShipmentService.createDirectShipment({
        sourceVillageId: order.villageId,
        targetVillageId: acceptingVillageId,
        bundle: toBundle(order.offeringResource, order.offeringAmount),
        createdBy: ShipmentCreatedBy.OFFER_MATCH,
        ledgerReason: StorageLedgerReason.TRADE_OUT,
        metadata: { intent: "market_offer_delivery", orderId: order.id },
        client: tx,
        reserveMerchants: false,
        deductResources: false,
        merchantsToUse: order.merchantsRequired,
      })

      await ShipmentService.createDirectShipment({
        sourceVillageId: acceptingVillageId,
        targetVillageId: order.villageId,
        bundle: acceptingBundle,
        createdBy: ShipmentCreatedBy.OFFER_MATCH,
        ledgerReason: StorageLedgerReason.TRADE_OUT,
        metadata: { intent: "market_offer_payment", orderId: order.id },
        client: tx,
        reserveMerchants: false,
        deductResources: false,
        merchantsToUse: buyerMerchantsNeeded,
      })

      const updated = await tx.marketOrder.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.ACCEPTED,
          acceptedAt: now,
          acceptedById: acceptingVillage.playerId,
        },
      })

      return successResponse(updated)
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

function toBundle(resource: Resource, amount: number): ResourceBundle {
  // Helper converts enum resource to the ledger bundle format used across services.
  return {
    wood: resource === Resource.WOOD ? amount : 0,
    stone: resource === Resource.STONE ? amount : 0,
    iron: resource === Resource.IRON ? amount : 0,
    gold: resource === Resource.GOLD ? amount : 0,
    food: resource === Resource.FOOD ? amount : 0,
  }
}
