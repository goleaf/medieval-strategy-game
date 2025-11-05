import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { CraftingActionType } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    // Get authenticated player
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    // Get current crafting actions
    const craftingActions = await prisma.craftingAction.findMany({
      where: {
        playerId: auth.playerId,
        status: { in: ['IN_PROGRESS', 'COMPLETED'] }
      },
      include: {
        item: {
          include: {
            template: true
          }
        },
        resultItem: {
          include: {
            template: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get available materials
    const materials = await prisma.material.findMany({
      where: { playerId: auth.playerId }
    })

    // Get available item templates for crafting
    const itemTemplates = await prisma.itemTemplate.findMany({
      orderBy: [
        { qualityTier: 'asc' },
        { rarity: 'asc' },
        { category: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: {
        craftingActions: craftingActions.map(action => ({
          id: action.id,
          actionType: action.actionType,
          status: action.status,
          startedAt: action.startedAt,
          completedAt: action.completedAt,
          durationHours: action.durationHours,
          materialRarity: action.materialRarity,
          materialCount: action.materialCount,
          item: action.item ? {
            id: action.item.id,
            name: action.item.template.name,
            rarity: action.item.template.rarity,
            qualityTier: action.item.template.qualityTier
          } : null,
          resultItem: action.resultItem ? {
            id: action.resultItem.id,
            name: action.resultItem.template.name,
            rarity: action.resultItem.template.rarity,
            qualityTier: action.resultItem.template.qualityTier
          } : null,
          materialGained: action.materialGained
        })),
        materials: materials.map(material => ({
          rarity: material.rarity,
          quantity: material.quantity
        })),
        itemTemplates: itemTemplates.map(template => ({
          id: template.id,
          name: template.name,
          category: template.category,
          slot: template.slot,
          rarity: template.rarity,
          qualityTier: template.qualityTier,
          effects: JSON.parse(template.effects),
          description: template.description
        }))
      }
    })

  } catch (error) {
    console.error("[API] Error fetching crafting data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

