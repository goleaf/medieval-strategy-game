import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { ItemRarity, CraftingActionType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const { templateId, materialRarity } = await req.json()

    // Get authenticated player
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!templateId || !materialRarity) {
      return NextResponse.json(
        { error: "Template ID and material rarity are required" },
        { status: 400 }
      )
    }

    // Validate material rarity
    if (!Object.values(ItemRarity).includes(materialRarity)) {
      return NextResponse.json(
        { error: "Invalid material rarity" },
        { status: 400 }
      )
    }

    // Get hero
    const hero = await prisma.hero.findUnique({
      where: { playerId: auth.playerId }
    })

    if (!hero) {
      return NextResponse.json(
        { error: "Hero not found" },
        { status: 404 }
      )
    }

    // Get item template
    const template = await prisma.itemTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json(
        { error: "Item template not found" },
        { status: 404 }
      )
    }

    // Check if player has enough materials
    const materialRequirement = getMaterialRequirement(template.rarity, materialRarity)
    const playerMaterial = await prisma.material.findUnique({
      where: {
        playerId_rarity: {
          playerId: auth.playerId,
          rarity: materialRarity
        }
      }
    })

    if (!playerMaterial || playerMaterial.quantity < materialRequirement) {
      return NextResponse.json(
        { error: `Not enough ${materialRarity.toLowerCase()} materials. Required: ${materialRequirement}, Available: ${playerMaterial?.quantity || 0}` },
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

    // Calculate crafting duration based on server speed (simplified)
    const durationHours = getCraftingDuration(template.rarity, materialRarity)

    // Use transaction to create crafting action and consume materials
    await prisma.$transaction(async (tx) => {
      // Consume materials
      await tx.material.update({
        where: {
          playerId_rarity: {
            playerId: auth.playerId,
            rarity: materialRarity
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
          actionType: CraftingActionType.FORGE,
          materialRarity: materialRarity,
          materialCount: materialRequirement,
          durationHours: durationHours,
          status: 'IN_PROGRESS',
          completedAt: new Date(Date.now() + durationHours * 60 * 60 * 1000)
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Started forging ${template.name}. Will complete in ${durationHours} hours.`,
      durationHours
    })

  } catch (error) {
    console.error("[API] Error starting forge action:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to get material requirements based on item rarity and material rarity
function getMaterialRequirement(itemRarity: ItemRarity, materialRarity: ItemRarity): number {
  const rarityMultiplier = {
    [ItemRarity.COMMON]: 1,
    [ItemRarity.UNCOMMON]: 2,
    [ItemRarity.RARE]: 4,
    [ItemRarity.EPIC]: 8
  }

  const baseRequirement = {
    [ItemRarity.COMMON]: 1,
    [ItemRarity.UNCOMMON]: 2,
    [ItemRarity.RARE]: 5,
    [ItemRarity.EPIC]: 10
  }

  return baseRequirement[itemRarity] * rarityMultiplier[materialRarity]
}

// Helper function to get crafting duration in hours
function getCraftingDuration(itemRarity: ItemRarity, materialRarity: ItemRarity): number {
  const baseDuration = {
    [ItemRarity.COMMON]: 1,
    [ItemRarity.UNCOMMON]: 2,
    [ItemRarity.RARE]: 4,
    [ItemRarity.EPIC]: 8
  }

  const rarityMultiplier = {
    [ItemRarity.COMMON]: 1,
    [ItemRarity.UNCOMMON]: 1.5,
    [ItemRarity.RARE]: 2,
    [ItemRarity.EPIC]: 3
  }

  return Math.ceil(baseDuration[itemRarity] * rarityMultiplier[materialRarity])
}
