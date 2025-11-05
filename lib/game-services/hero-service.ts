import { prisma } from "@/lib/db"
import { EquipmentSlot } from "@prisma/client"

export interface HeroStats {
  health: number
  attack: number
  defense: number
  speed: number
  // Equipment bonuses
  hpRegeneration?: number
  damageReduction?: number
  fightingStrength?: number
  bonusXP?: number
  healthRegenerationPercent?: number
  speedBonusAfter20Tiles?: number
  heroSpeedWithHorse?: number
}

export class HeroService {
  /**
   * Calculate hero stats including equipment bonuses
   */
  static async calculateHeroStats(heroId: string): Promise<HeroStats> {
    const hero = await prisma.hero.findUnique({
      where: { id: heroId },
      include: {
        equipment: {
          include: {
            item: {
              include: {
                template: true
              }
            }
          }
        }
      }
    })

    if (!hero) {
      throw new Error("Hero not found")
    }

    // Base stats
    const baseStats: HeroStats = {
      health: hero.health,
      attack: hero.attack,
      defense: hero.defense,
      speed: hero.speed,
    }

    // Add equipment bonuses
    const equipmentBonuses = this.calculateEquipmentBonuses(hero.equipment)

    return {
      ...baseStats,
      ...equipmentBonuses
    }
  }

  /**
   * Calculate bonuses from equipped items
   */
  private static calculateEquipmentBonuses(equipment: any[]): Partial<HeroStats> {
    const bonuses: Partial<HeroStats> = {}

    for (const eq of equipment) {
      const effects = JSON.parse(eq.item.template.effects)

      // Apply each effect based on the bonus type
      Object.entries(effects).forEach(([key, value]) => {
        switch (key) {
          case 'hpRegeneration':
            bonuses.hpRegeneration = (bonuses.hpRegeneration || 0) + (value as number)
            break
          case 'damageReduction':
            bonuses.damageReduction = (bonuses.damageReduction || 0) + (value as number)
            break
          case 'fightingStrength':
            bonuses.fightingStrength = (bonuses.fightingStrength || 0) + (value as number)
            break
          case 'bonusXP':
            bonuses.bonusXP = (bonuses.bonusXP || 0) + (value as number)
            break
          case 'healthRegenerationPercent':
            bonuses.healthRegenerationPercent = (bonuses.healthRegenerationPercent || 0) + (value as number)
            break
          case 'speedBonusAfter20Tiles':
            bonuses.speedBonusAfter20Tiles = (bonuses.speedBonusAfter20Tiles || 0) + (value as number)
            break
          case 'heroSpeedWithHorse':
            bonuses.heroSpeedWithHorse = (bonuses.heroSpeedWithHorse || 0) + (value as number)
            break
        }
      })
    }

    return bonuses
  }

  /**
   * Get hero equipment summary
   */
  static async getHeroEquipment(heroId: string) {
    const hero = await prisma.hero.findUnique({
      where: { id: heroId },
      include: {
        equipment: {
          include: {
            item: {
              include: {
                template: true
              }
            }
          }
        },
        inventory: {
          include: {
            template: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!hero) {
      throw new Error("Hero not found")
    }

    return {
      heroId: hero.id,
      equipment: hero.equipment.map(eq => ({
        slot: eq.slot,
        item: {
          id: eq.item.id,
          name: eq.item.template.name,
          rarity: eq.item.template.rarity,
          qualityTier: eq.item.template.qualityTier,
          effects: JSON.parse(eq.item.template.effects)
        }
      })),
      inventory: hero.inventory.map(item => ({
        id: item.id,
        name: item.template.name,
        rarity: item.template.rarity,
        qualityTier: item.template.qualityTier,
        effects: JSON.parse(item.template.effects),
        source: item.source
      }))
    }
  }

  /**
   * Equip an item
   */
  static async equipItem(heroId: string, itemId: string): Promise<void> {
    // Verify the item belongs to the hero
    const item = await prisma.heroItem.findFirst({
      where: {
        id: itemId,
        heroId: heroId
      },
      include: {
        template: true
      }
    })

    if (!item) {
      throw new Error("Item not found in hero inventory")
    }

    const slot = item.template.slot

    // Use transaction to equip item
    await prisma.$transaction(async (tx) => {
      // Remove existing equipment in this slot if any
      await tx.heroEquipment.deleteMany({
        where: {
          heroId: heroId,
          slot: slot
        }
      })

      // Create new equipment
      await tx.heroEquipment.create({
        data: {
          heroId: heroId,
          itemId: itemId,
          slot: slot
        }
      })
    })
  }

  /**
   * Unequip an item from a slot
   */
  static async unequipItem(heroId: string, slot: EquipmentSlot): Promise<void> {
    const equipment = await prisma.heroEquipment.findUnique({
      where: {
        heroId_slot: {
          heroId: heroId,
          slot: slot
        }
      }
    })

    if (!equipment) {
      throw new Error("No item equipped in this slot")
    }

    await prisma.heroEquipment.delete({
      where: { id: equipment.id }
    })
  }

  /**
   * Add item to hero inventory
   */
  static async addItemToInventory(heroId: string, templateId: string, source: string = 'CRAFTED'): Promise<string> {
    const item = await prisma.heroItem.create({
      data: {
        heroId: heroId,
        templateId: templateId,
        source: source as any
      }
    })

    return item.id
  }

  /**
   * Get available equipment slots
   */
  static getEquipmentSlots(): EquipmentSlot[] {
    return [
      EquipmentSlot.HELMET,
      EquipmentSlot.ARMOR,
      EquipmentSlot.BOOTS,
      EquipmentSlot.WEAPON,
      EquipmentSlot.SHIELD,
      EquipmentSlot.HORSE
    ]
  }
}
