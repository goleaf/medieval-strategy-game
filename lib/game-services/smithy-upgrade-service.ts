import { prisma } from "@/lib/db"
import { EventQueueService } from "@/lib/game-services/event-queue-service"
import type { EventQueueType, SmithyUpgradeKind, UnitType } from "@prisma/client"

type ResourceBundle = { wood: number; stone: number; iron: number; gold: number; food: number }

type UpgradePath = "ATTACK" | "DEFENSE"

export type SmithyUnitStatus = {
  unitTypeId: string
  name?: string
  role?: string
  attackLevel: number
  defenseLevel: number
  maxLevel: number
  nextAttack?: { level: number; cost: ResourceBundle; timeSeconds: number; lockedReason?: string }
  nextDefense?: { level: number; cost: ResourceBundle; timeSeconds: number; lockedReason?: string }
}

export type SmithyGridResponse = {
  smithyLevel: number
  speed: number
  units: SmithyUnitStatus[]
  activeJob?: {
    id: string
    unitTypeId: string
    kind: UpgradePath
    targetLevel: number
    startedAt: string
    completionAt: string
  }
  recommendations?: Array<{ unitTypeId: string; kind: UpgradePath; score: number; reason: string }>
}

const MAX_LEVEL = 20
const PCT_PER_LEVEL = 0.03 // 3% default; could be made world-configurable

function ceilBundle(b: ResourceBundle): ResourceBundle {
  return {
    wood: Math.ceil(b.wood),
    stone: Math.ceil(b.stone),
    iron: Math.ceil(b.iron),
    gold: Math.ceil(b.gold),
    food: Math.ceil(b.food),
  }
}

function sumBundle(b: ResourceBundle): number {
  return b.wood + b.stone + b.iron + b.food + b.gold
}

function computeBaseCost(unit: UnitType): ResourceBundle {
  return {
    wood: unit.costWood,
    stone: unit.costClay,
    iron: unit.costIron,
    gold: 0,
    food: unit.costCrop,
  }
}

function scaleBundle(b: ResourceBundle, k: number): ResourceBundle {
  return { wood: b.wood * k, stone: b.stone * k, iron: b.iron * k, gold: b.gold * k, food: b.food * k }
}

function growth(level: number): number {
  // Exponential growth; level 20 becomes very expensive
  // Using 1.25^(L-1) yields ~86x at L20
  return Math.pow(1.25, Math.max(0, level - 1))
}

function roleTimeBaseHours(role: string | null | undefined): number {
  switch (role) {
    case "catapult":
    case "ram":
      return 2.5
    case "cav":
      return 1.5
    default:
      return 1
  }
}

function computeUpgradeCost(unit: UnitType, level: number): ResourceBundle {
  const base = computeBaseCost(unit)
  const factor = 8 + level // initial multiplier + level weight
  const bundle = scaleBundle(base, factor * growth(level))
  return ceilBundle(bundle)
}

function computeUpgradeTimeSeconds(unit: UnitType, level: number, smithyLevel: number, worldSpeed: number): number {
  const baseHours = roleTimeBaseHours((unit as any).role)
  const raw = baseHours * 3600 * growth(level)
  // Smithy research speed multiplier from config approximation
  const smithyMultiplier = Math.max(0.5, 1 - 0.04 * (Math.max(1, smithyLevel) - 1))
  const speed = Math.max(1, worldSpeed || 1)
  return Math.ceil((raw * smithyMultiplier) / speed)
}

export class SmithyUpgradeService {
  static async getGrid(playerId: string, villageId: string): Promise<SmithyGridResponse> {
    const [village, unitTypes, techLevels, activeJob] = await Promise.all([
      prisma.village.findUnique({
        where: { id: villageId },
        include: { buildings: true, player: { select: { gameWorld: true } } },
      }),
      prisma.unitType.findMany({ orderBy: { id: "asc" } }),
      prisma.unitTech.findMany({ where: { playerId } }),
      prisma.smithyUpgradeJob.findFirst({ where: { villageId, completedAt: null }, orderBy: { startedAt: "desc" } }),
    ])
    if (!village) throw new Error("Village not found")
    if (village.playerId !== playerId) throw new Error("Village does not belong to player")

    const smithy = village.buildings.find((b) => b.type === "SMITHY")
    const smithyLevel = smithy?.level ?? 0
    const speed = village.player?.gameWorld?.speed ?? 1

    const techMap = new Map<string, { attack: number; defense: number }>()
    for (const row of techLevels) {
      techMap.set(row.unitTypeId, { attack: row.attackLevel, defense: row.defenseLevel })
    }

    const rows: SmithyUnitStatus[] = unitTypes.map((unit) => {
      const current = techMap.get(unit.id) ?? { attack: 0, defense: 0 }
      const nextAttackLevel = Math.min(MAX_LEVEL, current.attack + 1)
      const nextDefenseLevel = Math.min(MAX_LEVEL, current.defense + 1)

      const nextAttackCost = nextAttackLevel <= MAX_LEVEL ? computeUpgradeCost(unit, nextAttackLevel) : undefined
      const nextDefenseCost = nextDefenseLevel <= MAX_LEVEL ? computeUpgradeCost(unit, nextDefenseLevel) : undefined
      const nextAttackTime = nextAttackLevel <= MAX_LEVEL ? computeUpgradeTimeSeconds(unit, nextAttackLevel, smithyLevel, speed) : undefined
      const nextDefenseTime = nextDefenseLevel <= MAX_LEVEL ? computeUpgradeTimeSeconds(unit, nextDefenseLevel, smithyLevel, speed) : undefined

      const attackLocked = smithyLevel < nextAttackLevel ? `Smithy level ${nextAttackLevel} required` : undefined
      const defenseLocked = smithyLevel < nextDefenseLevel ? `Smithy level ${nextDefenseLevel} required` : undefined

      return {
        unitTypeId: unit.id,
        name: unit.id,
        role: (unit as any).role,
        attackLevel: current.attack,
        defenseLevel: current.defense,
        maxLevel: MAX_LEVEL,
        nextAttack:
          nextAttackCost && nextAttackTime
            ? { level: nextAttackLevel, cost: nextAttackCost, timeSeconds: nextAttackTime, lockedReason: attackLocked }
            : undefined,
        nextDefense:
          nextDefenseCost && nextDefenseTime
            ? { level: nextDefenseLevel, cost: nextDefenseCost, timeSeconds: nextDefenseTime, lockedReason: defenseLocked }
            : undefined,
      }
    })

    // Simple recommendation based on troop counts across villages: value per resource unit
    const garrisons = await prisma.garrisonStack.findMany({
      where: { ownerAccountId: playerId },
      select: { unitTypeId: true, count: true },
    })
    const counts = new Map<string, number>()
    for (const g of garrisons) counts.set(g.unitTypeId, (counts.get(g.unitTypeId) ?? 0) + g.count)
    const recs: Array<{ unitTypeId: string; kind: UpgradePath; score: number; reason: string }> = []
    for (const row of rows) {
      const unit = unitTypes.find((u) => u.id === row.unitTypeId)!
      const troopCount = counts.get(row.unitTypeId) ?? 0
      if (troopCount <= 0) continue
      if (row.nextAttack && !row.nextAttack.lockedReason) {
        const cost = sumBundle(row.nextAttack.cost)
        const score = (troopCount * PCT_PER_LEVEL) / Math.max(1, cost)
        recs.push({ unitTypeId: row.unitTypeId, kind: "ATTACK", score, reason: `+${Math.round(PCT_PER_LEVEL*100)}% atk for ${troopCount} ${row.unitTypeId}` })
      }
      if (row.nextDefense && !row.nextDefense.lockedReason) {
        const cost = sumBundle(row.nextDefense.cost)
        const score = (troopCount * PCT_PER_LEVEL) / Math.max(1, cost)
        recs.push({ unitTypeId: row.unitTypeId, kind: "DEFENSE", score, reason: `+${Math.round(PCT_PER_LEVEL*100)}% def for ${troopCount} ${row.unitTypeId}` })
      }
    }
    recs.sort((a, b) => b.score - a.score)

    return {
      smithyLevel,
      speed,
      units: rows,
      activeJob: activeJob
        ? {
            id: activeJob.id,
            unitTypeId: activeJob.unitTypeId,
            kind: activeJob.kind,
            targetLevel: activeJob.targetLevel,
            startedAt: activeJob.startedAt.toISOString(),
            completionAt: activeJob.completionAt.toISOString(),
          }
        : undefined,
      recommendations: recs.slice(0, 5),
    }
  }

  static async startUpgrade(
    playerId: string,
    villageId: string,
    unitTypeId: string,
    kind: UpgradePath,
  ): Promise<{ jobId: string; completionAt: Date }>
  {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true, player: { select: { gameWorld: true } } },
    })
    if (!village) throw new Error("Village not found")
    if (village.playerId !== playerId) throw new Error("Village does not belong to player")
    const smithy = village.buildings.find((b) => b.type === "SMITHY")
    if (!smithy) throw new Error("Smithy required for upgrades")

    const active = await prisma.smithyUpgradeJob.findFirst({ where: { villageId, completedAt: null } })
    if (active) throw new Error("This village is already upgrading in the Smithy")

    const unit = await prisma.unitType.findUnique({ where: { id: unitTypeId } })
    if (!unit) throw new Error("Unit type not found")

    const current = await prisma.unitTech.findUnique({ where: { playerId_unitTypeId: { playerId, unitTypeId } } })
    const currentAttack = current?.attackLevel ?? 0
    const currentDefense = current?.defenseLevel ?? 0
    const targetLevel = (kind === "ATTACK" ? currentAttack : currentDefense) + 1
    if (targetLevel > MAX_LEVEL) throw new Error("Already at maximum level")
    if (smithy.level < targetLevel) throw new Error(`Smithy level ${targetLevel} required`)

    const speed = village.player?.gameWorld?.speed ?? 1
    const cost = computeUpgradeCost(unit, targetLevel)
    const timeSeconds = computeUpgradeTimeSeconds(unit, targetLevel, smithy.level, speed)

    // Affordability: must have all resources available in this village
    const enough =
      village.wood >= cost.wood &&
      village.stone >= cost.stone &&
      village.iron >= cost.iron &&
      village.gold >= cost.gold &&
      village.food >= cost.food
    if (!enough) throw new Error("Not enough resources for upgrade")

    // Deduct now (cannot cancel)
    await prisma.village.update({
      where: { id: villageId },
      data: {
        wood: { decrement: cost.wood },
        stone: { decrement: cost.stone },
        iron: { decrement: cost.iron },
        gold: { decrement: cost.gold },
        food: { decrement: cost.food },
      },
    })

    const now = new Date()
    const completionAt = new Date(now.getTime() + timeSeconds * 1000)
    const job = await prisma.smithyUpgradeJob.create({
      data: {
        playerId,
        villageId,
        buildingId: smithy.id,
        unitTypeId,
        kind: kind as SmithyUpgradeKind,
        targetLevel,
        startedAt: now,
        completionAt,
      },
    })

    await EventQueueService.scheduleEvent(
      "SMITHY_UPGRADE_COMPLETION" as EventQueueType,
      completionAt,
      { jobId: job.id },
      { dedupeKey: `smithy:${job.id}`, priority: 56 },
    )

    // Ensure UnitTech row exists
    await prisma.unitTech.upsert({
      where: { playerId_unitTypeId: { playerId, unitTypeId } },
      update: {},
      create: { playerId, unitTypeId, attackLevel: 0, defenseLevel: 0 },
    })

    return { jobId: job.id, completionAt }
  }
}

