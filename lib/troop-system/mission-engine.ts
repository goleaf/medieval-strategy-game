import type {
  ArmyInput as ResolverArmyInput,
  BattleReport,
  CombatEnvironment,
  LuckOverride,
} from "@/lib/combat/travian-resolver"
import { resolveBattle } from "@/lib/combat/travian-resolver"

import { getTroopSystemConfig, requireUnitDefinition } from "./config"
import type {
  ArmyComposition,
  BonusModifier,
  Mission,
  UnitCosts,
  UnitDefinition,
  UnitRole,
  TroopSystemConfig,
} from "./types"
import type { TravelComputationResult, StackCount } from "./movement"

type CombatMission = "attack" | "raid" | "siege" | "admin_attack"

export interface WallState {
  type: string
  level: number
}

export interface BuildingTargetState {
  id: string
  level: number
}

export interface SiegeContext {
  wall?: WallState
  targets?: BuildingTargetState[]
  allowDualTargets?: boolean
}

export interface LootContext {
  defenderResources: UnitCosts
  crannyLevel: number
  defenderTribe?: string
  lootOrder?: Array<keyof UnitCosts>
  penetrationPctOverride?: number
}

export interface LoyaltyContext {
  currentLoyalty: number
  captureAllowed: boolean
  blocked?: boolean
  defenseMultiplier?: number
  rng?: () => number
}

export interface CombatMissionInput {
  mission: CombatMission
  attacker: ArmyComposition
  defender: ArmyComposition
  wall?: WallState
  attackerSize?: number
  defenderSize?: number
  nightActive?: boolean
  attackerModifiers?: BonusModifier[]
  defenderModifiers?: BonusModifier[]
  luckOverride?: LuckOverride
  seed?: string | number | bigint
  seedComponents?: Array<string | number | bigint>
  siege?: SiegeContext
  loot?: LootContext
  loyalty?: LoyaltyContext
  travel?: TravelComputationResult
  config?: TroopSystemConfig
}

export interface SurvivorStackSummary {
  unitType: string
  role: UnitRole
  initial: number
  casualties: number
  survivors: number
  carry: number
  smithyAttackLevel?: number
  smithyDefenseLevel?: number
  definition: UnitDefinition
}

export interface RamResolution {
  before: WallState
  after: WallState
  levelDrop: number
  survivors: number
  rawPower: number
  effectivePower: number
}

export interface CatapultTargetResolution {
  id: string
  before: number
  after: number
  drop: number
  shotsUsed: number
}

export interface CatapultResolution {
  totalCats: number
  totalShots: number
  targets: CatapultTargetResolution[]
}

export interface LootResolution {
  capacity: number
  taken: UnitCosts
  remainingCapacity: number
  lootableBefore: UnitCosts
  lootableAfter: UnitCosts
  defenderResourcesAfter: UnitCosts
}

export interface LoyaltyResolution {
  adminsUsed: number
  before: number
  after: number
  delta: number
  captured: boolean
}

export interface ReturnTravelPlan {
  mission: "return"
  departAt: Date
  arriveAt: Date
  durationHours: number
  stacks: StackCount[]
}

export interface CombatMissionResult {
  mission: CombatMission
  battle: BattleReport
  attacker: SurvivorStackSummary[]
  defender: SurvivorStackSummary[]
  ramResolution?: RamResolution
  catapultResolution?: CatapultResolution
  loyaltyResolution?: LoyaltyResolution
  lootResolution?: LootResolution
  returnPlan?: ReturnTravelPlan
}

function toResolverArmy(army: ArmyComposition): ResolverArmyInput {
  return {
    label: army.label,
    stacks: army.stacks.map((stack) => ({
      unitId: stack.unitType,
      role: stack.role,
      count: stack.count,
      attack: stack.attack,
      defInf: stack.defInf,
      defCav: stack.defCav,
      carry: stack.carry,
      smithyAttackLevel: stack.smithyAttackLevel,
      smithyDefenseLevel: stack.smithyDefenseLevel,
    })),
  }
}

function summarizeOutcome(
  army: ArmyComposition,
  reportArmy: BattleReport["attacker"],
  config: TroopSystemConfig,
): SurvivorStackSummary[] {
  const lookup = new Map(army.stacks.map((stack) => [stack.unitType, stack]))
  return reportArmy.units.map((unit) => {
    const baseStack = lookup.get(unit.unitId)
    if (!baseStack) {
      throw new Error(`Battle report referenced unknown unit ${unit.unitId}`)
    }
    const definition = requireUnitDefinition(unit.unitId, config)
    return {
      unitType: unit.unitId,
      role: baseStack.role,
      initial: unit.initial,
      casualties: unit.casualties,
      survivors: unit.survivors,
      carry: baseStack.carry ?? definition.carry,
      smithyAttackLevel: baseStack.smithyAttackLevel,
      smithyDefenseLevel: baseStack.smithyDefenseLevel,
      definition,
    }
  })
}

function aggregateTechWeighted(
  stacks: SurvivorStackSummary[],
  selector: (stack: SurvivorStackSummary) => number | undefined,
): { count: number; average: number } {
  let totalUnits = 0
  let weightedLevel = 0
  for (const stack of stacks) {
    if (stack.survivors <= 0) continue
    const level = selector(stack) ?? 0
    totalUnits += stack.survivors
    weightedLevel += stack.survivors * level
  }
  return {
    count: totalUnits,
    average: totalUnits > 0 ? weightedLevel / totalUnits : 0,
  }
}

function applyRamDamage(
  stacks: SurvivorStackSummary[],
  mission: CombatMission,
  wall: WallState | undefined,
  config: TroopSystemConfig,
): RamResolution | undefined {
  if (!wall) return undefined
  const ramStacks = stacks.filter((stack) => stack.role === "ram")
  const { count, average } = aggregateTechWeighted(ramStacks, (stack) => stack.smithyAttackLevel)
  if (count <= 0) return undefined

  const ramConfig = config.siege.ram
  const wallShape = config.globals.wallTypes[wall.type] ?? config.globals.wallTypes.city_wall
  const techMultiplier = 1 + average * (ramConfig.techPct / 100)
  const missionScaling = mission === "raid" ? ramConfig.raidScaling : 1
  const rawPower = count * techMultiplier * missionScaling
  const effectivePower = rawPower / (wallShape.ramResistance || 1)
  const denominator = ramConfig.beta + ramConfig.gamma * Math.max(wall.level, 1)
  const levelDrop = Math.max(
    0,
    Math.floor(ramConfig.alpha * Math.log(1 + (effectivePower || 0) / Math.max(1, denominator))),
  )
  const newLevel = Math.max(0, wall.level - levelDrop)
  return {
    before: { ...wall },
    after: { ...wall, level: newLevel },
    levelDrop,
    survivors: count,
    rawPower,
    effectivePower,
  }
}

interface ShotAllocation {
  target: BuildingTargetState
  shots: number
}

function distributeShots(
  totalShots: number,
  targets: BuildingTargetState[] | undefined,
  allowDualTargets?: boolean,
): ShotAllocation[] {
  if (!targets || targets.length === 0 || totalShots <= 0) return []
  if (allowDualTargets && targets.length >= 2) {
    const firstShots = Math.ceil(totalShots / 2)
    const secondShots = totalShots - firstShots
    return [
      { target: { ...targets[0] }, shots: firstShots },
      { target: { ...targets[1] }, shots: secondShots },
    ]
  }
  return [{ target: { ...targets[0] }, shots: totalShots }]
}

function applyCatapultDamage(
  stacks: SurvivorStackSummary[],
  siegeContext: SiegeContext | undefined,
  config: TroopSystemConfig,
): CatapultResolution | undefined {
  if (!siegeContext?.targets || siegeContext.targets.length === 0) return undefined
  const catStacks = stacks.filter((stack) => stack.role === "catapult")
  const { count, average } = aggregateTechWeighted(catStacks, (stack) => stack.smithyAttackLevel)
  if (count <= 0) return undefined

  const catConfig = config.siege.catapult
  const techMultiplier = 1 + average * (catConfig.techPct / 100)
  let totalShots = Math.floor((count * techMultiplier) / Math.max(1, catConfig.shotDivisor))
  totalShots = Math.max(catConfig.minShots, totalShots)

  const distributions = distributeShots(totalShots, siegeContext.targets, siegeContext.allowDualTargets)
  const targetResults: CatapultTargetResolution[] = []
  for (const entry of distributions) {
    let drop = Math.floor(entry.shots / Math.max(1, catConfig.levelDivisor))
    drop = Math.max(drop, entry.shots > 0 ? 1 : 0)
    drop = Math.min(drop, entry.target.level)
    const after = Math.max(0, entry.target.level - drop)
    const shotsUsed = drop * catConfig.levelDivisor
    targetResults.push({
      id: entry.target.id,
      before: entry.target.level,
      after,
      drop,
      shotsUsed,
    })
  }

  return {
    totalCats: count,
    totalShots,
    targets: targetResults,
  }
}

function ensureUnitCosts(cost?: Partial<UnitCosts>): UnitCosts {
  return {
    wood: cost?.wood ?? 0,
    clay: cost?.clay ?? 0,
    iron: cost?.iron ?? 0,
    crop: cost?.crop ?? 0,
  }
}

function calculateLootCapacity(stacks: SurvivorStackSummary[]): number {
  return stacks.reduce((sum, stack) => sum + stack.survivors * (stack.carry ?? 0), 0)
}

function computeLoot(
  stacks: SurvivorStackSummary[],
  lootContext: LootContext | undefined,
  config: TroopSystemConfig,
): LootResolution | undefined {
  if (!lootContext) return undefined
  const capacity = calculateLootCapacity(stacks.filter((stack) => stack.role !== "ram" && stack.role !== "catapult"))
  if (capacity <= 0) return undefined

  const defenderResources = ensureUnitCosts(lootContext.defenderResources)
  const lootable = { ...defenderResources }

  const crannyBase = config.globals.cranny.basePerLevel
  const tribeMult =
    config.globals.cranny.tribeMultiplier[lootContext.defenderTribe ?? "DEFAULT"] ??
    config.globals.cranny.tribeMultiplier.DEFAULT ??
    1
  const penetrationPct =
    lootContext.penetrationPctOverride ?? config.globals.cranny.attackerPenetrationPct ?? 100
  const protection = Math.floor(crannyBase * lootContext.crannyLevel * tribeMult * (penetrationPct / 100))

  for (const resource of Object.keys(lootable) as Array<keyof UnitCosts>) {
    lootable[resource] = Math.max(0, lootable[resource] - protection)
  }

  const lootableBefore = { ...lootable }
  const taken: UnitCosts = { wood: 0, clay: 0, iron: 0, crop: 0 }
  let remainingCapacity = capacity
  const order = lootContext.lootOrder ?? config.missions.defaultLootOrder

  for (const resource of order) {
    if (remainingCapacity <= 0) break
    const available = lootable[resource]
    if (available <= 0) continue
    const pulled = Math.min(available, remainingCapacity)
    taken[resource] += pulled
    lootable[resource] -= pulled
    remainingCapacity -= pulled
  }

  const defenderResourcesAfter: UnitCosts = {
    wood: defenderResources.wood - taken.wood,
    clay: defenderResources.clay - taken.clay,
    iron: defenderResources.iron - taken.iron,
    crop: defenderResources.crop - taken.crop,
  }

  return {
    capacity,
    taken,
    remainingCapacity,
    lootableBefore,
    lootableAfter: lootable,
    defenderResourcesAfter,
  }
}

function defaultRng(): number {
  return Math.random()
}

function applyLoyalty(
  mission: CombatMission,
  stacks: SurvivorStackSummary[],
  loyaltyContext: LoyaltyContext | undefined,
  config: TroopSystemConfig,
): LoyaltyResolution | undefined {
  if (mission !== "admin_attack" || !loyaltyContext) return undefined
  const adminStacks = stacks.filter((stack) => stack.role === "admin" && stack.survivors > 0)
  const adminsUsed = adminStacks.reduce((sum, stack) => sum + stack.survivors, 0)
  if (adminsUsed === 0) return undefined
  const rng = loyaltyContext.rng ?? defaultRng

  let totalDrop = 0
  for (const stack of adminStacks) {
    const hitConfig = stack.definition.loyaltyHit ?? config.administration.loyaltyHit
    const perUnit = hitConfig.max - hitConfig.min + 1
    for (let i = 0; i < stack.survivors; i += 1) {
      const roll = hitConfig.min + Math.floor(rng() * perUnit)
      totalDrop += roll
    }
  }

  totalDrop *= loyaltyContext.defenseMultiplier ?? 1
  const before = loyaltyContext.currentLoyalty
  let after = Math.max(0, before - totalDrop)
  let captured = false

  if (after <= 0) {
    if (loyaltyContext.captureAllowed && !loyaltyContext.blocked) {
      after = config.administration.captureFloor
      captured = true
    } else {
      after = config.administration.blockedFloor
    }
  }

  return {
    adminsUsed,
    before,
    after,
    delta: before - after,
    captured,
  }
}

function planReturn(
  stacks: SurvivorStackSummary[],
  travel: TravelComputationResult | undefined,
): ReturnTravelPlan | undefined {
  if (!travel) return undefined
  const survivors: StackCount[] = stacks.filter((stack) => stack.survivors > 0).map((stack) => ({
    unitType: stack.unitType,
    count: stack.survivors,
  }))
  if (survivors.length === 0) return undefined
  const departAt = travel.arriveAt
  const arriveAt = new Date(departAt.getTime() + travel.durationHours * 3600 * 1000)
  return {
    mission: "return",
    departAt,
    arriveAt,
    durationHours: travel.durationHours,
    stacks: survivors,
  }
}

function buildCombatOverrides(mission: CombatMission, config: TroopSystemConfig) {
  return {
    curvature_k: config.globals.lossCurvature[mission === "raid" ? "raid" : mission === "siege" ? "siege" : "attack"],
    raid_lethality_factor: config.missions.raidLethalityFactor,
    smithy: {
      attack_pct_per_level: config.globals.smithy.perLevelPct,
      defense_pct_per_level: config.globals.smithy.perLevelPct,
    },
    walls: Object.fromEntries(
      Object.entries(config.globals.wallTypes).map(([key, value]) => [key, { def_pct_per_level: value.defPctPerLevel }]),
    ),
  }
}

export function resolveCombatMission(input: CombatMissionInput): CombatMissionResult {
  const config = input.config ?? getTroopSystemConfig()
  const attacker = toResolverArmy(input.attacker)
  const defender = toResolverArmy(input.defender)
  const wall = input.siege?.wall ?? input.wall
  const environment: CombatEnvironment = {
    mission: input.mission,
    wallLevel: wall?.level,
    wallType: wall?.type,
    attackerSize: input.attackerSize,
    defenderSize: input.defenderSize,
    nightActive: input.nightActive,
    attackerModifiers: input.attackerModifiers,
    defenderModifiers: input.defenderModifiers,
    luck: input.luckOverride,
    seed: input.seed,
    seedComponents: input.seedComponents,
  }

  const battle = resolveBattle({
    attacker,
    defender,
    environment,
    configOverrides: buildCombatOverrides(input.mission, config) as any,
  })

  const attackerSummary = summarizeOutcome(input.attacker, battle.attacker, config)
  const defenderSummary = summarizeOutcome(input.defender, battle.defender, config)
  const ramResolution = applyRamDamage(attackerSummary, input.mission, wall, config)
  const catapultResolution = applyCatapultDamage(attackerSummary, input.siege, config)
  const allowsLoot = input.mission === "attack" || input.mission === "raid" || input.mission === "siege" || input.mission === "admin_attack"
  const lootResolution =
    battle.attacker.totalSurvivors > 0 && allowsLoot
      ? computeLoot(attackerSummary, input.loot, config)
      : undefined
  const loyaltyResolution = applyLoyalty(input.mission, attackerSummary, input.loyalty, config)
  const returnPlan =
    battle.attacker.totalSurvivors > 0
      ? planReturn(
          attackerSummary.filter((stack) => stack.role !== "settler"), // Settlers consumed on foundings, keep them returning otherwise
          input.travel,
        )
      : undefined

  return {
    mission: input.mission,
    battle,
    attacker: attackerSummary,
    defender: defenderSummary,
    ramResolution,
    catapultResolution,
    loyaltyResolution,
    lootResolution,
    returnPlan,
  }
}
