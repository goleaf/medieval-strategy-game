import { computeCrannyLoot, computeWallLevelAfterAttack } from "@/lib/balance/subsystem-effects"
import { resolveBattle, type ArmyInput, type BattleReport, type UnitRole } from "@/lib/combat"
import { prisma } from "@/lib/db"
import { EmailNotificationService } from "@/lib/notifications/email-notification-service"
import { TroopService } from "./troop-service"
import { ProtectionService } from "./protection-service"
import { CrannyService } from "./cranny-service"
import { VillageDestructionService } from "./village-destruction-service"
import { ExpansionService } from "./expansion-service"
import { LoyaltyService } from "./loyalty-service"
import { NightPolicyService, formatWorldTime } from "./night-policy-service"
import type { NightState } from "./night-policy-service"
import { ScoutingService } from "./scouting-service"
import { resolveUnitRole } from "./unit-classification"
import { NotificationService } from "./notification-service"
import { WorldSettingsService } from "@/lib/game-services/world-settings-service"
import type { WorldSettings } from "@/lib/game-services/world-settings-service"
import type {
  AttackStatus,
  AttackType,
  Building,
  BuildingType,
  Player,
  Research,
  ResearchType,
  TroopType,
  Village,
  EmailNotificationTopic,
} from "@prisma/client"
import type { AdministratorSummary } from "./loyalty-service"

type BuildingWithResearch = Building & { research: Research | null }
type VillageWithOwner = Village & { player: Player; buildings: BuildingWithResearch[] }

const hasActiveGoldClubMembership = (
  player?: { hasGoldClubMembership: boolean; goldClubExpiresAt: Date | null },
): boolean => {
  if (!player?.hasGoldClubMembership) return false
  if (!player.goldClubExpiresAt) return true
  return player.goldClubExpiresAt > new Date()
}

const LOYALTY_WARNING_THRESHOLD = 15

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
  battleReport?: BattleReport
}

interface CombatTroopStack {
  id: string
  quantity: number
  attack: number
  defense: number
  type?: TroopType | string
  smithyAttackLevel?: number
  smithyDefenseLevel?: number
}

type AttackUnitStack = {
  troop: { id: string }
  quantity: number
}

interface ResolveCombatParams {
  attackerTroops: CombatTroopStack[]
  defenderTroops: CombatTroopStack[]
  wallLevel: number
  wallType?: string
  attackType: AttackType
  attackerSize?: number
  defenderSize?: number
  heroAttackMultiplier?: number
  nightBonusMultiplier?: number
  seedComponents?: Array<string | number>
  worldSettings?: WorldSettings
}

const DEFAULT_UNIT_ROLE: UnitRole = "inf"

const RAM_TROOP_TYPES: TroopType[] = ["RAM"]

function buildArmyInput(stacks: CombatTroopStack[], label: string): ArmyInput {
  return {
    label,
    stacks: stacks
      .filter((stack) => stack.quantity > 0)
      .map((stack) => ({
        unitId: stack.id,
        unitType: stack.type ? String(stack.type) : undefined,
        role: resolveUnitRole(stack.type),
        count: stack.quantity,
        attack: stack.attack,
        defInf: stack.defense,
        defCav: stack.defense,
        carry: 0,
        smithyAttackLevel: stack.smithyAttackLevel,
        smithyDefenseLevel: stack.smithyDefenseLevel,
      })),
  }
}

function countSurvivingByType(
  stacks: Array<{ id: string; quantity: number; type?: string }>,
  casualties: Record<string, number>,
  type: string,
): number {
  return stacks
    .filter((stack) => stack.type === type)
    .reduce((sum, stack) => {
      const fallen = casualties[stack.id] ?? 0
      return sum + Math.max(0, stack.quantity - fallen)
    }, 0)
}

function calculateWallDamageFromCasualties(
  stacks: Array<{ id: string; quantity: number; type?: string }>,
  casualties: Record<string, number>,
  wallLevel: number,
  wallType?: string,
  attackType?: AttackType,
): number {
  const survivingRams = countSurvivingByType(stacks, casualties, "RAM")
  const ramTechLevel = averageSiegeTechLevel(stacks, casualties, RAM_TROOP_TYPES)
  const { drop } = computeWallLevelAfterAttack({
    currentLevel: wallLevel,
    survivingRams,
    ramTechLevel,
    wallType: wallType ?? "city_wall",
    isRaid: attackType === "RAID",
  })
  return drop
}

function normalizeWallType(buildingType?: string | null): string {
  switch (buildingType) {
    case "STONE_WALL":
    case "WALL":
      return "city_wall"
    case "PALISADE":
      return "palisade"
    case "EARTH_WALL":
      return "earth_wall"
    default:
      return "city_wall"
  }
}

interface SmithyLevels {
  attack: number
  defense: number
}

function resolveSmithyLevels(village?: VillageWithOwner): SmithyLevels {
  if (!village) {
    return { attack: 0, defense: 0 }
  }

  const smithy = village.buildings.find((b) => b.type === BuildingType.SMITHY)
  if (!smithy) {
    return { attack: 0, defense: 0 }
  }

  const baseLevel = smithy.level ?? 0
  let attackLevel = baseLevel
  let defenseLevel = baseLevel

  if (smithy.research?.type === ResearchType.MILITARY_OFFENSE) {
    attackLevel = smithy.research.level
  }
  if (smithy.research?.type === ResearchType.MILITARY_DEFENSE) {
    defenseLevel = smithy.research.level
  }

  return { attack: attackLevel, defense: defenseLevel }
}

function averageSiegeTechLevel(
  stacks: CombatTroopStack[],
  casualties: Record<string, number>,
  types: TroopType[],
): number | undefined {
  let total = 0
  let weighted = 0
  for (const stack of stacks) {
    const troopType = stack.type as TroopType | undefined
    if (!troopType || !types.includes(troopType)) continue
    const fallen = casualties[stack.id] ?? 0
    const remaining = Math.max(0, stack.quantity - fallen)
    if (remaining <= 0) continue
    const level = stack.smithyAttackLevel ?? 0
    total += remaining
    weighted += level * remaining
  }
  if (total === 0) return undefined
  return weighted / total
}

export class CombatService {
  static estimateWallDamage(params: {
    attackerTroops: CombatTroopStack[]
    attackerCasualties: Record<string, number>
    wallLevel: number
    wallType?: string
    attackType?: AttackType
  }): number {
    return calculateWallDamageFromCasualties(
      params.attackerTroops,
      params.attackerCasualties,
      params.wallLevel,
      params.wallType,
      params.attackType,
    )
  }

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

  private static async refundAttackStacks(stacks: AttackUnitStack[]): Promise<void> {
    for (const stack of stacks) {
      await prisma.troop.update({
        where: { id: stack.troop.id },
        data: { quantity: { increment: stack.quantity } },
      })
    }
  }

  static async refundAttackUnitsById(attackId: string): Promise<void> {
    const attack = await prisma.attack.findUnique({
      where: { id: attackId },
      include: { attackUnits: { include: { troop: true } } },
    })
    if (!attack) return
    await this.refundAttackStacks(attack.attackUnits)
  }

  /**
   * Resolve Travian-style combat via deterministic resolver
   */
  static async resolveCombat(params: ResolveCombatParams): Promise<CombatResult> {
    const nightBonus = params.nightBonusMultiplier ?? (await ProtectionService.getNightBonusMultiplier())
    const heroMultiplier = params.heroAttackMultiplier ?? 1
    const mission = params.attackType === "RAID" ? "raid" : "attack"

    const attackerArmy = buildArmyInput(params.attackerTroops, "attacker")
    const defenderArmy = buildArmyInput(params.defenderTroops, "defender")

    const report = resolveBattle({
      attacker: attackerArmy,
      defender: defenderArmy,
      environment: {
        mission,
        wallLevel: params.wallLevel,
        wallType: params.wallType ?? "city_wall",
        attackerSize: params.attackerSize,
        defenderSize: params.defenderSize,
        nightActive: nightBonus > 1,
        attackerModifiers: heroMultiplier !== 1 ? [{ id: "hero", multiplier: heroMultiplier }] : undefined,
        seedComponents: params.seedComponents ?? ["combat", params.wallLevel, params.wallType ?? "city_wall"],
      },
      configOverrides: {
        night: { def_mult: nightBonus },
      },
    })

    const attackerCasualties: Record<string, number> = {}
    for (const unit of report.attacker.units) {
      if (unit.casualties > 0) {
        attackerCasualties[unit.unitId] = unit.casualties
      }
    }

    const defenderCasualties: Record<string, number> = {}
    for (const unit of report.defender.units) {
      if (unit.casualties > 0) {
        defenderCasualties[unit.unitId] = unit.casualties
      }
    }

    return {
      attackerWon: report.attackerWon,
      attackerCasualties,
      defenderCasualties,
      lootWood: 0,
      lootStone: 0,
      lootIron: 0,
      lootGold: 0,
      lootFood: 0,
      battleReport: report,
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
        fromVillage: {
          include: {
            buildings: { include: { research: true } },
            player: { include: { tribe: true, hero: true } },
          },
        },
        toVillage: {
          include: {
            buildings: { include: { research: true } },
            troops: true,
            garrisonStacks: { include: { owner: true } },
            player: { include: { tribe: true, hero: true } },
            runeVillage: true,
          },
        },
        movement: true,
      },
    })

    if (!attack || !attack.toVillage) return

    const nightState = await NightPolicyService.evaluate(attack.arrivalAt)

    // Final protection check (in case protection expired after attack was launched)
    if (attack.type !== "SCOUT") {
      const isProtected = await ProtectionService.isVillageProtected(attack.toVillage.id)
      if (isProtected) {
        // Cancel attack and refund troops
        await prisma.attack.update({
          where: { id: attackId },
          data: { status: "CANCELLED" as AttackStatus },
        })

        await this.refundAttackStacks(attack.attackUnits)

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
      const hasGoldClub = hasActiveGoldClubMembership(attack.toVillage.player as { hasGoldClubMembership: boolean; goldClubExpiresAt: Date | null } | undefined)

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

    if (nightState.mode === "TRUCE" && nightState.active && nightState.windowBounds?.end) {
      const resumeAt = nightState.windowBounds.end
      if (nightState.config.trucePolicy === "BLOCK_SEND") {
        await prisma.attack.update({
          where: { id: attackId },
          data: { status: "CANCELLED" as AttackStatus },
        })

        if (attack.movement) {
          await prisma.movement.update({
            where: { id: attack.movementId },
            data: { status: "CANCELLED", cancelledAt: new Date() },
          })
        }

        await this.refundAttackStacks(attack.attackUnits)

        await prisma.message.create({
          data: {
            senderId: attack.fromVillage.playerId,
            villageId: attack.fromVillageId,
            type: "SYSTEM",
            subject: "Night Truce Blocked Attack",
            content: `Your attack was cancelled because it would land during the active night truce window. Troops have returned home. Next eligible landing: ${formatWorldTime(resumeAt, nightState.config.timezone)} (${nightState.config.timezone}).`,
          },
        })

        return
      }

      await prisma.attack.update({
        where: { id: attackId },
        data: { status: "IN_PROGRESS", arrivalAt: resumeAt },
      })
      if (attack.movement) {
        await prisma.movement.update({
          where: { id: attack.movementId },
          data: { status: "IN_PROGRESS", arrivalAt: resumeAt },
        })
      }

      await prisma.message.create({
        data: {
          senderId: attack.fromVillage.playerId,
          villageId: attack.fromVillageId,
          type: "SYSTEM",
          subject: "Night Truce Delay",
          content: `Night truce delayed your attack. New landing time: ${formatWorldTime(resumeAt, nightState.config.timezone)} (${nightState.config.timezone}).`,
        },
      })

      return
    }

    // Handle scouting separately
    if (attack.type === "SCOUT") {
      await this.processScoutingAttack(attackId, attack, nightState)
      return
    }

    const attackerSmithy = resolveSmithyLevels(attack.fromVillage as unknown as VillageWithOwner)
    const defenderSmithy = resolveSmithyLevels(attack.toVillage as unknown as VillageWithOwner)

    // Get wall level (includes WALL, STONE_WALL, EARTH_WALL)
    const wallBuilding = attack.toVillage.buildings.find((b) => b.type === "WALL" || b.type === "STONE_WALL" || b.type === "EARTH_WALL")
    const wallLevel = wallBuilding?.level || 0
    const wallType = normalizeWallType(wallBuilding?.type)

    const attackerStacksForCombat: CombatTroopStack[] = attack.attackUnits.map((u) => ({
      id: u.troop.id,
      quantity: u.quantity,
      attack: u.troop.attack,
      defense: u.troop.defense,
      type: u.troop.type,
      smithyAttackLevel: attackerSmithy.attack,
      smithyDefenseLevel: attackerSmithy.defense,
    }))

    // Rune villages impose a permanent defense penalty after capture so the controlling tribe must actively support them.
    const runeDefenseMultiplier = attack.toVillage.runeVillage
      ? attack.toVillage.runeVillage.defenseMultiplier ?? 1
      : 1

    const defenderStacksForCombat: CombatTroopStack[] = attack.defenseUnits.map((u) => ({
      id: u.troop.id,
      quantity: u.quantity,
      attack: u.troop.attack,
      defense: Math.max(
        0,
        Math.round(u.troop.defense * runeDefenseMultiplier),
      ),
      type: u.troop.type,
      smithyAttackLevel: defenderSmithy.attack,
      smithyDefenseLevel: defenderSmithy.defense,
    }))

    // Resolve combat
    const result = await this.resolveCombat({
      attackerTroops: attackerStacksForCombat,
      defenderTroops: defenderStacksForCombat,
      wallLevel,
      wallType,
      attackType: attack.type,
      attackerSize: attack.fromVillage.player?.totalPoints,
      defenderSize: attack.toVillage.player?.totalPoints,
      seedComponents: [attack.id, attack.arrivalAt.toISOString(), attack.fromVillageId, attack.toVillageId ?? "wildcard"],
    })

    // Apply wall damage
    const wallDamage = calculateWallDamageFromCasualties(attackerStacksForCombat, result.attackerCasualties, wallLevel, wallType, attack.type)
    result.wallDamage = wallDamage
    if (wallDamage > 0 && wallBuilding) {
      const newWallLevel = Math.max(0, wallLevel - wallDamage)
      await prisma.building.update({
        where: { id: wallBuilding.id },
        data: { level: newWallLevel },
      })
    }

    const survivingCatapults = countSurvivingByType(attackerStacksForCombat, result.attackerCasualties, "CATAPULT")
    if (result.attackerWon && attack.type !== "RAID" && survivingCatapults > 0) {
      // If a legacy attack included catapult target selections, apply targeted damage via the catapult engine.
      try {
        const movementPayload = (attack.movement?.payload ?? {}) as { catapultTargets?: string[] }
        const selections = Array.isArray(movementPayload.catapultTargets) ? movementPayload.catapultTargets : []
        // Use the attacker rally point level to determine targeting mode (one/two/random)
        const { PrismaRallyPointRepository } = await import("@/lib/rally-point/prisma-repository")
        const { calculateCatapultDamage } = await import("@/lib/combat/siege")

        const repo = new PrismaRallyPointRepository()
        await repo.withTransaction(async (trx) => {
          const rpState = await trx.getRallyPoint(attack.fromVillageId)
          const rpLevel = rpState?.level ?? 1
          const snapshot = await trx.getVillageSiegeSnapshot(attack.toVillageId!)
          const damage = calculateCatapultDamage(survivingCatapults, rpLevel, selections, {
            snapshot: snapshot ?? undefined,
            seed: attack.id,
          })

          // Apply damage to targeted structures
          for (const hit of damage.targets) {
            if (!hit.structureId) continue
            if (hit.targetKind === "resource_field") {
              await trx.updateResourceFieldLevel(hit.structureId, hit.afterLevel)
            } else {
              await trx.updateBuildingLevel(hit.structureId, hit.afterLevel)
            }
          }

          // Populate report metadata
          result.buildingDamage = damage.targets
            .filter((t) => t.structureId)
            .map((t) => ({ buildingId: t.structureId!, damage: Math.max(0, (t.beforeLevel ?? 0) - (t.afterLevel ?? 0)) }))
        })
      } catch (err) {
        console.warn("[combat] Catapult targeting failed; falling back to generic destruction:", err)
        const defenderVillage = await prisma.village.findUnique({
          where: { id: attack.toVillageId! },
          include: { buildings: true },
        })
        if (defenderVillage) {
          const targetPopulationReduction = survivingCatapults * 10
          const destructionResult = await VillageDestructionService.destroyBuildingsAndReducePopulation(
            defenderVillage.id,
            targetPopulationReduction,
          )
          result.populationDamage = destructionResult.populationReduced
          result.buildingsDestroyed = destructionResult.buildingsDestroyed.map((b) => ({
            id: b.id,
            type: b.type,
            level: b.level,
          }))
        }
      }
    }

    // Apply population damage and check for village destruction
    if (result.populationDamage && result.populationDamage > 0) {
      const currentPopulation = attack.toVillage!.population
      const newPopulation = Math.max(0, currentPopulation - result.populationDamage)

      await prisma.village.update({
        where: { id: attack.toVillageId! },
        data: { population: newPopulation },
      })

      // Check if village should be destroyed (population <= 0)
      if (newPopulation <= 0) {
        const canDestroy = await VillageDestructionService.canVillageBeDestroyed(attack.toVillageId!)
        if (canDestroy.canDestroy) {
          await VillageDestructionService.destroyVillage(attack.toVillageId!, attack.fromVillage.playerId)
        }
      }
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

    const attackerTribe =
      attack.fromVillage.player.gameTribe ?? attack.fromVillage.player.tribe?.name ?? undefined
    const defenderTribe =
      attack.toVillage.player?.gameTribe ?? attack.toVillage.player?.tribe?.name ?? undefined

    const crannyBreakdown = await CrannyService.getProtectionBreakdown(attack.toVillage.id)

    const lootOutcome = computeCrannyLoot({
      storage: defenderStorage,
      baseProtection: crannyBreakdown.base,
      defenderTribe,
      attackerTribe,
    })

    const effectiveStorage = lootOutcome.lootable

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
    if (result.attackerWon && attack.type === "CONQUEST") {
      const attackerStacks = attack.attackUnits.map((u) => ({
        id: u.troop.id,
        quantity: u.quantity,
        type: u.troop.type,
      }))

      const administratorTypes: TroopType[] = ["NOBLEMAN", "NOMARCH", "LOGADES", "CHIEF", "SENATOR"]
      const survivingAdmins = administratorTypes
        .map((type) => ({
          type,
          count: countSurvivingByType(attackerStacks, result.attackerCasualties, type),
        }))
        .filter((entry) => entry.count > 0) as AdministratorSummary

      if (survivingAdmins.length > 0) {
        const totalLoyaltyReduction = LoyaltyService.rollAdministratorDamage(survivingAdmins, attack.toVillage.buildings)
        if (totalLoyaltyReduction > 0) {
          const previousLoyalty = attack.toVillage.loyalty
          const updatedVillage = await prisma.village.update({
            where: { id: attack.toVillageId! },
            data: {
              loyalty: Math.max(0, attack.toVillage.loyalty - totalLoyaltyReduction),
              loyaltyUpdatedAt: new Date(),
              lastLoyaltyAttackAt: new Date(),
            },
          })

          attack.toVillage.loyalty = updatedVillage.loyalty

          if (
            attack.toVillage.playerId &&
            updatedVillage.loyalty > 0 &&
            updatedVillage.loyalty <= LOYALTY_WARNING_THRESHOLD
          ) {
            await EmailNotificationService.queueEvent({
              playerId: attack.toVillage.playerId,
              topic: EmailNotificationTopic.CONQUEST_WARNING,
              payload: {
                village: {
                  id: attack.toVillageId,
                  name: attack.toVillage.name,
                  x: attack.toVillage.x,
                  y: attack.toVillage.y,
                },
                loyalty: updatedVillage.loyalty,
                attacker: attack.fromVillage.player.playerName,
                waveArrivedAt: new Date().toISOString(),
              },
              linkTarget: `/village/${attack.toVillageId}?tab=loyalty`,
              forceSend: true,
            })
          }

          if (
            attack.toVillage.playerId &&
            previousLoyalty > 50 &&
            updatedVillage.loyalty <= 50
          ) {
            NotificationService.emit({
              playerId: attack.toVillage.playerId,
              type: "LOYALTY_LOW",
              title: `${attack.toVillage.name} loyalty critical`,
              message: `${attack.toVillage.name} loyalty fell to ${updatedVillage.loyalty}. Secure the village before nobles land.`,
              metadata: {
                villageId: attack.toVillageId,
                loyalty: updatedVillage.loyalty,
                attackId,
              },
              actionUrl: `/village/${attack.toVillageId}`,
            }).catch((error) => {
              console.error("Failed to queue loyalty notification:", error)
            })
          }

          if (updatedVillage.loyalty <= 0) {
            const defenderId = attack.toVillage.playerId
            if (defenderId) {
              NotificationService.emit({
                playerId: defenderId,
                type: "VILLAGE_CONQUEST",
                title: `${attack.toVillage.name} is being conquered`,
                message: `Loyalty reached zero after ${attack.fromVillage.name}'s attack.`,
                metadata: {
                  villageId: attack.toVillageId,
                  attackId,
                },
                actionUrl: `/village/${attack.toVillageId}`,
              }).catch((error) => {
                console.error("Failed to queue defender conquest notification:", error)
              })
            }

            NotificationService.emit({
              playerId: attack.fromVillage.playerId,
              type: "VILLAGE_CONQUEST",
              title: `Conquest successful at ${attack.toVillage.name}`,
              message: `Loyalty dropped to zero. Capture transfer is processing.`,
              metadata: {
                villageId: attack.toVillageId,
                attackId,
              },
              actionUrl: `/village/${attack.toVillageId}`,
            }).catch((error) => {
              console.error("Failed to queue attacker conquest notification:", error)
            })

            const conquestResult = await ExpansionService.attemptConquestTransfer({
              targetVillage: attack.toVillage as unknown as VillageWithOwner,
              attackerVillage: attack.fromVillage as unknown as VillageWithOwner,
            })

            if (conquestResult.status !== "SUCCESS") {
              await prisma.village.update({
                where: { id: attack.toVillageId! },
                data: { loyalty: LoyaltyService.getConfig().loyaltyFloorOnBlockedConquest },
              })
            } else if (conquestResult.previousOwnerId) {
              await EmailNotificationService.queueEvent({
                playerId: conquestResult.previousOwnerId,
                topic: EmailNotificationTopic.CONQUEST_LOST,
                payload: {
                  village: {
                    id: attack.toVillageId,
                    name: attack.toVillage.name,
                    x: attack.toVillage.x,
                    y: attack.toVillage.y,
                  },
                  newOwner: {
                    id: attack.fromVillage.playerId,
                    name: attack.fromVillage.player.playerName,
                  },
                  claimedAt: new Date().toISOString(),
                },
                linkTarget: `/map?highlight=${attack.toVillage.x},${attack.toVillage.y}`,
                forceSend: true,
              })
            }
          }
        }
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

    const locationLabel = attack.toVillage?.name ?? "target"
    const reportMetadata = {
      attackId,
      attackType: attack.type,
      fromVillageId: attack.fromVillageId,
      toVillageId: attack.toVillageId,
    }

    // Prepare siege metadata for notifications (legacy path)
    const siegeMeta = {
      wallDrop: result.wallDamage ?? 0,
      buildingDamage: result.buildingDamage ?? undefined,
      buildingsDestroyed: result.buildingsDestroyed ?? undefined,
      populationDamage: result.populationDamage ?? undefined,
    }

    await Promise.all([
      NotificationService.emit({
        playerId: attack.fromVillage.playerId,
        type: "ATTACK_REPORT_READY",
        title: result.attackerWon ? `Victory at ${locationLabel}` : `Defeat at ${locationLabel}`,
        message: `Battle resolved at ${locationLabel}. ${result.attackerWon ? "Your troops prevailed." : "Your troops were defeated."}`,
        metadata: {
          ...reportMetadata,
          role: "ATTACKER",
          siege: siegeMeta,
        },
        actionUrl: "/reports",
      }).catch((error) => {
        console.error("Failed to queue attacker report notification:", error)
      }),
      attack.toVillage?.playerId
        ? NotificationService.emit({
            playerId: attack.toVillage.playerId,
            type: "ATTACK_REPORT_READY",
            title: result.attackerWon ? `Loss at ${locationLabel}` : `Defense successful at ${locationLabel}`,
            message: result.attackerWon
              ? `${locationLabel} was breached. Review the battle report for casualty details.`
              : `${locationLabel} held against the attack. Review the battle report for reinforcement needs.`,
            metadata: {
              ...reportMetadata,
              role: "DEFENDER",
              siege: siegeMeta,
            },
            actionUrl: "/reports",
          }).catch((error) => {
            console.error("Failed to queue defender report notification:", error)
          })
        : Promise.resolve(),
    ])

    const attackerCasualtyTotal = Object.values(result.attackerCasualties).reduce((sum, value) => sum + (value ?? 0), 0)
    const defenderCasualtyTotal = Object.values(result.defenderCasualties).reduce((sum, value) => sum + (value ?? 0), 0)

    const emailReportPayload = {
      attackId,
      attackType: attack.type,
      attackerWon: result.attackerWon,
      loot: {
        wood: lootWood,
        stone: lootStone,
        iron: lootIron,
        gold: lootGold,
        food: lootFood,
      },
      attacker: {
        id: attack.fromVillage.playerId,
        name: attack.fromVillage.player.playerName,
        village: attack.fromVillage.name,
        coords: { x: attack.fromVillage.x, y: attack.fromVillage.y },
      },
      defender: attack.toVillage
        ? {
            id: attack.toVillage.playerId,
            name: attack.toVillage.player?.playerName ?? "Unknown",
            village: attack.toVillage.name,
            coords: { x: attack.toVillage.x, y: attack.toVillage.y },
          }
        : null,
      casualties: {
        attackers: attackerCasualtyTotal,
        defenders: defenderCasualtyTotal,
      },
      loyaltyAfter: attack.toVillage?.loyalty ?? null,
      resolvedAt: new Date().toISOString(),
    }

    await EmailNotificationService.queueEvent({
      playerId: attack.fromVillage.playerId,
      topic: EmailNotificationTopic.ATTACK_REPORT,
      payload: { ...emailReportPayload, perspective: "ATTACKER" },
      linkTarget: "/reports",
    })

    if (attack.toVillage?.playerId) {
      await EmailNotificationService.queueEvent({
        playerId: attack.toVillage.playerId,
        topic: EmailNotificationTopic.ATTACK_REPORT,
        payload: { ...emailReportPayload, perspective: "DEFENDER" },
        linkTarget: "/reports",
      })
    }
  }

  /**
   * Process scouting attack
   */
  static async processScoutingAttack(attackId: string, attack: any, nightState: NightState): Promise<void> {
    if (!attack.toVillageId) {
      await prisma.attack.update({
        where: { id: attackId },
        data: { status: "CANCELLED" as AttackStatus, resolvedAt: new Date() },
      })
      return
    }

    const report = await ScoutingService.generateReport(attack, nightState)

    await prisma.attack.update({
      where: { id: attackId },
      data: {
        status: "RESOLVED" as AttackStatus,
        attackerWon: report.summary.success,
        scoutingData: JSON.stringify(report),
        resolvedAt: new Date(),
      },
    })

    await prisma.message.create({
      data: {
        senderId: attack.fromVillage.playerId,
        villageId: attack.fromVillageId,
        type: "SCOUT_RESULT",
        subject: `Scouting Report: ${attack.toVillage.name}`,
        content: JSON.stringify(report),
      },
    })
    NotificationService.emit({
      playerId: attack.fromVillage.playerId,
      type: "ATTACK_REPORT_READY",
      title: `Scouting results for ${attack.toVillage.name}`,
      message: report.summary.success
        ? `Scouts succeeded with ${report.summary.attackerLosses} losses.`
        : `Scouts were detected and failed.`,
      metadata: {
        attackId,
        mission: "SCOUT",
        target: attack.toVillageId,
      },
      actionUrl: "/reports",
    }).catch((error) => console.error("Failed to queue scout report notification:", error))

    await prisma.message.create({
      data: {
        senderId: attack.toVillage.playerId,
        villageId: attack.toVillageId!,
        type: "SCOUT_ALERT",
        subject: `Counter-scout action at ${attack.toVillage.name}`,
        content: JSON.stringify({
          enemyVillage: attack.fromVillage.name,
          scoutsSent: report.summary.attackersSent,
          attackerLosses: report.summary.attackerLosses,
          defenderLosses: report.summary.defenderLosses,
          outcome: report.summary.band,
          night: nightState.active ? nightState.activeWindow?.label ?? "night window" : null,
        }),
      },
    })
    NotificationService.emit({
      playerId: attack.toVillage.playerId,
      type: "ATTACK_REPORT_READY",
      title: `Counter-scout at ${attack.toVillage.name}`,
      message: `Enemy scouts from ${attack.fromVillage.name} probed ${attack.toVillage.name}.`,
      metadata: {
        attackId,
        mission: "SCOUT_DEFENSE",
        target: attack.toVillageId,
      },
      actionUrl: "/reports",
    }).catch((error) => console.error("Failed to queue scout alert notification:", error))
  }

  /**
   * Send alliance attack notifications (Reign of Fire feature)
   */
  static async sendAllianceAttackNotifications(attackId: string): Promise<void> {
    const attack = await prisma.attack.findUnique({
      where: { id: attackId },
      include: {
        toVillage: { include: { player: { include: { tribe: true } } } },
        fromVillage: { include: { player: { include: { tribe: true } } } },
      },
    });

    if (!attack?.toVillage?.player?.tribe) return;

    // Find all alliance members of the attacked village
    const alliances = await prisma.tribeTreaty.findMany({
      where: {
        OR: [
          { tribe1Id: attack.toVillage.player.tribe.id },
          { tribe2Id: attack.toVillage.player.tribe.id }
        ]
      },
      include: {
        tribe1: { include: { members: true } },
        tribe2: { include: { members: true } },
      }
    });

    const allianceMembers = new Set<string>();

    for (const alliance of alliances) {
      // Add members from tribe1 (excluding the attacked player)
      alliance.tribe1.members.forEach(member => {
        if (member.id !== attack.toVillage!.playerId) {
          allianceMembers.add(member.id);
        }
      });

      // Add members from tribe2 (excluding the attacked player)
      alliance.tribe2.members.forEach(member => {
        if (member.id !== attack.toVillage!.playerId) {
          allianceMembers.add(member.id);
        }
      });
    }

    // Send notifications to all alliance members
    const notificationPromises = Array.from(allianceMembers).map(async memberId => {
      await prisma.message.create({
        data: {
          senderId: attack.toVillage!.playerId, // From the attacked player
          villageId: attack.toVillageId!,
          type: "ALLIANCE_ATTACK",
          subject: "Alliance Member Under Attack!",
          content: `Your alliance member ${attack.toVillage.player.playerName}'s village ${attack.toVillage.name} is under attack from ${attack.fromVillage.player.playerName}!`,
        },
      })
      await NotificationService.emit({
        playerId: memberId,
        type: "TRIBE_SUPPORT_REQUEST",
        title: `${attack.toVillage.name} needs support`,
        message: `${attack.toVillage.player.playerName} is under attack from ${attack.fromVillage.player.playerName}.`,
        metadata: {
          attackId,
          allyVillageId: attack.toVillageId,
        },
        actionUrl: attack.toVillageId ? `/village/${attack.toVillageId}/rally-point` : "/tribe",
      })
    });

    await Promise.all(notificationPromises);
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

    console.log(`Troop evasion triggered for village ${village.name} (${villageId})`)
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

    console.log(`Troops returned to village ${villageId} after evasion`)
  }
}
