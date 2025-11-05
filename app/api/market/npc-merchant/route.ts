import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { npcMerchantExchangeSchema, npcMerchantBalanceSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"
import type { Resource } from "@prisma/client"

// Configuration constants
const NPC_MERCHANT_GOLD_COST = 3
const MIN_EXCHANGE_AMOUNT = 50

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get("action")

    if (action === "balance") {
      return handleBalanceResources(req)
    }

    return handleResourceExchange(req)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

async function handleResourceExchange(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = npcMerchantExchangeSchema.parse(body)

    // Validate that from and to resources are different
    if (validated.fromResource === validated.toResource) {
      return errorResponse("Cannot exchange resource with itself", 400)
    }

    // Get village with player info
    const village = await prisma.village.findUnique({
      where: { id: validated.villageId },
      include: { player: true },
    })

    if (!village) {
      return notFoundResponse()
    }

    // Check if player has enough gold
    if (village.gold < NPC_MERCHANT_GOLD_COST) {
      return errorResponse(`Insufficient gold for NPC Merchant (requires ${NPC_MERCHANT_GOLD_COST} Gold)`, 400)
    }

    // Check if village has enough of the source resource
    const fromResourceKey = validated.fromResource.toLowerCase() as keyof typeof village
    const currentFromAmount = village[fromResourceKey] as number

    if (currentFromAmount < validated.amount) {
      return errorResponse(`Insufficient ${validated.fromResource} resources (available: ${currentFromAmount}, required: ${validated.amount})`, 400)
    }

    // Perform the exchange transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct gold and exchange resources
      const updatedVillage = await tx.village.update({
        where: { id: validated.villageId },
        data: {
          gold: { decrement: NPC_MERCHANT_GOLD_COST },
          [fromResourceKey]: { decrement: validated.amount },
          [validated.toResource.toLowerCase()]: { increment: validated.amount },
        },
      })

      // Log the transaction in audit log
      await tx.auditLog.create({
        data: {
          adminId: "system", // Use system for NPC merchant transactions
          action: "NPC_MERCHANT_EXCHANGE",
          details: JSON.stringify({
            villageId: validated.villageId,
            playerId: village.playerId,
            fromResource: validated.fromResource,
            toResource: validated.toResource,
            amount: validated.amount,
            goldCost: NPC_MERCHANT_GOLD_COST,
            newFromAmount: updatedVillage[fromResourceKey],
            newToAmount: updatedVillage[validated.toResource.toLowerCase()],
          }),
          targetType: "village",
          targetId: validated.villageId,
        },
      })

      return updatedVillage
    })

    return successResponse({
      villageId: validated.villageId,
      fromResource: validated.fromResource,
      toResource: validated.toResource,
      amount: validated.amount,
      goldCost: NPC_MERCHANT_GOLD_COST,
      newFromAmount: result[fromResourceKey],
      newToAmount: result[validated.toResource.toLowerCase()],
      remainingGold: result.gold,
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

async function handleBalanceResources(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = npcMerchantBalanceSchema.parse(body)

    // Get village with current resources
    const village = await prisma.village.findUnique({
      where: { id: validated.villageId },
      include: { player: true },
    })

    if (!village) {
      return notFoundResponse()
    }

    // Check if player has enough gold
    if (village.gold < NPC_MERCHANT_GOLD_COST) {
      return errorResponse(`Insufficient gold for NPC Merchant (requires ${NPC_MERCHANT_GOLD_COST} Gold)`, 400)
    }

    // Calculate total resources and balanced amount
    const resourceKeys: (keyof typeof village)[] = ["wood", "stone", "iron", "food"] // Exclude gold from balancing
    const totalResources = resourceKeys.reduce((sum, key) => sum + (village[key] as number), 0)
    const balancedAmount = Math.floor(totalResources / resourceKeys.length)

    // Calculate adjustments needed
    const adjustments: Record<string, number> = {}
    let totalAdjustment = 0

    resourceKeys.forEach(key => {
      const currentAmount = village[key] as number
      const adjustment = balancedAmount - currentAmount
      if (adjustment !== 0) {
        adjustments[key] = adjustment
        totalAdjustment += Math.abs(adjustment)
      }
    })

    // If resources are already balanced, no need to do anything
    if (totalAdjustment === 0) {
      return errorResponse("Resources are already balanced", 400)
    }

    // Perform the balancing transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        gold: { decrement: NPC_MERCHANT_GOLD_COST },
      }

      // Set all resources to balanced amount
      resourceKeys.forEach(key => {
        updateData[key] = balancedAmount
      })

      const updatedVillage = await tx.village.update({
        where: { id: validated.villageId },
        data: updateData,
      })

      // Log the transaction in audit log
      await tx.auditLog.create({
        data: {
          adminId: "system",
          action: "NPC_MERCHANT_BALANCE",
          details: JSON.stringify({
            villageId: validated.villageId,
            playerId: village.playerId,
            totalResources,
            balancedAmount,
            adjustments,
            goldCost: NPC_MERCHANT_GOLD_COST,
            finalResources: resourceKeys.reduce((acc, key) => {
              acc[key] = updatedVillage[key]
              return acc
            }, {} as Record<string, number>),
          }),
          targetType: "village",
          targetId: validated.villageId,
        },
      })

      return updatedVillage
    })

    return successResponse({
      villageId: validated.villageId,
      totalResources,
      balancedAmount,
      adjustments,
      goldCost: NPC_MERCHANT_GOLD_COST,
      remainingGold: result.gold,
      finalResources: resourceKeys.reduce((acc, key) => {
        acc[key] = result[key]
        return acc
      }, {} as Record<string, number>),
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
