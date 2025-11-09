import combatConfig from "@/config/combat.json"
import { calculateMoraleMultiplier } from "@/lib/combat/morale"

const TWO_POW_53 = 2 ** 53
const UINT64_MAX = (1n << 64n) - 1n
const DEFAULT_SEED = 0x4d595df4d0f33173n

export type UnitRole = "inf" | "cav" | "scout" | "ram" | "catapult" | "admin" | "settler"
export type Mission = "attack" | "raid" | "siege" | "admin_attack" | "scout"
type RoundingMode = "bankers"

export interface UnitStackInput {
  unitId: string
  unitType?: string
  role: UnitRole
  count: number
  attack: number
  defInf: number
  defCav: number
  carry?: number
  smithyAttackLevel?: number
  smithyDefenseLevel?: number
}

export interface ArmyInput {
  label?: string
  stacks: UnitStackInput[]
}

export interface BonusModifier {
  id: string
  source?: string
  multiplier: number
}

export interface LuckOverride {
  seed?: string | number | bigint
  components?: Array<string | number | bigint>
  range?: number
}

export interface CombatEnvironment {
  mission: Mission
  wallType?: string
  wallLevel?: number
  attackerSize?: number
  defenderSize?: number
  /**
   * Defender account age in days (used when morale time floors are enabled).
   */
  defenderAccountAgeDays?: number
  nightActive?: boolean
  attackerModifiers?: BonusModifier[]
  defenderModifiers?: BonusModifier[]
  paladinBonuses?: {
    attacker?: { attack?: number; defense?: number }
    defender?: { attack?: number; defense?: number }
  }
  luck?: LuckOverride
  seed?: string | number | bigint
  seedComponents?: Array<string | number | bigint>
}

export interface CombatConfig {
  version?: string
  curvature_k: number
  raid_lethality_factor: number
  size_floor: number
  smithy: { attack_pct_per_level: number; defense_pct_per_level: number }
  morale: {
    exponent: number
    min_att_mult: number
    max_att_mult: number
    time_floor?: { enabled: boolean; floor: number; full_effect_days: number }
  }
  luck: { range: number }
  night: { enabled: boolean; def_mult: number }
  walls: Record<string, { def_pct_per_level: number }>
  rounding: { mode: RoundingMode; loser_min_loss: number; winner_min_loss: number }
  rounds?: {
    max_rounds: number
    base_loss_rate: number
    min_loss_rate: number
  }
  paladin?: {
    attack_bonus: number
    defense_bonus: number
  }
}

export interface UnitOutcome {
  unitId: string
  role: UnitRole
  initial: number
  casualties: number
  survivors: number
}

export interface ArmyOutcome {
  label: string
  totalInitial: number
  totalCasualties: number
  totalSurvivors: number
  units: UnitOutcome[]
}

export interface BattleRoundSummary {
  round: number
  attackerStrength: number
  defenderStrength: number
  attackerLossRate: number
  defenderLossRate: number
  attackerCasualties: number
  defenderCasualties: number
  composition: "infantry" | "cavalry" | "mixed"
}

export interface PreCombatSummary {
  wallBefore: number
  wallAfter: number
  ramAttempts: number
  wallDrop: number
  wallMultiplier: number
  moraleMultiplier: number
  paladinAttackMultiplier: number
  paladinDefenseMultiplier: number
}

export interface BattleReport {
  attackerWon: boolean
  outcome: "attacker_victory" | "defender_victory" | "mutual_destruction"
  mission: Mission
  ratio: number
  lossRates: { attacker: number; defender: number }
  attacker: ArmyOutcome
  defender: ArmyOutcome
  rounds: BattleRoundSummary[]
  preCombat?: PreCombatSummary
  aggregates: {
    attacker: { inf: number; cav: number; total: number }
    defender: {
      inf: number
      cav: number
      weighted: number
      wInf: number
      wCav: number
    }
  }
  attackBreakdown: {
    base: number
    postBonuses: number
    postMorale: number
    final: number
  }
  defenseBreakdown: {
    weighted: number
    postWall: number
    postNight: number
    postBonuses: number
    final: number
  }
  multipliers: {
    wall: number
    morale: number
    night: number
    attackerBonuses: number
    defenderBonuses: number
    raidFactor: number
    paladinAttack: number
    paladinDefense: number
  }
  luck: { attacker: number; defender: number; seed: string; range: number }
  configVersion?: string
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K]
}

const DEFAULT_CONFIG = combatConfig as CombatConfig

export interface ResolveBattleInput {
  attacker: ArmyInput
  defender: ArmyInput
  environment: CombatEnvironment
  configOverrides?: DeepPartial<CombatConfig>
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function mergeConfig(base: CombatConfig, overrides?: DeepPartial<CombatConfig>): CombatConfig {
  if (!overrides) return base
  const clone: CombatConfig = JSON.parse(JSON.stringify(base))

  function assign(target: any, source: any) {
    if (!source) return
    for (const [key, value] of Object.entries(source)) {
      if (value == null) continue
      if (typeof value === "object" && !Array.isArray(value)) {
        target[key] = target[key] ?? {}
        assign(target[key], value)
      } else {
        target[key] = value
      }
    }
  }

  assign(clone, overrides)
  return clone
}

function smithyMultiplier(level: number, pctPerLevel: number): number {
  return 1 + (pctPerLevel / 100) * Math.max(0, level)
}

interface AttackAggregation {
  inf: number
  cav: number
  total: number
}

interface DefenseAggregation {
  inf: number
  cav: number
  weighted: number
  wInf: number
  wCav: number
}

function aggregateAttack(army: ArmyInput, config: CombatConfig): AttackAggregation {
  let inf = 0
  let cav = 0
  for (const stack of army.stacks) {
    if (stack.count <= 0) continue
    const multiplier = smithyMultiplier(stack.smithyAttackLevel ?? 0, config.smithy.attack_pct_per_level)
    const power = stack.attack * multiplier * stack.count
    if (stack.role === "cav") {
      cav += power
    } else if (stack.role === "inf") {
      inf += power
    }
  }
  return { inf, cav, total: inf + cav }
}

function aggregateDefense(army: ArmyInput, weights: { wInf: number; wCav: number }, config: CombatConfig): DefenseAggregation {
  let inf = 0
  let cav = 0
  for (const stack of army.stacks) {
    if (stack.count <= 0) continue
    const multiplier = smithyMultiplier(stack.smithyDefenseLevel ?? 0, config.smithy.defense_pct_per_level)
    inf += stack.defInf * multiplier * stack.count
    cav += stack.defCav * multiplier * stack.count
  }
  const weighted = inf * weights.wInf + cav * weights.wCav
  return { inf, cav, weighted, wInf: weights.wInf, wCav: weights.wCav }
}

function computeWeights(agg: AttackAggregation): { wInf: number; wCav: number } {
  if (agg.total <= 0) {
    return { wInf: 0, wCav: 1 }
  }
  const wInf = agg.inf / agg.total
  return { wInf, wCav: 1 - wInf }
}

function wallMultiplier(wallType: string | undefined, wallLevel: number | undefined, config: CombatConfig): number {
  const type = wallType ?? "city_wall"
  const level = Math.max(0, wallLevel ?? 0)
  const wall = config.walls[type] ?? config.walls.city_wall
  const pct = wall?.def_pct_per_level ?? 0
  return 1 + (pct / 100) * level
}

function productOfModifiers(mods: BonusModifier[] | undefined): number {
  if (!mods || mods.length === 0) return 1
  return mods.reduce((acc, mod) => acc * mod.multiplier, 1)
}

interface RuntimeStack {
  unit: UnitStackInput
  attackPerUnit: number
  defInfPerUnit: number
  defCavPerUnit: number
  role: UnitRole
  count: number
  outcome: UnitOutcome
}

interface RuntimeWeights {
  wInf: number
  wCav: number
  composition: "infantry" | "cavalry" | "mixed"
}

interface CasualtyResult {
  totalLost: number
}

interface RamPreCombatResult {
  attempts: number
  drop: number
  wallBefore: number
  wallAfter: number
}

function initializeRuntimeArmy(army: ArmyInput, config: CombatConfig): RuntimeStack[] {
  return army.stacks
    .filter((stack) => stack.count > 0)
    .map((stack) => {
      const attackMultiplier = smithyMultiplier(stack.smithyAttackLevel ?? 0, config.smithy.attack_pct_per_level)
      const defenseMultiplier = smithyMultiplier(stack.smithyDefenseLevel ?? 0, config.smithy.defense_pct_per_level)
      return {
        unit: stack,
        attackPerUnit: stack.attack * attackMultiplier,
        defInfPerUnit: stack.defInf * defenseMultiplier,
        defCavPerUnit: stack.defCav * defenseMultiplier,
        role: stack.role,
        count: stack.count,
        outcome: {
          unitId: stack.unitId,
          role: stack.role,
          initial: stack.count,
          casualties: 0,
          survivors: stack.count,
        },
      }
    })
}

function totalUnits(stacks: RuntimeStack[]): number {
  return stacks.reduce((sum, stack) => sum + stack.count, 0)
}

function computeRuntimeWeights(stacks: RuntimeStack[]): RuntimeWeights {
  let infPower = 0
  let cavPower = 0
  for (const stack of stacks) {
    if (stack.count <= 0) continue
    const contribution = stack.count * stack.attackPerUnit
    if (stack.role === "cav") {
      cavPower += contribution
    } else if (stack.role === "inf") {
      infPower += contribution
    } else {
      infPower += contribution / 2
      cavPower += contribution / 2
    }
  }
  const total = infPower + cavPower
  let wInf = 0.5
  let wCav = 0.5
  if (total > 0) {
    wInf = infPower / total
    wCav = cavPower / total
  }
  let composition: "infantry" | "cavalry" | "mixed" = "mixed"
  if (wInf >= 0.6) {
    composition = "infantry"
  } else if (wCav >= 0.6) {
    composition = "cavalry"
  }
  return { wInf, wCav, composition }
}

function computeRuntimeAttackPower(stacks: RuntimeStack[]): number {
  return stacks.reduce((sum, stack) => sum + stack.count * stack.attackPerUnit, 0)
}

function computeRuntimeDefensePower(stacks: RuntimeStack[], weights: { wInf: number; wCav: number }): number {
  return stacks.reduce((sum, stack) => {
    const perUnit = stack.defInfPerUnit * weights.wInf + stack.defCavPerUnit * weights.wCav
    return sum + stack.count * perUnit
  }, 0)
}

function applyCasualtyRate(stacks: RuntimeStack[], lossRate: number, rng: Xorshift128Plus): CasualtyResult {
  const total = totalUnits(stacks)
  if (total <= 0 || lossRate <= 0) {
    return { totalLost: 0 }
  }
  const clampedRate = clamp(lossRate, 0, 1)
  const targetLosses = clamp(Math.round(total * clampedRate), 0, total)
  if (targetLosses <= 0) return { totalLost: 0 }

  const allocations = stacks.map((stack) => {
    const share = stack.count > 0 ? (stack.count / total) * targetLosses : 0
    const baseLoss = Math.min(stack.count, Math.floor(share))
    return {
      stack,
      baseLoss,
      fraction: share - Math.floor(share),
    }
  })

  let allocated = allocations.reduce((sum, entry) => sum + entry.baseLoss, 0)
  let remaining = targetLosses - allocated
  while (remaining > 0) {
    const candidates = allocations
      .filter((entry) => entry.stack.count - entry.baseLoss > 0)
      .sort((a, b) => {
        if (b.fraction !== a.fraction) return b.fraction - a.fraction
        return rng.next() - 0.5
      })
    if (candidates.length === 0) break
    for (const entry of candidates) {
      if (remaining <= 0) break
      if (entry.stack.count - entry.baseLoss <= 0) continue
      entry.baseLoss += 1
      remaining -= 1
    }
  }

  let totalLost = 0
  for (const entry of allocations) {
    const losses = Math.min(entry.stack.count, entry.baseLoss)
    if (losses <= 0) continue
    entry.stack.count -= losses
    entry.stack.outcome.casualties += losses
    entry.stack.outcome.survivors = entry.stack.count
    totalLost += losses
  }

  return { totalLost }
}

function summarizeRuntimeArmy(stacks: RuntimeStack[], label: string): ArmyOutcome {
  const units = stacks.map((stack) => ({ ...stack.outcome }))
  const totalInitial = units.reduce((sum, unit) => sum + unit.initial, 0)
  const totalCasualties = units.reduce((sum, unit) => sum + unit.casualties, 0)
  const totalSurvivors = units.reduce((sum, unit) => sum + unit.survivors, 0)
  return {
    label,
    totalInitial,
    totalCasualties,
    totalSurvivors,
    units,
  }
}

function detectPaladinPresence(army: ArmyInput): boolean {
  return army.stacks.some((stack) => {
    if (stack.count <= 0) return false
    const candidate = (stack.unitType ?? stack.unitId ?? "").toLowerCase()
    return candidate.includes("paladin")
  })
}

function resolvePaladinMultipliers(
  army: ArmyInput,
  config: CombatConfig,
  envBonus?: { attack?: number; defense?: number },
): { attack: number; defense: number } {
  const hasPaladin = detectPaladinPresence(army)
  const attackBonus = envBonus?.attack ?? (hasPaladin ? config.paladin?.attack_bonus ?? 0 : 0)
  const defenseBonus = envBonus?.defense ?? (hasPaladin ? config.paladin?.defense_bonus ?? 0 : 0)
  return {
    attack: attackBonus ? 1 + attackBonus : 1,
    defense: defenseBonus ? 1 + defenseBonus : 1,
  }
}

function processPreCombatRams(
  stacks: RuntimeStack[],
  wallLevel: number,
  rng: Xorshift128Plus,
): RamPreCombatResult {
  if (wallLevel <= 0) {
    return { attempts: 0, drop: 0, wallBefore: 0, wallAfter: 0 }
  }
  let drop = 0
  let attempts = 0
  const targetDrops = wallLevel
  for (const stack of stacks) {
    if (stack.role !== "ram" || stack.count <= 0) continue
    for (let i = 0; i < stack.count; i += 1) {
      if (drop >= targetDrops) break
      attempts += 1
      if (rng.next() < 0.02) {
        drop += 1
        if (drop >= targetDrops) break
      }
    }
    if (drop >= targetDrops) break
  }
  const wallAfter = Math.max(0, wallLevel - drop)
  return {
    attempts,
    drop,
    wallBefore: wallLevel,
    wallAfter,
  }
}

class Xorshift128Plus {
  private state0: bigint
  private state1: bigint

  constructor(seed: bigint) {
    const [s0, s1] = initState(seed)
    this.state0 = s0
    this.state1 = s1
  }

  next(): number {
    let s1 = this.state0
    const s0 = this.state1
    if (s1 === 0n && s0 === 0n) {
      this.state1 = DEFAULT_SEED
    }
    this.state0 = s0
    s1 ^= s1 << 23n
    s1 &= UINT64_MAX
    s1 ^= s1 >> 17n
    s1 ^= s0
    s1 ^= s0 >> 26n
    this.state1 = s1
    const sum = (this.state0 + this.state1) & UINT64_MAX
    const value = Number(sum >> 11n) / TWO_POW_53
    return value
  }
}

function initState(seed: bigint): [bigint, bigint] {
  let z = seed & UINT64_MAX
  if (z === 0n) z = DEFAULT_SEED
  const first = splitmix64(z)
  const second = splitmix64(first)
  return [first || DEFAULT_SEED, second || (DEFAULT_SEED >> 1n)]
}

function splitmix64(state: bigint): bigint {
  let z = (state + 0x9e3779b97f4a7c15n) & UINT64_MAX
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n & UINT64_MAX
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn & UINT64_MAX
  return z ^ (z >> 31n)
}

function fnv1a64(input: string): bigint {
  let hash = 0xcbf29ce484222325n
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i))
    hash = (hash * 0x100000001b3n) & UINT64_MAX
  }
  return hash
}

function deriveSeed(luck?: LuckOverride, seed?: string | number | bigint, components?: Array<string | number | bigint>): bigint {
  if (luck?.seed != null) {
    return normalizeSeed(luck.seed)
  }
  if (seed != null) {
    return normalizeSeed(seed)
  }
  const joined = (luck?.components ?? components ?? ["combat"])
    .map((value) => value.toString())
    .join("|")
  return fnv1a64(joined)
}

function normalizeSeed(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value & UINT64_MAX
  if (typeof value === "number") {
    return BigInt(Math.floor(value)) & UINT64_MAX
  }
  return fnv1a64(value)
}

function drawLuck(range: number, rng: Xorshift128Plus): { attacker: number; defender: number } {
  if (range === 0) {
    return { attacker: 0, defender: 0 }
  }
  const u1 = rng.next()
  const u2 = rng.next()
  const swing = clamp((u1 - u2) * range, -range, range)
  return { attacker: swing, defender: -swing }
}

export function resolveBattle(input: ResolveBattleInput): BattleReport {
  const config = mergeConfig(DEFAULT_CONFIG, input.configOverrides)
  const { attacker, defender, environment } = input
  const mission = environment.mission

  const attackerRuntime = initializeRuntimeArmy(attacker, config)
  const defenderRuntime = initializeRuntimeArmy(defender, config)

  const attackAgg = aggregateAttack(attacker, config)
  const initialWeights = computeWeights(attackAgg)
  const defenseAgg = aggregateDefense(defender, initialWeights, config)

  const moraleMult = calculateMoraleMultiplier(environment, config)
  const nightMult = config.night.enabled && environment.nightActive ? config.night.def_mult : 1
  const attackBonus = productOfModifiers(environment.attackerModifiers)
  const defenseBonus = productOfModifiers(environment.defenderModifiers)
  const paladinAttack = resolvePaladinMultipliers(attacker, config, environment.paladinBonuses?.attacker)
  const paladinDefense = resolvePaladinMultipliers(defender, config, environment.paladinBonuses?.defender)

  const rngSeed = deriveSeed(environment.luck, environment.seed, environment.seedComponents)
  const rng = new Xorshift128Plus(rngSeed)
  const luckRange = environment.luck?.range ?? config.luck.range
  const luck = drawLuck(luckRange, rng)
  const attackerLuckMult = 1 + luck.attacker
  const defenderLuckMult = 1 + luck.defender

  const startingWallLevel = Math.max(0, environment.wallLevel ?? 0)
  const ramResult = processPreCombatRams(attackerRuntime, startingWallLevel, rng)
  const effectiveWallLevel = ramResult.wallAfter
  const wallMult = wallMultiplier(environment.wallType, effectiveWallLevel, config)

  const raidFactor = mission === "raid" ? config.raid_lethality_factor : 1
  const roundsPolicy = {
    max: config.rounds?.max_rounds ?? 12,
    base: config.rounds?.base_loss_rate ?? 0.35,
    min: config.rounds?.min_loss_rate ?? 0.01,
  }

  const rounds: BattleRoundSummary[] = []

  let round = 1
  while (round <= roundsPolicy.max && totalUnits(attackerRuntime) > 0 && totalUnits(defenderRuntime) > 0) {
    const weights = computeRuntimeWeights(attackerRuntime)
    const attackerBaseStrength = computeRuntimeAttackPower(attackerRuntime)
    const defenderBaseStrength = computeRuntimeDefensePower(defenderRuntime, weights)
    const attackerStrength =
      attackerBaseStrength * attackBonus * paladinAttack.attack * moraleMult * attackerLuckMult
    const defenderStrength =
      defenderBaseStrength * defenseBonus * paladinDefense.defense * wallMult * nightMult * defenderLuckMult

    if (attackerStrength <= 0 && defenderStrength <= 0) {
      break
    }

    const attackerStronger = attackerStrength >= defenderStrength
    const strongerStrength = attackerStronger ? attackerStrength : defenderStrength
    const weakerStrength = attackerStronger ? Math.max(defenderStrength, 1e-6) : Math.max(attackerStrength, 1e-6)
    const ratioForLosses = Math.max(strongerStrength / weakerStrength, 1)
    const shapedRatio = Math.pow(ratioForLosses, config.curvature_k ?? 1)

    let weakerLossRate = clamp(roundsPolicy.base * shapedRatio, roundsPolicy.min, 1)
    let strongerLossRate = clamp(roundsPolicy.base / shapedRatio, roundsPolicy.min, 1)

    const weakerVariance = 1 + (rng.next() * 0.2 - 0.1)
    const strongerVariance = 1 + (rng.next() * 0.2 - 0.1)

    weakerLossRate = clamp(weakerLossRate * weakerVariance * raidFactor, roundsPolicy.min, 1)
    strongerLossRate = clamp(strongerLossRate * strongerVariance * raidFactor, roundsPolicy.min, 1)

    const attackerLossRate = attackerStronger ? strongerLossRate : weakerLossRate
    const defenderLossRate = attackerStronger ? weakerLossRate : strongerLossRate

    const attackerCasualties = applyCasualtyRate(attackerRuntime, attackerLossRate, rng)
    const defenderCasualties = applyCasualtyRate(defenderRuntime, defenderLossRate, rng)

    rounds.push({
      round,
      attackerStrength,
      defenderStrength,
      attackerLossRate,
      defenderLossRate,
      attackerCasualties: attackerCasualties.totalLost,
      defenderCasualties: defenderCasualties.totalLost,
      composition: weights.composition,
    })

    round += 1
  }

  const attackerOutcome = summarizeRuntimeArmy(attackerRuntime, attacker.label ?? "attacker")
  const defenderOutcome = summarizeRuntimeArmy(defenderRuntime, defender.label ?? "defender")

  const attackerAlive = attackerOutcome.totalSurvivors > 0
  const defenderAlive = defenderOutcome.totalSurvivors > 0
  let outcome: "attacker_victory" | "defender_victory" | "mutual_destruction" = "defender_victory"
  if (attackerAlive && !defenderAlive) {
    outcome = "attacker_victory"
  } else if (!attackerAlive && defenderAlive) {
    outcome = "defender_victory"
  } else if (!attackerAlive && !defenderAlive) {
    outcome = "mutual_destruction"
  }
  const attackerWon = outcome === "attacker_victory"

  const attackBase = attackAgg.total
  const attackAfterBonuses = attackBase * attackBonus * paladinAttack.attack
  const attackAfterMorale = attackAfterBonuses * moraleMult
  const attackFinal = attackAfterMorale * attackerLuckMult

  const defenseWeighted = defenseAgg.weighted
  const defenseAfterWall = defenseWeighted * wallMult
  const defenseAfterNight = defenseAfterWall * nightMult
  const defenseAfterBonuses = defenseAfterNight * defenseBonus * paladinDefense.defense
  const defenseFinal = defenseAfterBonuses * defenderLuckMult
  const ratio = defenseFinal <= 0 ? Number.POSITIVE_INFINITY : attackFinal / defenseFinal

  return {
    attackerWon,
    outcome,
    mission,
    ratio,
    lossRates: {
      attacker: attackerOutcome.totalInitial === 0 ? 0 : attackerOutcome.totalCasualties / attackerOutcome.totalInitial,
      defender: defenderOutcome.totalInitial === 0 ? 0 : defenderOutcome.totalCasualties / defenderOutcome.totalInitial,
    },
    attacker: attackerOutcome,
    defender: defenderOutcome,
    rounds,
    preCombat: {
      wallBefore: ramResult.wallBefore,
      wallAfter: ramResult.wallAfter,
      ramAttempts: ramResult.attempts,
      wallDrop: ramResult.drop,
      wallMultiplier: wallMult,
      moraleMultiplier: moraleMult,
      paladinAttackMultiplier: paladinAttack.attack,
      paladinDefenseMultiplier: paladinDefense.defense,
    },
    aggregates: {
      attacker: attackAgg,
      defender: defenseAgg,
    },
    attackBreakdown: {
      base: attackBase,
      postBonuses: attackAfterBonuses,
      postMorale: attackAfterMorale,
      final: attackFinal,
    },
    defenseBreakdown: {
      weighted: defenseAgg.weighted,
      postWall: defenseAfterWall,
      postNight: defenseAfterNight,
      postBonuses: defenseAfterBonuses,
      final: defenseFinal,
    },
    multipliers: {
      wall: wallMult,
      morale: moraleMult,
      night: nightMult,
      attackerBonuses: attackBonus,
      defenderBonuses: defenseBonus,
      raidFactor,
      paladinAttack: paladinAttack.attack,
      paladinDefense: paladinDefense.defense,
    },
    luck: {
      attacker: luck.attacker,
      defender: luck.defender,
      seed: `0x${rngSeed.toString(16)}`,
      range: luckRange,
    },
    configVersion: config.version,
  }
}
