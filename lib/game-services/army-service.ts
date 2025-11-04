import { prisma } from "@/lib/db"
import { TroopService } from "./troop-service"
import type { TroopType } from "@prisma/client"

export class ArmyService {
  static async getArmyStatus(villageId: string) {
    const troops = await prisma.troop.findMany({
      where: { villageId },
    })

    const totalAttack = TroopService.calculatePower(troops, "attack")
    const totalDefense = TroopService.calculatePower(troops, "defense")
    const totalTroops = troops.reduce((sum, t) => sum + t.quantity, 0)

    return {
      troops,
      totalAttack,
      totalDefense,
      totalTroops,
    }
  }

  static async getRecruitmentTime(troopType: TroopType, level = 1): Promise<number> {
    const baseTime = this.getRecruitmentBaseTime(troopType)
    return Math.ceil(baseTime * (1 + level * 0.15))
  }

  private static getRecruitmentBaseTime(troopType: TroopType): number {
    const times: Record<TroopType, number> = {
      WARRIOR: 300,
      SPEARMAN: 360,
      BOWMAN: 420,
      HORSEMAN: 600,
      PALADIN: 900,
      EAGLE_KNIGHT: 720,
      RAM: 1200,
      CATAPULT: 1500,
      KNIGHT: 1080,
      NOBLEMAN: 2400,
    }
    return times[troopType]
  }

  static async dismissTroops(villageId: string, troopId: string, quantity: number): Promise<void> {
    const troop = await prisma.troop.findUnique({ where: { id: troopId } })
    if (!troop || troop.quantity < quantity) {
      throw new Error("Invalid troop quantity")
    }

    if (troop.quantity === quantity) {
      await prisma.troop.delete({ where: { id: troopId } })
    } else {
      await prisma.troop.update({
        where: { id: troopId },
        data: { quantity: troop.quantity - quantity },
      })
    }
  }

  static async reinforceVillage(
    fromVillageId: string,
    toVillageId: string,
    troops: Record<string, number>,
  ): Promise<void> {
    const fromVillage = await prisma.village.findUnique({
      where: { id: fromVillageId },
      include: { troops: true },
    })

    if (!fromVillage) throw new Error("Source village not found")

    for (const [troopId, quantity] of Object.entries(troops)) {
      const troop = fromVillage.troops.find((t) => t.id === troopId)
      if (!troop || troop.quantity < quantity) {
        throw new Error("Insufficient troops to reinforce")
      }

      await this.dismissTroops(fromVillageId, troopId, quantity)

      const existingTroop = await prisma.troop.findUnique({
        where: { villageId_type: { villageId: toVillageId, type: troop.type } },
      })

      if (existingTroop) {
        await prisma.troop.update({
          where: { id: existingTroop.id },
          data: { quantity: existingTroop.quantity + quantity },
        })
      } else {
        await prisma.troop.create({
          data: {
            villageId: toVillageId,
            type: troop.type,
            quantity,
            attack: troop.attack,
            defense: troop.defense,
            speed: troop.speed,
            health: troop.health,
          },
        })
      }
    }
  }
}
