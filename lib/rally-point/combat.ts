import { calculateCatapultDamage, calculateRamWallDrop } from "@/lib/combat/siege"
import type { CatapultRules } from "@/lib/combat/catapult/types"
import { resolveBattle, type ArmyInput, type UnitOutcome, type UnitStackInput } from "@/lib/combat"
import { NightPolicyService } from "@/lib/game-services/night-policy-service"
import type {
  CombatResolution,
  CombatResolutionInput,
  CombatResolver,
  GarrisonStack,
  UnitsComposition,
  UnitStats,
  UnitTechLevel,
} from "./types"

function ensureUnitStats(catalog: Record<string, UnitStats>, unitId: string): UnitStats {
  const stats = catalog[unitId]
  if (!stats) {
    throw new Error(`Unknown unit ${unitId}`)
  }
  return stats
}

function defenseComponent(stats: UnitStats, kind: "inf" | "cav"): number {
  if (kind === "inf") {
    return stats.defInf ?? stats.defense ?? 0
  }
  return stats.defCav ?? stats.defense ?? 0
}

function countSiege(units: UnitsComposition, catalog: Record<string, UnitStats>, type: "ram" | "catapult"): number {
  let total = 0
  for (const [unitId, count] of Object.entries(units)) {
    if (count <= 0) continue
    const stats = catalog[unitId]
    if (stats?.siege === type) {
      total += count
    }
  }
  return total
}

function missionToResolver(mission: CombatResolutionInput["mission"]): "attack" | "raid" {
  return mission === "raid" ? "raid" : "attack"
}

function getTechLevel(unitId: string, techLevels?: Record<string, UnitTechLevel>): UnitTechLevel | undefined {
  return techLevels?.[unitId]
}

function averageSiegeTechLevel(
  composition: UnitsComposition,
  catalog: Record<string, UnitStats>,
  techLevels: Record<string, UnitTechLevel> | undefined,
  siege: "ram" | "catapult",
): number | undefined {
  let total = 0
  let weighted = 0
  for (const [unitId, count] of Object.entries(composition)) {
    if (count <= 0) continue
    const stats = catalog[unitId]
    if (stats?.siege !== siege) continue
    const tech = techLevels?.[unitId]
    const level = tech?.attack ?? 0
    total += count
    weighted += level * count
  }
  if (total === 0) return undefined
  return weighted / total
}

function outcomeToComposition(
  outcomes: UnitOutcome[],
  projector: (unitId: string) => string | null,
  field: "survivors" | "casualties",
): UnitsComposition {
  const result: UnitsComposition = {}
  for (const outcome of outcomes) {
    const key = projector(outcome.unitId)
    if (!key) continue
    const value = field === "survivors" ? outcome.survivors : outcome.casualties
    if (value <= 0) continue
    result[key] = (result[key] ?? 0) + value
  }
  return result
}

export class SimpleCombatResolver implements CombatResolver {
  constructor(
    private readonly unitCatalog: Record<string, UnitStats>,
    private readonly catapultRules?: CatapultRules,
  ) {}

  private buildAttackerArmy(units: UnitsComposition, techLevels?: Record<string, UnitTechLevel>): ArmyInput {
    const stacks: UnitStackInput[] = []
    for (const [unitId, count] of Object.entries(units)) {
      if (count <= 0) continue
      const stats = ensureUnitStats(this.unitCatalog, unitId)
      const tech = getTechLevel(unitId, techLevels)
      stacks.push({
        unitId,
        role: stats.role,
        count,
        attack: stats.attack,
        defInf: defenseComponent(stats, "inf"),
        defCav: defenseComponent(stats, "cav"),
        carry: stats.carry ?? 0,
        smithyAttackLevel: tech?.attack,
        smithyDefenseLevel: tech?.defense,
      })
    }
    return { label: "attacker", stacks }
  }

  private buildDefenderArmy(stacks: GarrisonStack[]): { army: ArmyInput; meta: Map<string, GarrisonStack> } {
    const armyStacks: UnitStackInput[] = []
    const meta = new Map<string, GarrisonStack>()
    stacks.forEach((stack, index) => {
      if (stack.count <= 0) return
      const stats = ensureUnitStats(this.unitCatalog, stack.unitTypeId)
      const unitId = `${stack.ownerAccountId}:${stack.unitTypeId}:${index}`
      meta.set(unitId, { ...stack })
      armyStacks.push({
        unitId,
        role: stats.role,
        count: stack.count,
        attack: stats.attack,
        defInf: defenseComponent(stats, "inf"),
        defCav: defenseComponent(stats, "cav"),
        carry: stats.carry ?? 0,
        smithyAttackLevel: stack.smithyAttackLevel,
        smithyDefenseLevel: stack.smithyDefenseLevel,
      })
    })
    return { army: { label: "defender", stacks: armyStacks }, meta }
  }

  async resolve(input: CombatResolutionInput): Promise<CombatResolution> {
    const attackerArmy = this.buildAttackerArmy(input.attackerUnits, input.attackerTechLevels)
    const { army: defenderArmy, meta } = this.buildDefenderArmy(input.defenderGarrisons)

    const nightState = await NightPolicyService.evaluate(input.timestamp)

    const report = resolveBattle({
      attacker: attackerArmy,
      defender: defenderArmy,
      environment: {
        mission: missionToResolver(input.mission),
        wallLevel: input.wallLevel ?? 0,
        wallType: input.wallType ?? "city_wall",
        nightActive: nightState.mode === "BONUS" && nightState.active,
        seedComponents: [
          input.attackerVillageId,
          input.defenderVillageId ?? "wild",
          input.target.x,
          input.target.y,
          input.timestamp.toISOString(),
        ],
      },
      configOverrides: {
        night: { def_mult: nightState.defenseMultiplier },
      },
    })

    const attackerSurvivors = outcomeToComposition(report.attacker.units, (unitId) => unitId, "survivors")
    const attackerCasualties = outcomeToComposition(report.attacker.units, (unitId) => unitId, "casualties")

    const defenderRemaining: GarrisonStack[] = []
    const defenderCasualties: GarrisonStack[] = []
    for (const unit of report.defender.units) {
      const base = meta.get(unit.unitId)
      if (!base) continue
      if (unit.survivors > 0) {
        defenderRemaining.push({ ...base, count: unit.survivors })
      }
      if (unit.casualties > 0) {
        defenderCasualties.push({ ...base, count: unit.casualties })
      }
    }

    const mission = input.mission
    const catapultTargets = input.catapultTargets ?? []
    const survivingRams = countSiege(attackerSurvivors, this.unitCatalog, "ram")
    const survivingCatapults = countSiege(attackerSurvivors, this.unitCatalog, "catapult")

    const ramTechLevel = averageSiegeTechLevel(
      attackerSurvivors,
      this.unitCatalog,
      input.attackerTechLevels,
      "ram",
    )
    const wallDrop =
      mission === "raid"
        ? 0
        : calculateRamWallDrop(survivingRams, input.wallLevel, input.wallType, { techLevel: ramTechLevel })

    const catapultTechLevel = averageSiegeTechLevel(
      attackerSurvivors,
      this.unitCatalog,
      input.attackerTechLevels,
      "catapult",
    )
    const catapultDamage =
      mission === "raid"
        ? undefined
        : calculateCatapultDamage(survivingCatapults, input.rallyPointLevel, catapultTargets, {
            snapshot: input.defenderSiegeSnapshot,
            seed: `${input.attackerVillageId}:${input.defenderVillageId ?? "wild"}:${input.timestamp.getTime()}`,
            rules: this.catapultRules,
            modifiers: catapultTechLevel != null ? { techLevel: catapultTechLevel } : undefined,
          })

    return {
      attackerSurvivors,
      defenderRemaining,
      attackerCasualties,
      defenderCasualties,
      wallDrop: wallDrop || undefined,
      catapultDamage: catapultDamage && catapultDamage.targets.length ? catapultDamage : undefined,
      battleReport: report,
    }
  }
}
