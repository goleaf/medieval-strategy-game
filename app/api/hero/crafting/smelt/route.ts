import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { CraftingActionType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const { itemId } = await req.json()

    // Get authenticated player
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      )
    }

    // Get hero and item
    const hero = await prisma.hero.findUnique({
      where: { playerId: auth.playerId },
      include: {
        inventory: {
          where: { id: itemId },
          include: { template: true }
        }
      }
    })

    if (!hero) {
      return NextResponse.json(
        { error: "Hero not found" },
        { status: 404 }
      )
    }

    if (hero.inventory.length === 0) {
      return NextResponse.json(
        { error: "Item not found in inventory" },
        { status: 404 }
      )
    }

    const item = hero.inventory[0]

    // Check if item is equipped
    const equippedItem = await prisma.heroEquipment.findUnique({
      where: {
        itemId: itemId
      }
    })

    if (equippedItem) {
      return NextResponse.json(
        { error: "Cannot smelt equipped items. Please unequip first." },
        { status: 400 }
      )
    }

    // Check if player already has an active crafting action
    const activeCrafting = await prisma.craftingAction.findFirst({
      where: {
        playerId: auth.playerId,
        status: 'IN_PROGRESS'
      }
    })

    if (activeCrafting) {
      return NextResponse.json(
        { error: "You already have an active crafting action" },
        { status: 400 }
      )
    }

    // Calculate materials gained from smelting
    const materialsGained = getSmeltMaterials(item.template.rarity, item.template.qualityTier)

    // Calculate smelting duration
    const durationHours = getSmeltDuration(item.template.rarity)

    // Use transaction to create crafting action and remove item
    await prisma.$transaction(async (tx) => {
      // Remove the item from inventory
      await tx.heroItem.delete({
        where: { id: itemId }
      })

      // Create crafting action
      await tx.craftingAction.create({
        data: {
          playerId: auth.playerId,
          actionType: CraftingActionType.SMELT,
          materialGained: materialsGained,
          durationHours: durationHours,
          status: 'IN_PROGRESS',
          completedAt: new Date(Date.now() + durationHours * 60 * 60 * 1000)
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Started smelting ${item.template.name}. Will gain ${materialsGained} ${item.template.rarity.toLowerCase()} materials in ${durationHours} hours.`,
      durationHours,
      materialsGained
    })

  } catch (error) {
    console.error("[API] Error starting smelt action:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to get materials gained from smelting
function getSmeltMaterials(rarity: string, qualityTier: number): number {
  const baseMaterials = {
    'COMMON': 1,
    'UNCOMMON': 2,
    'RARE': 3,
    'EPIC': 5
  }

  return (baseMaterials[rarity] || 1) * qualityTier
}

// Helper function to get smelting duration in hours
function getSmeltDuration(rarity: string): number {
  const durationHours = {
    'COMMON': 1,
    'UNCOMMON': 2,
    'RARE': 4,
    'EPIC': 6
  }

  return durationHours[rarity] || 1
}
