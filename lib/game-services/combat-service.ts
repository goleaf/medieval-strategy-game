import { prisma } from "@/lib/db"
import { TroopService } from "./troop-service"
import { VillageService } from "./village-service"
import { ProtectionService } from "./protection-service"
import { CrannyService } from "./cranny-service"
import { VillageDestructionService } from "./village-destruction-service"
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
  populationDamage?: number // Population reduction from building destruction
  buildingsDestroyed?: Array<{ id: string; type: string; level: number }>
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
  static calculateCarryCapacity(attackUnits: Array<{ troop: { type: string }; quantity: number }>): number {
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
      // Huns-specific units
      STEPPE_ARCHER: 8,
      HUN_WARRIOR: 12,
      LOGADES: 0,
    }

    return attackUnits.reduce((total, unit) => {
      const carry = carryPerUnit[unit.troop.type] || 0
      return total + carry * unit.quantity
    }, 0)
  }

  /**
   * Resolve classic O/D combat with wall bonus, night bonus, and randomness
   */
  static async resolveCombat(
    attackerOffense: number,
    defenderDefense: number,
    wallLevel: number,
    attackerTroops: Array<{ id: string; quantity: number; attack: number; type?: string }>,
    defenderTroops: Array<{ id: string; quantity: number; defense: number }>,
    hasSiege: boolean,
    attackType: string = "CONQUEST",
  ): Promise<CombatResult> {
    // Wall bonus: each level adds defense (Earth Wall has much weaker defense)
    const baseWallBonus = wallType === "EARTH_WALL" ? wallLevel * 2.5 : wallLevel * 50
    let totalDefenderDefense = defenderDefense + baseWallBonus

    // Night bonus: apply defense multiplier during night
    const nightBonus = await ProtectionService.getNightBonusMultiplier()
    totalDefenderDefense = totalDefenderDefense * nightBonus

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
      if (attackType === "RAID") {
        // Raid: Much lower attacker casualties, usually at least 1 survivor per unit type
        const attackerDeathRate = Math.min(0.1, (adjustedDefenderDefense / totalPower) * 0.2)
        for (const troop of attackerTroops) {
          const casualties = Math.floor(troop.quantity * attackerDeathRate)
          // Ensure at least 1 survivor if there were any troops
          attackerCasualties[troop.id] = Math.min(casualties, troop.quantity - 1)
        }
      } else {
        // Conquest: Normal casualties
        const attackerDeathRate = Math.min(0.5, (adjustedDefenderDefense / totalPower) * 0.6)
        for (const troop of attackerTroops) {
          attackerCasualties[troop.id] = Math.floor(troop.quantity * attackerDeathRate)
        }
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

    // Siege damage to walls/buildings and population reduction (only for conquests, not raids)
    let wallDamage = 0
    const buildingDamage: Array<{ buildingId: string; damage: number }> = []
    let populationDamage = 0
    const buildingsDestroyed: Array<{ id: string; type: string; level: number }> = []

    if (hasSiege && attackerWon && attackType !== "RAID") {
      // Get defender village for building destruction
      const defenderVillage = await prisma.village.findUnique({
        where: { id: attack.toVillageId! },
        include: { buildings: true },
      })

      if (defenderVillage) {
        // RAMs damage walls
        const ramUnits = attackerTroops.filter((t) => t.type === "RAM")
        const ramPower = ramUnits.reduce((sum, t) => sum + t.quantity, 0)
        wallDamage = Math.min(wallLevel, Math.floor(ramPower / 10)) // Max damage = current wall level

        // CATAPULTs destroy buildings and reduce population
        const catapultUnits = attackerTroops.filter((t) => t.type === "CATAPULT")
        const catapultPower = catapultUnits.reduce((sum, t) => sum + t.quantity, 0)

        if (catapultPower > 0) {
          // Calculate target population reduction (each catapult can destroy buildings worth ~10 population)
          const targetPopulationReduction = catapultPower * 10

          // Destroy buildings to reduce population
          const destructionResult = await VillageDestructionService.destroyBuildingsAndReducePopulation(
            defenderVillage.id,
            targetPopulationReduction
          )

          populationDamage = destructionResult.populationReduced
          buildingsDestroyed.push(...destructionResult.buildingsDestroyed.map(b => ({
            id: b.id,
            type: b.type,
            level: b.level
          })))
        }
      }
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

    const crannyInfo = await CrannyService.getCrannyInfo(defenderVillage.id)

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
      cranny: crannyInfo,
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
        fromVillage: { include: { buildings: true, player: { include: { tribe: true } } } },
        toVillage: { include: { buildings: true, troops: true, player: { include: { tribe: true } } } },
      },
    })

    if (!attack || !attack.toVillage) return

    // Final protection check (in case protection expired after attack was launched)
    if (attack.type !== "SCOUT") {
      const isProtected = await ProtectionService.isVillageProtected(attack.toVillage.id)
      if (isProtected) {
        // Cancel attack and refund troops
        await prisma.attack.update({
          where: { id: attackId },
          data: { status: "CANCELLED" as AttackStatus },
        })

        // Return troops to attacker
        for (const unit of attack.attackUnits) {
          await prisma.troop.update({
            where: { id: unit.troop.id },
            data: { quantity: { increment: unit.quantity } },
          })
        }

        // Send message to attacker
        await prisma.message.create({
          data: {
            senderId: attack.fromVillage.playerId,
            villageId: attack.fromVillageId,
            type: "SYSTEM",
            subject: "Attack Cancelled - Protection Active",
            content: `Your attack on ${attack.toVillage.name} was cancelled because the village is still under beginner protection.`,
          },
        })

        return
      }

      // Check for troop evasion (Gold Club feature)
      // For now, assume evasion is enabled for capital villages
      const isCapitalVillage = attack.toVillage.isCapital
      const hasGoldClub = true // TODO: Check player's gold club membership

      if (isCapitalVillage && hasGoldClub && attack.toVillage.troopEvasionEnabled) {
        // Check if no other troops are returning within 10 seconds
        const now = new Date()
        const tenSecondsFromNow = new Date(now.getTime() + 10000) // 10 seconds

        const returningMovements = await prisma.movement.findMany({
          where: {
            toX: attack.toVillage.x,
            toY: attack.toVillage.y,
            status: "IN_PROGRESS",
            arrivalAt: { lte: tenSecondsFromNow },
          },
        })

        if (returningMovements.length === 0) {
          // Trigger troop evasion
          await this.triggerTroopEvasion(attack.toVillageId, attackId)
          return
        }
      }
    }

    // Handle scouting separately
    if (attack.type === "SCOUT") {
      await this.processScoutingAttack(attackId, attack)
      return
    }

    // Get wall level (includes WALL, STONE_WALL, EARTH_WALL)
    const wallBuilding = attack.toVillage.buildings.find((b) => b.type === "WALL" || b.type === "STONE_WALL" || b.type === "EARTH_WALL")
    const wallLevel = wallBuilding?.level || 0
    const wallType = wallBuilding?.type || "WALL"

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
    const result = await this.resolveCombat(
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
      attack.type,
      isStoneWall,
    )

    // Apply wall damage
    if (result.wallDamage && wallBuilding) {
      const newWallLevel = Math.max(0, wallLevel - result.wallDamage)
      await prisma.building.update({
        where: { id: wallBuilding.id },
        data: { level: newWallLevel },
      })
    }

    // Calculate loot (limited by carry capacity and defender storage, accounting for cranny protection)
    const carryCapacity = this.calculateCarryCapacity(attack.attackUnits)
    const defenderStorage = {
      wood: attack.toVillage.wood,
      stone: attack.toVillage.stone,
      iron: attack.toVillage.iron,
      gold: attack.toVillage.gold,
      food: attack.toVillage.food,
    }

    // Calculate cranny protection
    const attackerTribe = attack.fromVillage.player.tribe?.name
    const crannyProtection = await CrannyService.calculateTotalProtection(
      attack.toVillage.id,
      attackerTribe
    )

    // Calculate effective lootable resources (defender storage minus cranny protection)
    const effectiveStorage = CrannyService.calculateEffectiveLoot(defenderStorage, crannyProtection)

    let lootWood = 0
    let lootStone = 0
    let lootIron = 0
    let lootGold = 0
    let lootFood = 0

    if (result.attackerWon) {
      // Loot up to carry capacity, but not more than effective storage has (after cranny protection)
      const totalResources = effectiveStorage.wood + effectiveStorage.stone + effectiveStorage.iron + effectiveStorage.gold + effectiveStorage.food
      const lootRatio = Math.min(1, carryCapacity / Math.max(1, totalResources))

      lootWood = Math.min(Math.floor(effectiveStorage.wood * lootRatio), carryCapacity)
      lootStone = Math.min(Math.floor(effectiveStorage.stone * lootRatio), carryCapacity - lootWood)
      lootIron = Math.min(Math.floor(effectiveStorage.iron * lootRatio), carryCapacity - lootWood - lootStone)
      lootGold = Math.min(Math.floor(effectiveStorage.gold * lootRatio), carryCapacity - lootWood - lootStone - lootIron)
      lootFood = Math.min(Math.floor(effectiveStorage.food * lootRatio), carryCapacity - lootWood - lootStone - lootIron - lootGold)
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
    if (result.attackerWon) {
      if (attack.type === "CONQUEST") {
        // Check for nobleman and nomarch attacks (only for conquests, not raids)
        const nobleCount = attack.attackUnits
          .filter((u) => u.troop.type === "NOBLEMAN")
          .reduce((sum, u) => sum + u.quantity, 0)

        const nomarchCount = attack.attackUnits
          .filter((u) => u.troop.type === "NOMARCH")
          .reduce((sum, u) => sum + u.quantity, 0)

        const logadesCount = attack.attackUnits
          .filter((u) => u.troop.type === "LOGADES")
          .reduce((sum, u) => sum + u.quantity, 0)

        let totalLoyaltyReduction = 0

        if (nobleCount > 0) {
          // Noble hit reduces 20-35 loyalty points (random)
          totalLoyaltyReduction += 20 + Math.floor(Math.random() * 16) // 20-35
        }

        if (nomarchCount > 0) {
          // Egyptian Nomarch reduces 20-25 loyalty points (random)
          totalLoyaltyReduction += 20 + Math.floor(Math.random() * 6) // 20-25
        }

        if (logadesCount > 0) {
          // Huns Logades reduces 15-30 loyalty points (random)
          totalLoyaltyReduction += 15 + Math.floor(Math.random() * 16) // 15-30
        }

        if (totalLoyaltyReduction > 0) {
          const newLoyalty = Math.max(0, attack.toVillage.loyalty - totalLoyaltyReduction)

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
      } else if (attack.type === "RAID") {
        // Raid reduces loyalty by 2 (no chiefs/nobles affect loyalty)
        const newLoyalty = Math.max(0, attack.toVillage.loyalty - 2)
        await prisma.village.update({
          where: { id: attack.toVillageId! },
          data: { loyalty: newLoyalty },
        })
      }
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

  /**
   * Trigger troop evasion for a village (Gold Club feature)
   * Temporarily removes troops from the village to avoid attack
   */
  static async triggerTroopEvasion(villageId: string, attackId: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { troops: true, player: true },
    })

    if (!village) return

    // Get all troops trained in the capital (evadable troops)
    const evadableTroops = village.troops.filter(troop => troop.quantity > 0)

    if (evadableTroops.length === 0) {
      // No troops to evade, proceed with normal attack
      return
    }

    // Store evaded troops data (in a simple JSON format for now)
    const evadedTroopsData = evadableTroops.map(troop => ({
      type: troop.type,
      quantity: troop.quantity,
    }))

    // Remove troops from village (they "evade")
    for (const troop of evadableTroops) {
      await prisma.troop.update({
        where: { id: troop.id },
        data: { quantity: 0 },
      })
    }

    // Cancel the attack
    await prisma.attack.update({
      where: { id: attackId },
      data: { status: "CANCELLED" as AttackStatus },
    })

    // Return attacker troops
    const attack = await prisma.attack.findUnique({
      where: { id: attackId },
      include: { attackUnits: { include: { troop: true } } },
    })

    if (attack) {
      for (const unit of attack.attackUnits) {
        await prisma.troop.update({
          where: { id: unit.troop.id },
          data: { quantity: { increment: unit.quantity } },
        })
      }
    }

    // Schedule troop return in 3 minutes
    const returnTime = new Date(Date.now() + 3 * 60 * 1000) // 3 minutes

    // Store evasion data in a simple way (using a message for now)
    await prisma.message.create({
      data: {
        senderId: village.playerId,
        villageId: villageId,
        type: "SYSTEM",
        subject: "Troop Evasion Activated",
        content: JSON.stringify({
          type: "EVASION_RETURN",
          villageId,
          evadedTroops: evadedTroopsData,
          returnAt: returnTime.toISOString(),
          attackId,
        }),
      },
    })

    // Send notification to defender
    await prisma.message.create({
      data: {
        senderId: village.playerId,
        villageId: villageId,
        type: "SYSTEM",
        subject: "Troops Evaded Incoming Attack",
        content: `Your troops have successfully evaded an incoming attack on ${village.name}. They will return in 3 minutes.`,
      },
    })

    // Send notification to attacker
    if (attack) {
      await prisma.message.create({
        data: {
          senderId: attack.fromVillage.playerId,
          villageId: attack.fromVillageId,
          type: "SYSTEM",
          subject: "Attack Evaded",
          content: `Your attack on ${village.name} was evaded. The defending troops temporarily left the village.`,
        },
      })
    }

    console.log(`[v0] Troop evasion triggered for village ${village.name} (${villageId})`)
  }

  /**
   * Process troop return after evasion
   */
  static async processTroopReturn(villageId: string, evadedTroops: any[]): Promise<void> {
    for (const troopData of evadedTroops) {
      // Find or create troop record
      const existingTroop = await prisma.troop.findFirst({
        where: {
          villageId,
          type: troopData.type,
        },
      })

      if (existingTroop) {
        await prisma.troop.update({
          where: { id: existingTroop.id },
          data: { quantity: { increment: troopData.quantity } },
        })
      } else {
        await prisma.troop.create({
          data: {
            villageId,
            type: troopData.type,
            quantity: troopData.quantity,
            attack: 10, // Default stats
            defense: 5,
            speed: 5,
            health: 100,
          },
        })
      }
    }

    // Send notification
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { player: true },
    })

    if (village) {
      await prisma.message.create({
        data: {
          senderId: village.playerId,
          villageId: villageId,
          type: "SYSTEM",
          subject: "Troops Returned from Evasion",
          content: `Your troops have returned to ${village.name} after successfully evading an attack.`,
        },
      })
    }

    console.log(`[v0] Troops returned to village ${villageId} after evasion`)
  }
}
