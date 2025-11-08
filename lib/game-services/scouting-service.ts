import type {
  Attack,
  AttackUnit,
  Building,
  BuildingType,
  GarrisonStack,
  Hero,
  Player,
  Troop,
  TroopType,
  Village,
} from "@prisma/client"

import { CapacityService } from "./capacity-service"
import { CrannyService } from "./cranny-service"
import { resolveScoutMission, type ScoutMissionResult } from "@/lib/troop-system/scouting"
import { WorldRulesService } from "@/lib/game-rules/world-rules"
import type { NightState } from "./night-policy-service"
import { isScoutUnit, resolveUnitRole } from "./unit-classification"
import type { ResourceBand, ScoutingConfig, TroopBand } from "@/lib/game-rules/types"

type AttackUnitWithTroop = AttackUnit & { troop: Troop }
type GarrisonStackWithOwner = GarrisonStack & { owner: Player }
type VillageForScouting = Village & {
  buildings: Building[]
  troops: Troop[]
  garrisonStacks: GarrisonStackWithOwner[]
  player?: (Player & { tribe?: { name: string } | null; hero?: Hero | null }) | null
}

type AttackForScouting = Attack & {
  attackUnits: AttackUnitWithTroop[]
  fromVillage: Village & { player: Player | null }
  toVillage: VillageForScouting
}

const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const
type ResourceKey = (typeof RESOURCE_KEYS)[number]

interface ResourceIntel {
  amount?: number
  band?: ResourceBand
  capacity: number
  timeToFullHours?: number | null
  timeToEmptyHours?: number | null
}

interface TroopClassIntel {
  class: string
  count: number
  band?: TroopBand
}

interface ReinforcementIntel {
  ownerId: string
  ownerName: string
  total: number
  classes: TroopClassIntel[]
}

export interface ScoutingReportPayload {
  summary: {
    success: boolean
    band: string
    fidelity: string
    ratio: number
    attackersSent: number
    attackersSurvived: number
    attackerLosses: number
    defenderLosses: number
    defenderScouts: number
    unlockedTiers: string[]
    generatedAt: string
  }
  notes?: string
  presence?: {
    occupied: boolean
    playerName?: string | null
    tribe?: string | null
    population: number
    loyalty: number
  }
  economy?: {
    stocks: Record<ResourceKey, ResourceIntel>
  }
  defenses?: {
    wall?: {
      type?: BuildingType | null
      level?: number
      band?: { min: number; max: number }
    }
    watchtower?: {
      level?: number
      band?: { min: number; max: number }
    }
    cranny?: Awaited<ReturnType<typeof CrannyService.getCrannyInfo>>
  }
  garrison?: {
    heroPresent: boolean
    classes: TroopClassIntel[]
    units?: Array<{ type: TroopType; quantity: number }>
  }
  reinforcements?: {
    entries: ReinforcementIntel[]
  }
  infrastructure?: {
    buildings: Array<{
      type: BuildingType
      level?: number
      band?: { min: number; max: number }
    }>
  }
  metadata: {
    config: {
      thresholds: ScoutingConfig["thresholds"]
      randomnessBound: number
    }
    night: {
      mode: string
      active: boolean
      windowLabel?: string
      defenseMultiplier: number
      scoutingModifiers?: Record<string, number | undefined> | null
    }
  }
}

const ECONOMY_TYPES: ResourceKey[] = [...RESOURCE_KEYS]
const INFRASTRUCTURE_TARGETS: BuildingType[] = [
  "RALLY_POINT",
  "BARRACKS",
  "STABLES",
  "WORKSHOP",
  "RESIDENCE",
  "PALACE",
  "COMMAND_CENTER",
]

function determineLevelBand(level: number): { min: number; max: number } {
  const min = Math.max(0, level - 2)
  const max = level + 2
  return { min, max }
}

function resolveResourceBand(pct: number, bands: ResourceBand[]): ResourceBand {
  const clamped = Math.max(0, Math.min(1, pct))
  const band = bands.find((entry) => clamped >= entry.minPct && (entry.maxPct === null || clamped < entry.maxPct))
  return band ?? bands[bands.length - 1]
}

function resolveTroopBand(count: number, bands: TroopBand[]): TroopBand {
  const band = bands.find((entry) => count >= entry.min && (entry.max === null || count <= entry.max))
  return band ?? bands[bands.length - 1]
}

function computeTimeToFull(amount: number, capacity: number, productionPerHour: number): number | null {
  if (productionPerHour <= 0) return null
  if (amount >= capacity) return 0
  return (capacity - amount) / productionPerHour
}

function computeTimeToEmpty(amount: number, productionPerHour: number): number | null {
  if (productionPerHour >= 0) return null
  if (amount <= 0) return 0
  return amount / Math.abs(productionPerHour)
}

function summarizeTroopClasses(stacks: Array<{ type: TroopType; quantity: number }>): Record<string, number> {
  return stacks.reduce<Record<string, number>>((acc, stack) => {
    const role = resolveUnitRole(stack.type)
    acc[role] = (acc[role] ?? 0) + stack.quantity
    return acc
  }, {})
}

function aggregateReinforcements(stacks: GarrisonStackWithOwner[]): ReinforcementIntel[] {
  const grouped = new Map<string, ReinforcementIntel>()
  for (const stack of stacks) {
    const key = stack.ownerAccountId
    if (!grouped.has(key)) {
      grouped.set(key, {
        ownerId: stack.ownerAccountId,
        ownerName: stack.owner.playerName,
        total: 0,
        classes: [],
      })
    }
    const entry = grouped.get(key)!
    entry.total += stack.count
    const role = resolveUnitRole(stack.unitTypeId as TroopType)
    const classItem = entry.classes.find((item) => item.class === role)
    if (classItem) {
      classItem.count += stack.count
    } else {
      entry.classes.push({ class: role, count: stack.count })
    }
  }
  return Array.from(grouped.values())
}

function deriveNightScoutingModifiers(
  nightState: NightState | null,
): Parameters<typeof resolveScoutMission>[0]["nightModifiers"] | undefined {
  if (!nightState?.active) return undefined
  const modifiers = nightState.config.scoutingModifiers
  if (!modifiers) return undefined
  return {
    attackerPct: modifiers.stealthPct ?? 0,
    defenderPct: modifiers.alertPct ?? 0,
    watchtowerPct: modifiers.watchtowerPct ?? 0,
  }
}

export class ScoutingService {
  static async generateReport(attack: AttackForScouting, nightState: NightState): Promise<ScoutingReportPayload> {
    const config = await WorldRulesService.getScoutingConfig()
    const attackerScouts = attack.attackUnits.reduce((sum, unit) => (isScoutUnit(unit.troop.type) ? sum + unit.quantity : sum), 0)
    const defenderScoutsOwn = attack.toVillage.troops.reduce(
      (sum, troop) => (isScoutUnit(troop.type) ? sum + troop.quantity : sum),
      0,
    )
    const defenderReinforcementScouts = attack.toVillage.garrisonStacks.reduce(
      (sum, stack) => (isScoutUnit(stack.unitTypeId as TroopType) ? sum + stack.count : sum),
      0,
    )
    const defenderScouts = defenderScoutsOwn + defenderReinforcementScouts
    const watchtower = attack.toVillage.buildings.find((b) => b.type === "WATCHTOWER")

    const missionResult = resolveScoutMission({
      attackingScouts,
      defendingScouts: defenderScouts,
      attackSmithyLevel: 0,
      defenseSmithyLevel: 0,
      attackerHeroVision: 0,
      defenderHeroCounter: 0,
      attackerItemPct: 0,
      defenderItemPct: 0,
      watchtowerLevel: watchtower?.level ?? 0,
      nightModifiers: deriveNightScoutingModifiers(nightState),
      randomSeed: attack.id,
      config,
    })

    const summary = {
      success: missionResult.success,
      band: missionResult.band,
      fidelity: missionResult.fidelity,
      ratio: missionResult.ratio,
      attackersSent: attackerScouts,
      attackersSurvived: missionResult.attackersSurvived,
      attackerLosses: missionResult.attackerLosses,
      defenderLosses: missionResult.defenderLosses,
      defenderScouts,
      unlockedTiers: missionResult.unlockedTiers.map((tier) => tier.id),
      generatedAt: new Date().toISOString(),
    }

    const report: ScoutingReportPayload = {
      summary,
      metadata: {
        config: {
          thresholds: config.thresholds,
          randomnessBound: config.randomness.boundPct,
        },
        night: {
          mode: nightState.mode,
          active: nightState.active,
          windowLabel: nightState.activeWindow?.label,
          defenseMultiplier: nightState.defenseMultiplier,
          scoutingModifiers: nightState.active ? nightState.config.scoutingModifiers ?? null : null,
        },
      },
    }

    if (!missionResult.success) {
      report.notes = "Enemy counter-scouts repelled the mission. No intel returned."
      return report
    }

    if (missionResult.fidelity === "banded") {
      report.notes = "Some intel is approximate due to defending counter-scout presence."
    }

    const [capacitySummary, crannyInfo] = await Promise.all([
      CapacityService.getVillageCapacitySummary(attack.toVillageId!),
      CrannyService.getCrannyInfo(attack.toVillageId!),
    ])

    const presenceUnlocked = missionResult.unlockedTiers.some((tier) => tier.id === "tier_a")
    if (presenceUnlocked) {
      report.presence = {
        occupied: Boolean(attack.toVillage.playerId),
        playerName: attack.toVillage.player?.playerName ?? null,
        tribe: attack.toVillage.player?.tribe?.name ?? null,
        population: attack.toVillage.population,
        loyalty: attack.toVillage.loyalty,
      }
      report.economy = {
        stocks: this.buildEconomySection(attack.toVillage, capacitySummary, config, missionResult.fidelity),
      }
    }

    if (missionResult.unlockedTiers.some((tier) => tier.id === "tier_b")) {
      report.defenses = this.buildDefenseSection(attack.toVillage, crannyInfo, missionResult.fidelity)
    }

    if (missionResult.unlockedTiers.some((tier) => tier.id === "tier_c")) {
      report.garrison = this.buildGarrisonSection(attack.toVillage, missionResult.fidelity, config)
    }

    if (missionResult.unlockedTiers.some((tier) => tier.id === "tier_d")) {
      report.reinforcements = this.buildReinforcementSection(attack.toVillage, missionResult.fidelity, config)
    }

    if (missionResult.unlockedTiers.some((tier) => tier.id === "tier_e")) {
      report.infrastructure = this.buildInfrastructureSection(attack.toVillage, missionResult.fidelity)
    }

    return report
  }

  private static buildEconomySection(
    village: VillageForScouting,
    capacity: Awaited<ReturnType<typeof CapacityService.getVillageCapacitySummary>>,
    config: ScoutingConfig,
    fidelity: string,
  ): Record<ResourceKey, ResourceIntel> {
    const result: Record<ResourceKey, ResourceIntel> = {} as Record<ResourceKey, ResourceIntel>
    for (const resource of ECONOMY_TYPES) {
      const amount = village[resource]
      const cap = capacity.totals[resource]
      const productionKey = `${resource}Production` as keyof VillageForScouting
      const production = typeof village[productionKey] === "number" ? (village[productionKey] as number) : 0
      const pct = cap > 0 ? amount / cap : 0
      const intel: ResourceIntel = {
        capacity: cap,
        timeToFullHours: computeTimeToFull(amount, cap, production),
        timeToEmptyHours: computeTimeToEmpty(amount, production),
      }
      if (fidelity === "exact") {
        intel.amount = amount
      } else {
        intel.band = resolveResourceBand(pct, config.partialFidelity.resourceBands)
      }
      result[resource] = intel
    }
    return result
  }

  private static buildDefenseSection(
    village: VillageForScouting,
    crannyInfo: Awaited<ReturnType<typeof CrannyService.getCrannyInfo>>,
    fidelity: string,
  ): ScoutingReportPayload["defenses"] {
    const wall = village.buildings.find((b) => b.type === "WALL" || b.type === "EARTH_WALL" || b.type === "STONE_WALL")
    const watchtower = village.buildings.find((b) => b.type === "WATCHTOWER")
    const wallEntry =
      wall &&
      (fidelity === "exact"
        ? { type: wall.type, level: wall.level }
        : { type: wall.type, band: determineLevelBand(wall.level) })

    const watchtowerEntry =
      watchtower &&
      (fidelity === "exact"
        ? { level: watchtower.level }
        : {
            band: determineLevelBand(watchtower.level),
          })

    return {
      wall: wallEntry ?? undefined,
      watchtower: watchtowerEntry ?? undefined,
      cranny: crannyInfo,
    }
  }

  private static buildGarrisonSection(
    village: VillageForScouting,
    fidelity: string,
    config: ScoutingConfig,
  ): ScoutingReportPayload["garrison"] {
    const ownTroops = village.troops.map((troop) => ({ type: troop.type, quantity: troop.quantity }))
    const classes = summarizeTroopClasses(ownTroops)
    const classEntries: TroopClassIntel[] = Object.entries(classes).map(([className, count]) => {
      const entry: TroopClassIntel = { class: className, count }
      if (fidelity !== "exact") {
        entry.band = resolveTroopBand(count, config.partialFidelity.troopBands)
      }
      return entry
    })

    return {
      heroPresent: Boolean(village.player?.hero),
      classes: classEntries,
      units: fidelity === "exact" ? ownTroops : undefined,
    }
  }

  private static buildReinforcementSection(
    village: VillageForScouting,
    fidelity: string,
    config: ScoutingConfig,
  ): ScoutingReportPayload["reinforcements"] {
    const reinforcements = village.garrisonStacks.filter((stack) => stack.ownerAccountId !== village.playerId)
    const entries = aggregateReinforcements(reinforcements).map((entry) => {
      const classes = entry.classes.map((cls) => {
        if (fidelity === "exact") return cls
        return { ...cls, band: resolveTroopBand(cls.count, config.partialFidelity.reinforcementBands) }
      })
      return {
        ownerId: entry.ownerId,
        ownerName: entry.ownerName,
        total: entry.total,
        classes,
      }
    })
    return { entries }
  }

  private static buildInfrastructureSection(
    village: VillageForScouting,
    fidelity: string,
  ): ScoutingReportPayload["infrastructure"] {
    const buildings = village.buildings.filter((building) => INFRASTRUCTURE_TARGETS.includes(building.type))
    const payload = buildings.map((building) => ({
      type: building.type,
      ...(fidelity === "exact" ? { level: building.level } : { band: determineLevelBand(building.level) }),
    }))
    return { buildings: payload }
  }
}
