import { getCatapultTargetingMode, getRallyPointConfig } from "@/lib/config/rally-point"
import type {
  CombatResolution,
  CombatResolutionInput,
  CombatResolver,
  GarrisonStack,
  UnitsComposition,
  UnitStats,
} from "./types"

const RP_CONFIG = getRallyPointConfig()

function aggregateStacks(stacks: GarrisonStack[]): UnitsComposition {
  const result: UnitsComposition = {}
  for (const stack of stacks) {
    result[stack.unitTypeId] = (result[stack.unitTypeId] || 0) + stack.count
  }
  return result
}

function applyLossRate(count: number, lossRate: number): { casualties: number; survivors: number } {
  const casualties = Math.min(count, Math.floor(count * lossRate))
  const survivors = Math.max(0, count - casualties)
  return { casualties, survivors }
}

function applyLossesToStacks(stacks: GarrisonStack[], lossRate: number): { casualties: GarrisonStack[]; survivors: GarrisonStack[] } {
  const casualties: GarrisonStack[] = []
  const survivors: GarrisonStack[] = []
  for (const stack of stacks) {
    const { casualties: lost, survivors: remaining } = applyLossRate(stack.count, lossRate)
    if (lost > 0) {
      casualties.push({ ...stack, count: lost })
    }
    if (remaining > 0) {
      survivors.push({ ...stack, count: remaining })
    }
  }
  return { casualties, survivors }
}

function sumAttackPower(units: UnitsComposition, catalog: Record<string, UnitStats>): number {
  let total = 0
  for (const [unitId, count] of Object.entries(units)) {
    if (count <= 0) continue
    const stats = catalog[unitId]
    if (!stats) {
      throw new Error(`Unknown unit ${unitId}`)
    }
    total += stats.attack * count
  }
  return total
}

function sumDefensePower(stacks: GarrisonStack[], catalog: Record<string, UnitStats>): number {
  let total = 0
  for (const stack of stacks) {
    if (stack.count <= 0) continue
    const stats = catalog[stack.unitTypeId]
    if (!stats) {
      throw new Error(`Unknown unit ${stack.unitTypeId}`)
    }
    total += stats.defense * stack.count
  }
  return total
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

function applyRamDamage(rams: number, wallLevel = 0, wallType = "city_wall"): number {
  if (rams <= 0 || wallLevel <= 0) {
    return 0
  }
  const curve = RP_CONFIG.siege.ramCurve
  const wall = RP_CONFIG.walls[wallType] ?? RP_CONFIG.walls.city_wall
  const effective = rams / Math.max(0.001, wall.ramResistanceMultiplier)
  const numerator = 1 + effective / (curve.beta + curve.gamma * wallLevel)
  const drop = Math.floor(curve.alpha * Math.log(numerator))
  return Math.max(0, Math.min(wallLevel, drop))
}

function splitCatapultShots(catapultCount: number, rpLevel: number): number[] {
  const mode = getCatapultTargetingMode(rpLevel)
  if (mode === "two") {
    const first = Math.ceil(catapultCount / 2)
    const second = Math.floor(catapultCount / 2)
    return [first, second]
  }
  return [catapultCount]
}

function applyCatapultDamage(catapults: number, rpLevel: number, targets: string[]): Array<{ target: string; drop: number }> {
  if (catapults <= 0) {
    return []
  }
  const shotsPerTarget = splitCatapultShots(catapults, rpLevel)
  const curve = RP_CONFIG.siege.catapultCurve
  const hits: Array<{ target: string; drop: number }> = []
  for (let i = 0; i < shotsPerTarget.length; i++) {
    const shots = shotsPerTarget[i]
    const target = targets[i] ?? targets[0] ?? "random"
    if (!target) continue
    const drop = Math.max(curve.minDrop, Math.floor(shots * curve.baseDrop))
    hits.push({ target, drop })
  }
  return hits
}

export class SimpleCombatResolver implements CombatResolver {
  constructor(private readonly unitCatalog: Record<string, UnitStats>) {}

  async resolve(input: CombatResolutionInput): Promise<CombatResolution> {
    const defenderUnits = aggregateStacks(input.defenderGarrisons)
    const attackerPower = sumAttackPower(input.attackerUnits, this.unitCatalog)
    const defenderPower = sumDefensePower(input.defenderGarrisons, this.unitCatalog)

    let attackerLossRate = 0
    let defenderLossRate = 0

    if (attackerPower === 0) {
      attackerLossRate = 1
      defenderLossRate = 0
    } else if (defenderPower === 0) {
      attackerLossRate = 0
      defenderLossRate = 1
    } else {
      const ratio = attackerPower / defenderPower
      if (ratio >= 1) {
        defenderLossRate = Math.min(1, 0.6 * ratio)
        attackerLossRate = Math.min(0.8, 0.4 / ratio)
      } else {
        attackerLossRate = Math.min(1, 0.8 / ratio)
        defenderLossRate = Math.min(0.6, 0.4 * ratio)
      }
    }

    if (input.mission === "raid") {
      attackerLossRate *= RP_CONFIG.siege.raidLethalityFactor
      defenderLossRate *= RP_CONFIG.siege.raidLethalityFactor
    }

    const attackerStacks: GarrisonStack[] = Object.entries(input.attackerUnits).map(([unitTypeId, count]) => ({
      villageId: input.attackerVillageId,
      ownerAccountId: "attacker",
      unitTypeId,
      count,
    }))

    const attackerResults = applyLossesToStacks(attackerStacks, attackerLossRate)
    const defenderResults = applyLossesToStacks(input.defenderGarrisons, defenderLossRate)

    const attackerSurvivors: UnitsComposition = {}
    const attackerCasualties: UnitsComposition = {}
    for (const stack of attackerResults.survivors) {
      attackerSurvivors[stack.unitTypeId] = (attackerSurvivors[stack.unitTypeId] || 0) + stack.count
    }
    for (const stack of attackerResults.casualties) {
      attackerCasualties[stack.unitTypeId] = (attackerCasualties[stack.unitTypeId] || 0) + stack.count
    }

    const defenderRemaining = defenderResults.survivors

    const catapultTargets = input.catapultTargets ?? []
    const survivingRams = countSiege(attackerSurvivors, this.unitCatalog, "ram")
    const survivingCatapults = countSiege(attackerSurvivors, this.unitCatalog, "catapult")

    const wallDrop = input.mission === "raid" ? 0 : applyRamDamage(survivingRams, input.wallLevel, input.wallType)
    const buildingHits = input.mission === "raid" ? [] : applyCatapultDamage(survivingCatapults, input.rallyPointLevel, catapultTargets)

    return {
      attackerSurvivors,
      defenderRemaining,
      attackerCasualties,
      defenderCasualties: defenderResults.casualties,
      wallDrop: wallDrop || undefined,
      buildingHits: buildingHits.length ? buildingHits : undefined,
    }
  }
}
