import { prisma } from "@/lib/db"
import { CraftingActionType, ItemRarity } from "@prisma/client"

export class CraftingService {
  /**
   * Process completed crafting actions
   */
  static async processCompletedCrafting() {
    const completedActions = await prisma.craftingAction.findMany({
      where: {
        status: 'IN_PROGRESS',
        completedAt: {
          lte: new Date()
        }
      },
      include: {
        item: {
          include: {
            template: true
          }
        }
      }
    })

    for (const action of completedActions) {
      try {
        await this.completeCraftingAction(action.id)
      } catch (error) {
        console.error(`Failed to complete crafting action ${action.id}:`, error)
      }
    }
  }

  /**
   * Complete a specific crafting action
   */
  static async completeCraftingAction(actionId: string) {
    const action = await prisma.craftingAction.findUnique({
      where: { id: actionId },
      include: {
        item: {
          include: {
            template: true,
            hero: true
          }
        }
      }
    })

    if (!action || action.status !== 'IN_PROGRESS') {
      return
    }

    await prisma.$transaction(async (tx) => {
      switch (action.actionType) {
        case CraftingActionType.FORGE:
          await this.completeForgeAction(tx, action)
          break
        case CraftingActionType.REFINE:
          await this.completeRefineAction(tx, action)
          break
        case CraftingActionType.SMELT:
          await this.completeSmeltAction(tx, action)
          break
      }

      // Mark action as completed
      await tx.craftingAction.update({
        where: { id: actionId },
        data: {
          status: 'COMPLETED'
        }
      })
    })
  }

  /**
   * Complete a forge action (create new item)
   */
  private static async completeForgeAction(tx: any, action: any) {
    if (!action.materialRarity) return

    // Get hero
    const hero = await tx.hero.findUnique({
      where: { playerId: action.playerId }
    })

    if (!hero) return

    // Find a random item template that can be crafted with the material rarity
    // In a real implementation, this would have more sophisticated logic
    const possibleTemplates = await tx.itemTemplate.findMany({
      where: {
        rarity: this.getForgeResultRarity(action.materialRarity)
      }
    })

    if (possibleTemplates.length === 0) return

    const randomTemplate = possibleTemplates[Math.floor(Math.random() * possibleTemplates.length)]

    // Create the new item
    const newItem = await tx.heroItem.create({
      data: {
        heroId: hero.id,
        templateId: randomTemplate.id,
        source: 'CRAFTED'
      }
    })

    // Link the result to the crafting action
    await tx.craftingAction.update({
      where: { id: action.id },
      data: {
        resultItemId: newItem.id
      }
    })
  }

  /**
   * Complete a refine action (upgrade existing item)
   */
  private static async completeRefineAction(tx: any, action: any) {
    if (!action.itemId || !action.materialRarity) return

    // Find the target template (upgraded version)
    const currentItem = await tx.heroItem.findUnique({
      where: { id: action.itemId },
      include: { template: true }
    })

    if (!currentItem) return

    // Find upgraded template
    const rarityOrder = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC]
    const currentIndex = rarityOrder.indexOf(currentItem.template.rarity)
    const targetIndex = Math.min(currentIndex + 1, rarityOrder.length - 1)
    const targetRarity = rarityOrder[targetIndex]

    const targetTemplate = await tx.itemTemplate.findFirst({
      where: {
        name: currentItem.template.name,
        qualityTier: currentItem.template.qualityTier,
        rarity: targetRarity
      }
    })

    if (!targetTemplate) return

    // Update the item to use the new template
    await tx.heroItem.update({
      where: { id: action.itemId },
      data: {
        templateId: targetTemplate.id
      }
    })

    // Link the result to the crafting action
    await tx.craftingAction.update({
      where: { id: action.id },
      data: {
        resultItemId: action.itemId
      }
    })
  }

  /**
   * Complete a smelt action (gain materials)
   */
  private static async completeSmeltAction(tx: any, action: any) {
    if (!action.materialGained) return

    // The item was already removed when the action started
    // Now we just need to add the materials to the player

    // Get or create material record
    const existingMaterial = await tx.material.findUnique({
      where: {
        playerId_rarity: {
          playerId: action.playerId,
          rarity: ItemRarity.COMMON // Default to common for smelted materials
        }
      }
    })

    if (existingMaterial) {
      await tx.material.update({
        where: {
          playerId_rarity: {
            playerId: action.playerId,
            rarity: ItemRarity.COMMON
          }
        },
        data: {
          quantity: {
            increment: action.materialGained
          }
        }
      })
    } else {
      await tx.material.create({
        data: {
          playerId: action.playerId,
          rarity: ItemRarity.COMMON,
          quantity: action.materialGained
        }
      })
    }
  }

  /**
   * Get the possible result rarity from forging with a material
   */
  private static getForgeResultRarity(materialRarity: ItemRarity): ItemRarity {
    // Simplified: material rarity determines possible result rarities
    switch (materialRarity) {
      case ItemRarity.COMMON:
        return ItemRarity.COMMON
      case ItemRarity.UNCOMMON:
        return ItemRarity.UNCOMMON
      case ItemRarity.RARE:
        return ItemRarity.RARE
      case ItemRarity.EPIC:
        return ItemRarity.EPIC
      default:
        return ItemRarity.COMMON
    }
  }

  /**
   * Get crafting actions for a player
   */
  static async getPlayerCraftingActions(playerId: string) {
    return await prisma.craftingAction.findMany({
      where: { playerId },
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
  }

  /**
   * Cancel a crafting action
   */
  static async cancelCraftingAction(playerId: string, actionId: string) {
    const action = await prisma.craftingAction.findFirst({
      where: {
        id: actionId,
        playerId: playerId,
        status: 'IN_PROGRESS'
      }
    })

    if (!action) {
      throw new Error("Crafting action not found or not cancellable")
    }

    await prisma.$transaction(async (tx) => {
      // Refund materials if applicable
      if (action.materialRarity && action.materialCount) {
        const existingMaterial = await tx.material.findUnique({
          where: {
            playerId_rarity: {
              playerId: playerId,
              rarity: action.materialRarity
            }
          }
        })

        if (existingMaterial) {
          await tx.material.update({
            where: {
              playerId_rarity: {
                playerId: playerId,
                rarity: action.materialRarity
              }
            },
            data: {
              quantity: {
                increment: action.materialCount
              }
            }
          })
        } else {
          await tx.material.create({
            data: {
              playerId: playerId,
              rarity: action.materialRarity,
              quantity: action.materialCount
            }
          })
        }
      }

      // Restore item if it was removed (for smelt actions)
      // Note: In our current implementation, items are removed immediately for smelt

      // Mark action as cancelled
      await tx.craftingAction.update({
        where: { id: actionId },
        data: {
          status: 'CANCELLED'
        }
      })
    })
  }
}

