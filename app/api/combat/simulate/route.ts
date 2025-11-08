import { NextRequest, NextResponse } from "next/server"
import type { BattleReport } from "@/lib/combat"
import { CombatService } from "@/lib/game-services/combat-service"
import { TroopService } from "@/lib/game-services/troop-service"
import type { AttackType } from "@prisma/client"
import { z } from "zod"

const simulateSchema = z.object({
  attackType: z.enum(["RAID", "CONQUEST"]),
  attackerTroops: z.array(z.object({
    type: z.string(),
    quantity: z.number().min(0),
  })),
  defenderTroops: z.array(z.object({
    type: z.string(),
    quantity: z.number().min(0),
  })),
  wallLevel: z.number().min(0).max(20).default(0),
  heroBonus: z.number().min(0).max(100).default(0),
  smithyLevels: z.object({
    attackerAttack: z.number().min(0).max(20).optional(),
    attackerDefense: z.number().min(0).max(20).optional(),
    defenderAttack: z.number().min(0).max(20).optional(),
    defenderDefense: z.number().min(0).max(20).optional(),
  }).optional(),
  defenderResources: z.object({
    wood: z.number().min(0),
    stone: z.number().min(0),
    iron: z.number().min(0),
    gold: z.number().min(0),
    food: z.number().min(0),
  }).optional(),
})

interface SimulationResult {
  attackerWon: boolean
  attackerCasualties: Record<string, number>
  defenderCasualties: Record<string, number>
  lootWood: number
  lootStone: number
  lootIron: number
  lootGold: number
  lootFood: number
  wallDamage?: number
  attackerOffense: number
  defenderDefense: number
  carryCapacity: number
  battleReport?: BattleReport
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = simulateSchema.parse(body)

    const {
      attackType,
      attackerTroops,
      defenderTroops,
      wallLevel,
      heroBonus,
      smithyLevels,
      defenderResources,
    } = validatedData

    // Convert troop arrays to combat service format
    const attackerSmithyAttack = smithyLevels?.attackerAttack ?? 0
    const attackerSmithyDefense = smithyLevels?.attackerDefense ?? 0
    const defenderSmithyAttack = smithyLevels?.defenderAttack ?? 0
    const defenderSmithyDefense = smithyLevels?.defenderDefense ?? 0

    const attackerTroopsForCombat = attackerTroops.map((troop, index) => {
      const stats = TroopService.getTroopStats(troop.type as any).stats
      return {
        id: `attacker-${troop.type}-${index}`,
        quantity: troop.quantity,
        attack: stats.attack,
        defense: stats.defense,
        type: troop.type,
        smithyAttackLevel: attackerSmithyAttack,
        smithyDefenseLevel: attackerSmithyDefense,
      }
    })

    const defenderTroopsForCombat = defenderTroops.map((troop, index) => {
      const stats = TroopService.getTroopStats(troop.type as any).stats
      return {
        id: `defender-${troop.type}-${index}`,
        quantity: troop.quantity,
        attack: stats.attack,
        defense: stats.defense,
        type: troop.type,
        smithyAttackLevel: defenderSmithyAttack,
        smithyDefenseLevel: defenderSmithyDefense,
      }
    })

    // Calculate total offense/defense
    const baseAttackerOffense = await TroopService.calculatePower(
      attackerTroopsForCombat.map(t => ({
        id: t.id,
        type: t.type as any,
        quantity: t.quantity,
        attack: t.attack,
        defense: 0,
        speed: 0,
        health: 0,
      })),
      "attack"
    )

    // Apply hero bonus to attacker offense
    const attackerOffense = baseAttackerOffense * (1 + heroBonus / 100)

    const defenderDefense = await TroopService.calculatePower(
      defenderTroopsForCombat.map(t => ({
        id: t.id,
        type: t.type as any,
        quantity: t.quantity,
        attack: 0,
        defense: t.defense,
        speed: 0,
        health: 0,
      })),
      "defense"
    )

    const heroAttackMultiplier = 1 + heroBonus / 100

    // Run simulation
    const result = await CombatService.resolveCombat({
      attackerTroops: attackerTroopsForCombat,
      defenderTroops: defenderTroopsForCombat,
      wallLevel,
      wallType: "city_wall",
      attackType: attackType as AttackType,
      heroAttackMultiplier,
      seedComponents: ["combat-sim", JSON.stringify(validatedData)],
    })

    // Estimate wall damage for the simulation response
    result.wallDamage = CombatService.estimateWallDamage({
      attackerTroops: attackerTroopsForCombat,
      attackerCasualties: result.attackerCasualties,
      wallLevel,
      wallType: "city_wall",
      attackType: attackType as AttackType,
    })

    // Calculate carry capacity
    const carryCapacity = CombatService.calculateCarryCapacity(
      attackerTroopsForCombat.map(t => ({
        troop: { type: t.type },
        quantity: t.quantity,
      }))
    )

    // Calculate loot if resources provided and attacker won
    let lootWood = 0
    let lootStone = 0
    let lootIron = 0
    let lootGold = 0
    let lootFood = 0

    if (defenderResources && result.attackerWon) {
      const totalResources = defenderResources.wood + defenderResources.stone +
                            defenderResources.iron + defenderResources.gold + defenderResources.food
      const lootRatio = Math.min(1, carryCapacity / Math.max(1, totalResources))

      lootWood = Math.min(Math.floor(defenderResources.wood * lootRatio), carryCapacity)
      lootStone = Math.min(Math.floor(defenderResources.stone * lootRatio), carryCapacity - lootWood)
      lootIron = Math.min(Math.floor(defenderResources.iron * lootRatio), carryCapacity - lootWood - lootStone)
      lootGold = Math.min(Math.floor(defenderResources.gold * lootRatio), carryCapacity - lootWood - lootStone - lootIron)
      lootFood = Math.min(Math.floor(defenderResources.food * lootRatio), carryCapacity - lootWood - lootStone - lootIron - lootGold)
    }

    const simulationResult: SimulationResult = {
      attackerWon: result.attackerWon,
      attackerCasualties: result.attackerCasualties,
      defenderCasualties: result.defenderCasualties,
      lootWood,
      lootStone,
      lootIron,
      lootGold,
      lootFood,
      wallDamage: result.wallDamage,
      attackerOffense,
      defenderDefense,
      carryCapacity,
      battleReport: result.battleReport,
    }

    // Log the simulation (if enabled in settings)
    try {
      // Check if logging is enabled (this could be cached in a real implementation)
      const loggingEnabled = true // Default to enabled for now

      if (loggingEnabled) {
        const totalTroops = attackerTroops.reduce((sum, t) => sum + t.quantity, 0) +
                           defenderTroops.reduce((sum, t) => sum + t.quantity, 0)

        await prisma.combatSimulationLog.create({
          data: {
            attackType,
            wallLevel,
            heroBonus,
            attackerOffense: simulationResult.attackerOffense,
            defenderDefense: simulationResult.defenderDefense,
            attackerWon: simulationResult.attackerWon,
            totalTroops,
            attackerCasualties: simulationResult.attackerCasualties,
            defenderCasualties: simulationResult.defenderCasualties,
            loot: {
              wood: simulationResult.lootWood,
              stone: simulationResult.lootStone,
              iron: simulationResult.lootIron,
              gold: simulationResult.lootGold,
              food: simulationResult.lootFood,
            },
            wallDamage: simulationResult.wallDamage || 0,
            // userId: req.user?.id, // Add when authentication is implemented
          },
        })
      }
    } catch (logError) {
      console.error("Failed to log simulation:", logError)
      // Don't fail the simulation if logging fails
    }

    return NextResponse.json({
      success: true,
      data: simulationResult,
    })

  } catch (error) {
    console.error("Combat simulation error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Invalid input data",
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: "Simulation failed",
    }, { status: 500 })
  }
}
