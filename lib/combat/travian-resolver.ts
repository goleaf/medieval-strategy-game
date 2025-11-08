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

export interface BattleReport {
  attackerWon: boolean
  mission: Mission
  ratio: number
  lossRates: { attacker: number; defender: number }
  attacker: ArmyOutcome
  defender: ArmyOutcome
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

function bankersRound(value: number): number {
  const floor = Math.floor(value)
  const diff = value - floor
  if (diff > 0.5) return floor + 1
  if (diff < 0.5) return floor
  return floor % 2 === 0 ? floor : floor + 1
}

interface RoundedLoss {
  unit: UnitStackInput
  rawLoss: number
  rounded: number
  fraction: number
}

function roundLosses(
  army: ArmyInput,
  lossRate: number,
  rounding: { mode: RoundingMode; loserMin: number; winnerMin: number },
  isLoser: boolean,
): UnitOutcome[] {
  const outcomes: RoundedLoss[] = []
  let sumRaw = 0
  for (const stack of army.stacks) {
    if (stack.count <= 0) continue
    const raw = stack.count * lossRate
    const rounded = rounding.mode === "bankers" ? bankersRound(raw) : Math.round(raw)
    outcomes.push({
      unit: stack,
      rawLoss: raw,
      rounded,
      fraction: raw - Math.floor(raw),
    })
    sumRaw += raw
  }

  const target = rounding.mode === "bankers" ? bankersRound(sumRaw) : Math.round(sumRaw)
  let current = outcomes.reduce((acc, item) => acc + item.rounded, 0)
  let diff = target - current

  if (diff !== 0) {
    const adjustOrder = outcomes
      .slice()
      .sort((a, b) => (diff > 0 ? b.fraction - a.fraction : a.fraction - b.fraction))
    for (const entry of adjustOrder) {
      if (diff === 0) break
      const limit = entry.unit.count
      if (diff > 0 && entry.rounded < limit) {
        entry.rounded += 1
        diff -= 1
      } else if (diff < 0 && entry.rounded > 0) {
        entry.rounded -= 1
        diff += 1
      }
    }
  }

  const minLoss = isLoser ? rounding.loserMin : rounding.winnerMin
  const unitOutcomes: UnitOutcome[] = []
  for (const entry of outcomes) {
    const forced = minLoss > 0 ? Math.max(entry.rounded, Math.min(entry.unit.count, Math.ceil(minLoss))) : entry.rounded
    const casualties = Math.min(entry.unit.count, forced)
    unitOutcomes.push({
      unitId: entry.unit.unitId,
      role: entry.unit.role,
      initial: entry.unit.count,
      casualties,
      survivors: entry.unit.count - casualties,
    })
  }
  return unitOutcomes
}

function summarizeArmy(outcomes: UnitOutcome[], label: string): ArmyOutcome {
  const totalInitial = outcomes.reduce((sum, unit) => sum + unit.initial, 0)
  const totalCasualties = outcomes.reduce((sum, unit) => sum + unit.casualties, 0)
  return {
    label,
    totalInitial,
    totalCasualties,
    totalSurvivors: totalInitial - totalCasualties,
    units: outcomes,
  }
}

export function resolveBattle(input: ResolveBattleInput): BattleReport {
  const config = mergeConfig(DEFAULT_CONFIG, input.configOverrides)
  const { attacker, defender, environment } = input
  const mission = environment.mission

  const attackAgg = aggregateAttack(attacker, config)
  const weights = computeWeights(attackAgg)
  const defenseAgg = aggregateDefense(defender, weights, config)

  const wallMult = wallMultiplier(environment.wallType, environment.wallLevel, config)
  // Delegate morale calculations to the shared helper so other systems can reuse it.
  const moraleMult = calculateMoraleMultiplier(environment, config)
  const nightMult = config.night.enabled && environment.nightActive ? config.night.def_mult : 1
  const attackBonus = productOfModifiers(environment.attackerModifiers)
  const defenseBonus = productOfModifiers(environment.defenderModifiers)

  const attackBase = attackAgg.total
  const attackAfterBonuses = attackBase * attackBonus
  const attackAfterMorale = attackAfterBonuses * moraleMult
  const defenseAfterWall = defenseAgg.weighted * wallMult
  const defenseAfterNight = defenseAfterWall * nightMult
  const defenseFinal = defenseAfterNight * defenseBonus

  const rngSeed = deriveSeed(environment.luck, environment.seed, environment.seedComponents)
  const rng = new Xorshift128Plus(rngSeed)
  const luckRange = environment.luck?.range ?? config.luck.range
  const luck = drawLuck(luckRange, rng)

  const attackerStrength = attackAfterMorale * (1 + luck.attacker)
  const defenderStrength = defenseFinal * (1 + luck.defender)

  let attackerLossRate = 0
  let defenderLossRate = 0
  let ratio = 0

  if (attackerStrength <= 0 && defenderStrength <= 0) {
    attackerLossRate = 1
    defenderLossRate = 0
    ratio = 0
  } else if (attackerStrength <= 0) {
    attackerLossRate = 1
    defenderLossRate = 0
    ratio = 0
  } else if (defenderStrength <= 0) {
    attackerLossRate = 0
    defenderLossRate = 1
    ratio = Number.POSITIVE_INFINITY
  } else {
    ratio = attackerStrength / defenderStrength
    const k = config.curvature_k
    if (ratio > 1) {
      defenderLossRate = 1
      attackerLossRate = Math.min(1, Math.pow(defenderStrength / attackerStrength, k))
    } else {
      attackerLossRate = 1
      defenderLossRate = Math.min(1, Math.pow(attackerStrength / defenderStrength, k))
    }
  }

  const raidFactor = mission === "raid" ? config.raid_lethality_factor : 1
  attackerLossRate = clamp(attackerLossRate * raidFactor, 0, 1)
  defenderLossRate = clamp(defenderLossRate * raidFactor, 0, 1)

  const rounding = {
    mode: config.rounding.mode,
    loserMin: config.rounding.loser_min_loss,
    winnerMin: config.rounding.winner_min_loss,
  }

  const defenderAlive = defenderStrength > 0
  const attackerAlive = attackerStrength > 0
  const attackerIsLoser = defenderAlive ? ratio <= 1 : !attackerAlive
  const defenderIsLoser = defenderStrength <= 0 ? attackerAlive : ratio > 1

  const attackerOutcomes = roundLosses(attacker, attackerLossRate, rounding, attackerIsLoser)

  const defenderOutcomes = roundLosses(defender, defenderLossRate, rounding, defenderIsLoser)

  const attackerWon = defenderStrength <= 0 ? attackerStrength > 0 : ratio > 1

  return {
    attackerWon,
    mission,
    ratio,
    lossRates: {
      attacker: attackerLossRate,
      defender: defenderLossRate,
    },
    attacker: summarizeArmy(attackerOutcomes, attacker.label ?? "attacker"),
    defender: summarizeArmy(defenderOutcomes, defender.label ?? "defender"),
    aggregates: {
      attacker: attackAgg,
      defender: defenseAgg,
    },
    attackBreakdown: {
      base: attackBase,
      postBonuses: attackAfterBonuses,
      postMorale: attackAfterMorale,
      final: attackerStrength,
    },
    defenseBreakdown: {
      weighted: defenseAgg.weighted,
      postWall: defenseAfterWall,
      postNight: defenseAfterNight,
      postBonuses: defenseFinal,
      final: defenderStrength,
    },
    multipliers: {
      wall: wallMult,
      morale: moraleMult,
      night: nightMult,
      attackerBonuses: attackBonus,
      defenderBonuses: defenseBonus,
      raidFactor,
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
