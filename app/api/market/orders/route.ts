import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { marketOrderSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"
import type { OrderType, Resource } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const resource = req.nextUrl.searchParams.get("resource") as Resource | null
    const status = req.nextUrl.searchParams.get("status")

    const where: any = {}
    if (resource) where.offeringResource = resource
    if (status) where.status = status
    else where.status = "OPEN"

    const orders = await prisma.marketOrder.findMany({
      where,
      include: { player: { select: { playerName: true } }, village: { select: { name: true, x: true, y: true } } },
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
    const body = await req.json()
    const validated = marketOrderSchema.parse(body)

    const village = await prisma.village.findUnique({
      where: { id: validated.villageId },
    })

    if (!village) {
      return notFoundResponse()
    }

    if (validated.type === "SELL") {
      // Check if village has resources
      const resourceKey = validated.offeringResource.toLowerCase() as keyof typeof village
      if ((village[resourceKey] as number) < validated.offeringAmount) {
        return errorResponse("Insufficient resources", 400)
      }

      // Deduct resources
      await prisma.village.update({
        where: { id: validated.villageId },
        data: {
          [resourceKey]: {
            decrement: validated.offeringAmount,
          },
        },
      })
    }

    const expiresAt = validated.expiresAt ? new Date(validated.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const order = await prisma.marketOrder.create({
      data: {
        villageId: validated.villageId,
        playerId: validated.villageId, // TODO: Get from auth
        type: validated.type as OrderType,
        offeringResource: validated.offeringResource,
        offeringAmount: validated.offeringAmount,
        requestResource: validated.requestResource,
        requestAmount: validated.requestAmount,
        expiresAt,
      },
      include: { player: { select: { playerName: true } }, village: { select: { name: true } } },
    })

    return successResponse(order, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orderId, action } = await req.json()

    if (!orderId || !action) {
      return errorResponse("Order ID and action required", 400)
    }

    const order = await prisma.marketOrder.findUnique({
      where: { id: orderId },
      include: { village: true },
    })

    if (!order) {
      return notFoundResponse()
    }

    if (action === "ACCEPT") {
      // Check if accepting player has resources
      const village = order.village
      const resourceKey = order.requestResource.toLowerCase() as keyof typeof village
      if ((village[resourceKey] as number) < order.requestAmount) {
        return errorResponse("Insufficient resources to accept order", 400)
      }

      // Complete the trade
      await prisma.$transaction(async (tx) => {
        // Transfer resources
        await tx.village.update({
          where: { id: order.villageId },
          data: {
            [order.offeringResource.toLowerCase()]: { increment: order.offeringAmount },
            [order.requestResource.toLowerCase()]: { decrement: order.requestAmount },
          },
        })

        // Update order status
        await tx.marketOrder.update({
          where: { id: orderId },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        })
      })
    } else if (action === "CANCEL") {
      // Return resources if it was a sell order
      if (order.type === "SELL") {
        await prisma.village.update({
          where: { id: order.villageId },
          data: {
            [order.offeringResource.toLowerCase()]: { increment: order.offeringAmount },
          },
        })
      }

      await prisma.marketOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      })
    }

    const updatedOrder = await prisma.marketOrder.findUnique({
      where: { id: orderId },
    })

    return successResponse(updatedOrder)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
