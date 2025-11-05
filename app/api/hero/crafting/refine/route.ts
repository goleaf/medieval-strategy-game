import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { ItemRarity, CraftingActionType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const { itemId, targetRarity } = await req.json()

    // Get authenticated player
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!itemId || !targetRarity) {
      return NextResponse.json(
        { error: "Item ID and target rarity are required" },
        { status: 400 }
      )
    }

    // Validate target rarity
    if (!Object.values(ItemRarity).includes(targetRarity)) {
      return NextResponse.json(
        { error: "Invalid target rarity" },
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

    // Validate that target rarity is higher than current rarity
    const rarityOrder = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC]
    const currentRarityIndex = rarityOrder.indexOf(item.template.rarity)
    const targetRarityIndex = rarityOrder.indexOf(targetRarity)

    if (targetRarityIndex <= currentRarityIndex) {
      return NextResponse.json(
        { error: "Target rarity must be higher than current rarity" },
        { status: 400 }
      )
    }

    // Check material requirements for refinement
    const materialRequirement = getRefineMaterialRequirement(item.template.rarity, targetRarity)
    const requiredMaterialRarity = getRequiredMaterialRarity(targetRarity)

    const playerMaterial = await prisma.material.findUnique({
      where: {
        playerId_rarity: {
          playerId: auth.playerId,
          rarity: requiredMaterialRarity
        }
      }
    })

    if (!playerMaterial || playerMaterial.quantity < materialRequirement) {
      return NextResponse.json(
        { error: `Not enough ${requiredMaterialRarity.toLowerCase()} materials. Required: ${materialRequirement}, Available: ${playerMaterial?.quantity || 0}` },
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

    // Calculate refining duration
    const durationHours = getRefineDuration(item.template.rarity, targetRarity)

    // Find the target item template
    const targetTemplate = await prisma.itemTemplate.findFirst({
      where: {
        name: item.template.name,
        qualityTier: item.template.qualityTier,
        rarity: targetRarity
      }
    })

    if (!targetTemplate) {
      return NextResponse.json(
        { error: "Target item template not found" },
        { status: 400 }
      )
    }

    // Use transaction to create crafting action and consume materials
    await prisma.$transaction(async (tx) => {
      // Consume materials
      await tx.material.update({
        where: {
          playerId_rarity: {
            playerId: auth.playerId,
            rarity: requiredMaterialRarity
          }
        },
        data: {
          quantity: {
            decrement: materialRequirement
          }
        }
      })

      // Create crafting action
      await tx.craftingAction.create({
        data: {
          playerId: auth.playerId,
          actionType: CraftingActionType.REFINE,
          itemId: itemId,
          materialRarity: requiredMaterialRarity,
          materialCount: materialRequirement,
          durationHours: durationHours,
          status: 'IN_PROGRESS',
          completedAt: new Date(Date.now() + durationHours * 60 * 60 * 1000)
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Started refining ${item.template.name} to ${targetRarity.toLowerCase()}. Will complete in ${durationHours} hours.`,
      durationHours
    })

  } catch (error) {
    console.error("[API] Error starting refine action:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to get material requirements for refinement
function getRefineMaterialRequirement(currentRarity: ItemRarity, targetRarity: ItemRarity): number {
  const rarityOrder = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC]
  const currentIndex = rarityOrder.indexOf(currentRarity)
  const targetIndex = rarityOrder.indexOf(targetRarity)

  if (targetIndex <= currentIndex) return 0

  // Material cost increases with each rarity jump
  const jumps = targetIndex - currentIndex
  return jumps * 2 // 2 materials per rarity level jump
}

// Helper function to get required material rarity for refinement
function getRequiredMaterialRarity(targetRarity: ItemRarity): ItemRarity {
  // Use same rarity material as target, or one level lower for common items
  switch (targetRarity) {
    case ItemRarity.COMMON:
      return ItemRarity.COMMON
    case ItemRarity.UNCOMMON:
      return ItemRarity.COMMON
    case ItemRarity.RARE:
      return ItemRarity.UNCOMMON
    case ItemRarity.EPIC:
      return ItemRarity.RARE
    default:
      return ItemRarity.COMMON
  }
}

// Helper function to get refining duration in hours
function getRefineDuration(currentRarity: ItemRarity, targetRarity: ItemRarity): number {
  const rarityOrder = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC]
  const currentIndex = rarityOrder.indexOf(currentRarity)
  const targetIndex = rarityOrder.indexOf(targetRarity)

  const jumps = targetIndex - currentIndex
  return Math.max(1, jumps * 2) // Minimum 1 hour, 2 hours per rarity jump
}

