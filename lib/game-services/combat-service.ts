import { prisma } from "@/lib/db"
import { TroopService } from "./troop-service"
import { VillageService } from "./village-service"
import type { AttackStatus, AttackType } from "@prisma/client"

interface CombatResult {
  attackerWon: boolean
  attackerCasualties: Record<string, number> // troopId -> casualties
  defenderCasualties: Record<string, number>
  lootWood: number
  lootStone: number
  lootIron: number
  lootGold: number
  lootFood: number
  wallDamage?: number
  buildingDamage?: Array<{ buildingId: string; damage: number }>
}

interface ScoutingResult {
  success: boolean
  units?: Array<{ type: string; quantity: number }>
  buildings?: Array<{ type: string; level: number }>
  storage?: { wood: number; stone: number; iron: number; gold: number; food: number }
}

export class CombatService {
  /**
   * Calculate carry capacity of attacker troops
   */
  static calculateCarryCapacity(attackUnits: Array<{ troop: { type: string; quantity: number } }>): number {
    // Each unit has different carry capacity
    const carryPerUnit: Record<string, number> = {
      WARRIOR: 5,
      SPEARMAN: 5,
      BOWMAN: 3,
      HORSEMAN: 10,
      PALADIN: 15,
      EAGLE_KNIGHT: 12,
      RAM: 0,
      CATAPULT: 0,
      KNIGHT: 15,
      NOBLEMAN: 0,
    }

    return attackUnits.reduce((total, unit) => {
      const carry = carryPerUnit[unit.troop.type] || 0
      return total + carry * unit.quantity
    }, 0)
  }

  /**
   * Resolve classic O/D combat with wall bonus and randomness
   */
  static resolveCombat(
    attackerOffense: number,
    defenderDefense: number,
    wallLevel: number,
    attackerTroops: Array<{ id: string; quantity: number; attack: number; type?: string }>,
    defenderTroops: Array<{ id: string; quantity: number; defense: number }>,
    hasSiege: boolean,
  ): CombatResult {
    // Wall bonus: each level adds defense
    const wallBonus = wallLevel * 50
    const totalDefenderDefense = defenderDefense + wallBonus

    // Small randomness: ±5%
    const randomFactor = 0.95 + Math.random() * 0.1
    const adjustedAttackerOffense = attackerOffense * randomFactor
    const adjustedDefenderDefense = totalDefenderDefense * (2.05 - randomFactor) // Slight defender advantage

    const totalPower = adjustedAttackerOffense + adjustedDefenderDefense
    const attackerWon = adjustedAttackerOffense > adjustedDefenderDefense

    // Calculate casualties per unit type
    const attackerCasualties: Record<string, number> = {}
    const defenderCasualties: Record<string, number> = {}

    if (attackerWon) {
      const attackerDeathRate = Math.min(0.5, (adjustedDefenderDefense / totalPower) * 0.6)
      for (const troop of attackerTroops) {
        attackerCasualties[troop.id] = Math.floor(troop.quantity * attackerDeathRate)
      }

      const defenderDeathRate = Math.min(0.7, (adjustedAttackerOffense / totalPower) * 0.8)
      for (const troop of defenderTroops) {
        defenderCasualties[troop.id] = Math.floor(troop.quantity * defenderDeathRate)
      }
    } else {
      const attackerDeathRate = Math.min(0.7, (adjustedDefenderDefense / totalPower) * 0.8)
      for (const troop of attackerTroops) {
        attackerCasualties[troop.id] = Math.floor(troop.quantity * attackerDeathRate)
      }

      const defenderDeathRate = Math.min(0.4, (adjustedAttackerOffense / totalPower) * 0.5)
      for (const troop of defenderTroops) {
        defenderCasualties[troop.id] = Math.floor(troop.quantity * defenderDeathRate)
      }
    }

    // Siege damage to walls/buildings
    let wallDamage = 0
    const buildingDamage: Array<{ buildingId: string; damage: number }> = []

    if (hasSiege && attackerWon) {
      // RAMs and CATAPULTs damage walls/buildings
      const siegeUnits = attackerTroops.filter(
        (t) => t.type === "RAM" || t.type === "CATAPULT",
      )
      const siegePower = siegeUnits.reduce((sum, t) => sum + t.quantity, 0)
      wallDamage = Math.min(wallLevel, Math.floor(siegePower / 10)) // Max damage = current wall level
    }

    return {
      attackerWon,
      attackerCasualties,
      defenderCasualties,
      lootWood: 0, // Calculated separately
      lootStone: 0,
      lootIron: 0,
      lootGold: 0,
      lootFood: 0,
      wallDamage,
      buildingDamage,
    }
  }

  /**
   * Resolve scouting attack
   * Success vs enemy scouts, reveals units/buildings/storage
   */
  static async resolveScouting(
    attackerScouts: number,
    defenderScouts: number,
    defenderVillageId: string,
  ): Promise<ScoutingResult> {
    // Success chance based on scout ratio
    const scoutRatio = attackerScouts / Math.max(1, defenderScouts)
    const successChance = Math.min(0.95, scoutRatio / (scoutRatio + 1))

    const success = Math.random() < successChance

    if (!success) {
      return { success: false }
    }

    // Success: reveal defender information
    const defenderVillage = await prisma.village.findUnique({
      where: { id: defenderVillageId },
      include: {
        troops: true,
        buildings: true,
      },
    })

    if (!defenderVillage) {
      return { success: false }
    }

    return {
      success: true,
      units: defenderVillage.troops.map((t) => ({
        type: t.type,
        quantity: t.quantity,
      })),
      buildings: defenderVillage.buildings.map((b) => ({
        type: b.type,
        level: b.level,
      })),
      storage: {
        wood: defenderVillage.wood,
        stone: defenderVillage.stone,
        iron: defenderVillage.iron,
        gold: defenderVillage.gold,
        food: defenderVillage.food,
      },
    }
  }

  /**
   * Process attack resolution with all combat logic
   */
  static async processAttackResolution(attackId: string): Promise<void> {
    const attack = await prisma.attack.findUnique({
      where: { id: attackId },
      include: {
        attackUnits: { include: { troop: true } },
        defenseUnits: { include: { troop: true } },
        fromVillage: { include: { buildings: true } },
        toVillage: { include: { buildings: true, troops: true } },
      },
    })

    if (!attack || !attack.toVillage) return

    // Handle scouting separately
    if (attack.type === "SCOUT") {
      await this.processScoutingAttack(attackId, attack)
      return
    }

    // Get wall level
    const wallBuilding = attack.toVillage.buildings.find((b) => b.type === "WALL")
    const wallLevel = wallBuilding?.level || 0

    // Calculate offense/defense
    const attackerOffense = TroopService.calculatePower(
      attack.attackUnits.map((u) => u.troop),
      "attack",
    )
    const defenderDefense = TroopService.calculatePower(
      attack.defenseUnits.map((u) => u.troop),
      "defense",
    )

    // Check for siege units (RAM and CATAPULT)
    const hasSiege = attack.attackUnits.some(
      (u) => u.troop.type === "RAM" || u.troop.type === "CATAPULT",
    )

    // Resolve combat
    const result = this.resolveCombat(
      attackerOffense,
      defenderDefense,
      wallLevel,
      attack.attackUnits.map((u) => ({
        id: u.troop.id,
        quantity: u.quantity,
        attack: u.troop.attack,
        type: u.troop.type,
      })),
      attack.defenseUnits.map((u) => ({
        id: u.troop.id,
        quantity: u.quantity,
        defense: u.troop.defense,
      })),
      hasSiege,
    )

    // Apply wall damage
    if (result.wallDamage && wallBuilding) {
      const newWallLevel = Math.max(0, wallLevel - result.wallDamage)
      await prisma.building.update({
        where: { id: wallBuilding.id },
        data: { level: newWallLevel },
      })
    }

    // Calculate loot (limited by carry capacity and defender storage)
    const carryCapacity = this.calculateCarryCapacity(attack.attackUnits)
    const defenderStorage = {
      wood: attack.toVillage.wood,
      stone: attack.toVillage.stone,
      iron: attack.toVillage.iron,
      gold: attack.toVillage.gold,
      food: attack.toVillage.food,
    }

    let lootWood = 0
    let lootStone = 0
    let lootIron = 0
    let lootGold = 0
    let lootFood = 0

    if (result.attackerWon) {
      // Loot up to carry capacity, but not more than defender has
      const totalResources = defenderStorage.wood + defenderStorage.stone + defenderStorage.iron + defenderStorage.gold + defenderStorage.food
      const lootRatio = Math.min(1, carryCapacity / Math.max(1, totalResources))

      lootWood = Math.min(Math.floor(defenderStorage.wood * lootRatio), carryCapacity)
      lootStone = Math.min(Math.floor(defenderStorage.stone * lootRatio), carryCapacity - lootWood)
      lootIron = Math.min(Math.floor(defenderStorage.iron * lootRatio), carryCapacity - lootWood - lootStone)
      lootGold = Math.min(Math.floor(defenderStorage.gold * lootRatio), carryCapacity - lootWood - lootStone - lootIron)
      lootFood = Math.min(Math.floor(defenderStorage.food * lootRatio), carryCapacity - lootWood - lootStone - lootIron - lootGold)
    }

    // Update attack with results
    await prisma.attack.update({
      where: { id: attackId },
      data: {
        status: "RESOLVED" as AttackStatus,
        attackerWon: result.attackerWon,
        lootWood,
        lootStone,
        lootIron,
        lootGold,
        lootFood,
        resolvedAt: new Date(),
      },
    })

    // Transfer loot
    if (result.attackerWon) {
      await prisma.village.update({
        where: { id: attack.fromVillageId },
        data: {
          wood: { increment: lootWood },
          stone: { increment: lootStone },
          iron: { increment: lootIron },
          gold: { increment: lootGold },
          food: { increment: lootFood },
        },
      })

      await prisma.village.update({
        where: { id: attack.toVillageId! },
        data: {
          wood: { decrement: lootWood },
          stone: { decrement: lootStone },
          iron: { decrement: lootIron },
          gold: { decrement: lootGold },
          food: { decrement: lootFood },
        },
      })
    }

    // Handle loyalty and conquest
    if (attack.type === "CONQUEST" && result.attackerWon) {
      // Check for nobleman attacks
      const nobleCount = attack.attackUnits
        .filter((u) => u.troop.type === "NOBLEMAN")
        .reduce((sum, u) => sum + u.quantity, 0)

      if (nobleCount > 0) {
        // Noble hit reduces 20-35 loyalty points (random)
        const loyaltyReduction = 20 + Math.floor(Math.random() * 16) // 20-35
        const newLoyalty = Math.max(0, attack.toVillage.loyalty - loyaltyReduction)

        await prisma.village.update({
          where: { id: attack.toVillageId! },
          data: { loyalty: newLoyalty },
        })

        // Conquest at ≤0 loyalty transfers ownership
        if (newLoyalty <= 0) {
          await this.transferVillageOwnership(attack.toVillageId!, attack.fromVillageId)
        }
      } else {
        // Regular conquest reduces loyalty by 5
        const newLoyalty = Math.max(0, attack.toVillage.loyalty - 5)
        await prisma.village.update({
          where: { id: attack.toVillageId! },
          data: { loyalty: newLoyalty },
        })
      }
    } else if (attack.type === "RAID" && result.attackerWon) {
      // Raid reduces loyalty by 2
      const newLoyalty = Math.max(0, attack.toVillage.loyalty - 2)
      await prisma.village.update({
        where: { id: attack.toVillageId! },
        data: { loyalty: newLoyalty },
      })
    }

    // Apply troop casualties
    for (const unit of attack.attackUnits) {
      const casualties = result.attackerCasualties[unit.troop.id] || 0
      const newQuantity = Math.max(0, unit.quantity - casualties)
      if (newQuantity === 0) {
        await prisma.troop.delete({ where: { id: unit.troop.id } })
      } else {
        await prisma.troop.update({
          where: { id: unit.troop.id },
          data: { quantity: newQuantity },
        })
      }
    }

    for (const unit of attack.defenseUnits) {
      const casualties = result.defenderCasualties[unit.troop.id] || 0
      const newQuantity = Math.max(0, unit.quantity - casualties)
      if (newQuantity === 0) {
        await prisma.troop.delete({ where: { id: unit.troop.id } })
      } else {
        await prisma.troop.update({
          where: { id: unit.troop.id },
          data: { quantity: newQuantity },
        })
      }
    }
  }

  /**
   * Process scouting attack
   */
  static async processScoutingAttack(attackId: string, attack: any): Promise<void> {
    const attackerScouts = attack.attackUnits
      .filter((u: any) => u.troop.type === "BOWMAN")
      .reduce((sum: number, u: any) => sum + u.quantity, 0)

    const defenderScouts = attack.toVillage.troops
      .filter((t: any) => t.type === "BOWMAN")
      .reduce((sum: number, t: any) => sum + t.quantity, 0)

    const scoutingResult = await this.resolveScouting(attackerScouts, defenderScouts, attack.toVillageId!)

    if (scoutingResult.success) {
      // Success: store scouting data
      await prisma.attack.update({
        where: { id: attackId },
        data: {
          status: "RESOLVED" as AttackStatus,
          attackerWon: true,
          scoutingData: JSON.stringify(scoutingResult),
          resolvedAt: new Date(),
        },
      })

      // Send message to attacker with scouting results
      await prisma.message.create({
        data: {
          senderId: attack.fromVillage.playerId,
          villageId: attack.fromVillageId,
          type: "SCOUT_RESULT",
          subject: `Scouting Report: ${attack.toVillage.name}`,
          content: JSON.stringify(scoutingResult),
        },
      })
    } else {
      // Failed: inform defender
      await prisma.attack.update({
        where: { id: attackId },
        data: {
          status: "RESOLVED" as AttackStatus,
          attackerWon: false,
          resolvedAt: new Date(),
        },
      })

      await prisma.message.create({
        data: {
          senderId: attack.toVillage.playerId,
          villageId: attack.toVillageId!,
          type: "SCOUT_DETECTED",
          subject: `Scout Detected at ${attack.toVillage.name}`,
          content: `Enemy scouts were detected and repelled at your village.`,
        },
      })
    }
  }

  /**
   * Transfer village ownership on conquest
   */
  static async transferVillageOwnership(villageId: string, newOwnerId: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
    })

    if (!village) return

    // Transfer ownership
    await prisma.village.update({
      where: { id: villageId },
      data: {
        playerId: newOwnerId,
        loyalty: 25 + Math.floor(Math.random() * 6), // Reset to 25-30
      },
    })

    // Remove all defending troops (conquered)
    await prisma.troop.deleteMany({
      where: { villageId },
    })
  }
}
