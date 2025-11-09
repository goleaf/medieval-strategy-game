import { prisma } from "@/lib/db"
import { VillageService } from "@/lib/game-services/village-service"
import { ResourceProductionService } from "@/lib/game-services/resource-production-service"
import { CombatService } from "@/lib/game-services/combat-service"
import { BuildingService } from "@/lib/game-services/building-service"
import { TroopService } from "@/lib/game-services/troop-service"
import { UnitSystemService } from "@/lib/game-services/unit-system-service"
import { ReinforcementService } from "@/lib/game-services/reinforcement-service"
import { MovementService } from "@/lib/game-services/movement-service"
import { ShipmentService } from "@/lib/game-services/shipment-service"
import { TradeRouteService } from "@/lib/game-services/trade-route-service"
import { ExpansionService } from "@/lib/game-services/expansion-service"
import { LoyaltyService } from "@/lib/game-services/loyalty-service"
import { getRallyPointEngine } from "@/lib/rally-point/server"
import { EndgameService } from "@/lib/game-services/endgame-service"
import { EventQueueService } from "@/lib/game-services/event-queue-service"
import { CapacityService } from "@/lib/game-services/capacity-service"
import { TribeService } from "@/lib/game-services/tribe-service"
import type { EventQueueItem, EventQueueType, Prisma, WorldConfig } from "@prisma/client"

const EVENT_BATCH_LIMIT = 250
const STALE_LOCK_MS = 10_000
const RESOURCE_BATCH_SIZE = 250
const RESOURCE_TICK_INTERVAL_MS = 1_000
const LOYALTY_TICK_INTERVAL_MS = 1_000
const LOGISTICS_INTERVAL_MS = 5_000
const LEDGER_INTERVAL_MS = 5 * 60 * 1_000
const TRAINING_INTERVAL_MS = 2_000
const MARKET_SWEEP_INTERVAL_MS = 30_000
const RANKING_INTERVAL_MS = 15 * 60 * 1_000
const ENDGAME_INTERVAL_MS = 60_000
const RALLY_POINT_INTERVAL_MS = 2_000
const TROOP_EVASION_INTERVAL_MS = 5_000

const RECURRING_EVENT_KEYS: Record<Extract<EventQueueType, "RESOURCE_TICK" | "LOYALTY_TICK">, string> = {
  RESOURCE_TICK: "recurring:resource-tick",
  LOYALTY_TICK: "recurring:loyalty-tick",
}

const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const
const WAREHOUSE_TYPES = ["WAREHOUSE", "GREAT_WAREHOUSE"]
const GRANARY_TYPES = ["GRANARY", "GREAT_GRANARY"]
type ResourceKey = (typeof RESOURCE_KEYS)[number]
type FractionalKey = `${ResourceKey}Fractional`

let lastLogisticsRun = 0
let lastLedgerRun = 0
let lastTrainingRun = 0
let lastMarketSweep = 0
let lastRankingUpdate = 0
let lastEndgameCheck = 0
let lastRallyPointSweep = 0
let lastTroopEvasionSweep = 0

type TickContext = {
  now: Date
  config: WorldConfig | null
}

type TickEventHandler = (event: EventQueueItem, context: TickContext) => Promise<void>

const EVENT_PROCESSORS: Record<EventQueueType, TickEventHandler> = {
  RESOURCE_TICK: handleResourceTick,
  TROOP_MOVEMENT: handleTroopMovementEvent,
  BUILDING_COMPLETION: handleBuildingCompletionEvent,
  LOYALTY_TICK: handleLoyaltyTick,
  NOTIFICATION: handleNotificationEvent,
}

type BuildingEventPayload = {
  buildingId: string
  taskId?: string
  demolition?: boolean
}

type MovementEventPayload = {
  movementId: string
}

// ---------------------------------------------------------------------------
// Scheduler bootstrap
// ---------------------------------------------------------------------------

export async function bootstrapTickEvents(now = new Date()) {
  await Promise.all([
    EventQueueService.scheduleEvent(
      "RESOURCE_TICK",
      now,
      undefined,
      { dedupeKey: RECURRING_EVENT_KEYS.RESOURCE_TICK },
    ),
    EventQueueService.scheduleEvent(
      "LOYALTY_TICK",
      now,
      undefined,
      { dedupeKey: RECURRING_EVENT_KEYS.LOYALTY_TICK },
    ),
  ])

  await seedOutstandingBuildingEvents()
  await seedOutstandingMovementEvents()
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

export async function processGameTick(options?: { now?: Date; processorId?: string }) {
  const now = options?.now ?? new Date()
  const config = await prisma.worldConfig.findFirst()
  const context: TickContext = { now, config }

  await EventQueueService.releaseStaleLocks(STALE_LOCK_MS)

  const events = await EventQueueService.pullDueEvents({
    now,
    processorId: options?.processorId,
    limit: EVENT_BATCH_LIMIT,
  })

  if (events.length === 0) {
    await ensureRecurringEvents(now)
    return
  }

  for (const event of events) {
    const handler = EVENT_PROCESSORS[event.type]
    if (!handler) {
      console.warn(`[tick] No handler for event type ${event.type}`)
      await EventQueueService.markComplete(event.id)
      continue
    }

    try {
      await handler(event, context)
      await EventQueueService.markComplete(event.id)
      await scheduleRecurringIfNeeded(event, context.now)
    } catch (error) {
      console.error(`[tick] Event ${event.type} (${event.id}) failed`, error)
      await EventQueueService.markFailed(event.id, error)
    }
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleResourceTick(event: EventQueueItem, context: TickContext) {
  const now = context.now
  const config = context.config

  if (!config?.isRunning) {
    return
  }

  await processResourceBatch(now, config)
  await runLogisticsIfDue(now)
  await runLedgerIfDue(now, config)
  await runTrainingIfDue(now)
  await runMarketSweepIfDue(now)
  await runRankingIfDue(now)
  await runEndgameIfDue(now)
  await runRallyPointIfDue(now)
  await runTroopEvasionIfDue(now)
}

async function handleTroopMovementEvent(event: EventQueueItem, context: TickContext) {
  const payload = parsePayload<MovementEventPayload>(event)
  if (!payload?.movementId) {
    return
  }

  const movement = await prisma.movement.findUnique({
    where: { id: payload.movementId },
    include: { attack: true, reinforcement: true },
  })

  if (!movement || movement.status !== "IN_PROGRESS") {
    return
  }

  if (movement.arrivalAt > context.now) {
    await EventQueueService.scheduleEvent(
      "TROOP_MOVEMENT",
      movement.arrivalAt,
      { movementId: movement.id },
      { dedupeKey: `movement:${movement.id}` },
    )
    return
  }

  await prisma.movement.update({
    where: { id: movement.id },
    data: { status: "ARRIVED" },
  })

  if (movement.attack) {
    await prisma.attack.update({
      where: { id: movement.attack.id },
      data: { status: "ARRIVED" },
    })
  }

  if (movement.reinforcement) {
    await prisma.reinforcement.update({
      where: { id: movement.reinforcement.id },
      data: { status: "ARRIVED" },
    })
  }

  if (movement.kind === "SETTLER_FOUND") {
    await ExpansionService.handleSettlerArrival(movement.id)
    return
  }

  if (movement.attack) {
    try {
      await CombatService.processAttackResolution(movement.attack.id)
    } catch (error) {
      console.error(`[tick] Attack resolution failed (${movement.attack.id})`, error)
    }
    return
  }

  if (movement.reinforcement) {
    try {
      await ReinforcementService.processReinforcementArrival(movement.reinforcement.id)
    } catch (error) {
      console.error(`[tick] Reinforcement arrival failed (${movement.reinforcement.id})`, error)
    }
    return
  }

  if (movement.troopId) {
    await MovementService.mergeTroops(movement.id)
  }
}

async function handleBuildingCompletionEvent(event: EventQueueItem, context: TickContext) {
  const payload = parsePayload<BuildingEventPayload>(event)
  if (!payload?.buildingId) return

  if (payload.demolition) {
    const building = await prisma.building.findUnique({
      where: { id: payload.buildingId },
      select: { demolitionAt: true, isDemolishing: true },
    })

    if (!building || !building.isDemolishing || !building.demolitionAt) {
      return
    }

    if (building.demolitionAt > context.now) {
      await EventQueueService.scheduleEvent(
        "BUILDING_COMPLETION",
        building.demolitionAt,
        { buildingId: payload.buildingId, demolition: true },
        { dedupeKey: `demolition:${payload.buildingId}` },
      )
      return
    }

    await BuildingService.completeDemolition(payload.buildingId)
    return
  }

  const building = await prisma.building.findUnique({
    where: { id: payload.buildingId },
    select: { completionAt: true, isBuilding: true },
  })

  if (!building || !building.isBuilding || !building.completionAt) {
    return
  }

  if (building.completionAt > context.now) {
    await EventQueueService.scheduleEvent(
      "BUILDING_COMPLETION",
      building.completionAt,
      { buildingId: payload.buildingId, taskId: payload.taskId },
      { dedupeKey: payload.taskId ? `building:${payload.taskId}` : `building:${payload.buildingId}` },
    )
    return
  }

  await BuildingService.completeBuilding(payload.buildingId)
}

async function handleLoyaltyTick(event: EventQueueItem, context: TickContext) {
  if (!context.config?.isRunning) {
    return
  }

  await LoyaltyService.processRegenTick(context.now)
}

async function handleNotificationEvent(event: EventQueueItem) {
  console.log(`[tick] Notification event delivered`, event.payload)
}

// ---------------------------------------------------------------------------
// Resource helpers
// ---------------------------------------------------------------------------

async function processResourceBatch(now: Date, config: WorldConfig) {
  const tickMinutes = Math.max(1, config.tickIntervalMinutes || 5)
  const tickSeconds = tickMinutes * 60

  const villages = await prisma.village.findMany({
    where: { player: { isDeleted: false } },
    orderBy: { lastTickAt: "asc" },
    take: RESOURCE_BATCH_SIZE,
    select: {
      id: true,
      playerId: true,
      wood: true,
      stone: true,
      iron: true,
      gold: true,
      food: true,
      woodProduction: true,
      stoneProduction: true,
      ironProduction: true,
      goldProduction: true,
      foodProduction: true,
      woodFractional: true,
      stoneFractional: true,
      ironFractional: true,
      goldFractional: true,
      foodFractional: true,
      warehouseFullNotifiedAt: true,
      granaryFullNotifiedAt: true,
      loyalty: true,
      maxLoyalty: true,
      lastTickAt: true,
      player: { select: { gameTribe: true } },
      buildings: {
        where: { type: { in: [...WAREHOUSE_TYPES, ...GRANARY_TYPES] } },
        select: { id: true, type: true, level: true },
      },
    },
  })

  if (!villages.length) return

  for (const village of villages) {
    const elapsedSeconds = Math.max(0, (now.getTime() - new Date(village.lastTickAt).getTime()) / 1000)
    if (elapsedSeconds === 0) continue

    const heroBonus = village.player?.gameTribe
      ? TribeService.getHeroResourceProductionBonus(village.player.gameTribe)
      : 0
    const loyaltyMultiplier = Math.max(0, village.loyalty) / Math.max(1, village.maxLoyalty || 100)
    const speedMultiplier = config.productionMultiplier ?? 1

    const productionPerSecond = calculatePerSecondProduction(
      village,
      {
        heroBonus,
        loyaltyMultiplier,
        speedMultiplier,
        tickSeconds,
      },
    )

    const capacities = await computeStorageCapacities(village.buildings)

    const updateData: Prisma.VillageUpdateInput = {
      lastTickAt: now,
    }
    let changed = false

    let warehouseFull = false
    let granaryFull = false

    for (const key of RESOURCE_KEYS) {
      const perSecond = productionPerSecond[key]
      if (perSecond === 0) continue

      const fractionalKey = `${key}Fractional` as FractionalKey
      const currentAmount = village[key as ResourceKey]
      const existingFractional = (village as Record<FractionalKey, number | null>)[fractionalKey] ?? 0
      const produced = existingFractional + perSecond * elapsedSeconds
      const wholeUnits = perSecond > 0 ? Math.floor(produced) : Math.ceil(produced)
      let remainder = produced - wholeUnits

      const capacity = key === "food" ? capacities.granary : capacities.warehouse
      let targetAmount = currentAmount + wholeUnits

      if (perSecond > 0) {
        targetAmount = Math.min(capacity, targetAmount)
        if (targetAmount >= capacity) {
          remainder = 0
          if (key === "food") granaryFull = true
          else warehouseFull = true
        }
      } else {
        targetAmount = Math.max(0, targetAmount)
        if (targetAmount === 0) remainder = 0
      }

      if (targetAmount !== currentAmount) {
        changed = true
        ;(updateData as Prisma.VillageUpdateInput & Record<ResourceKey, number>)[key] = targetAmount
      }

      if (Math.abs(remainder - existingFractional) > 0.0001) {
        changed = true
        ;(updateData as Prisma.VillageUpdateInput & Record<FractionalKey, number>)[fractionalKey] = remainder
      }
    }

    if (warehouseFull && !village.warehouseFullNotifiedAt) {
      updateData.warehouseFullNotifiedAt = now
      changed = true
    }

    if (!warehouseFull && village.warehouseFullNotifiedAt) {
      updateData.warehouseFullNotifiedAt = null
      changed = true
    }

    if (granaryFull && !village.granaryFullNotifiedAt) {
      updateData.granaryFullNotifiedAt = now
      changed = true
    }

    if (!granaryFull && village.granaryFullNotifiedAt) {
      updateData.granaryFullNotifiedAt = null
      changed = true
    }

    if (changed) {
      await prisma.village.update({
        where: { id: village.id },
        data: updateData,
      })
    } else {
      await prisma.village.update({
        where: { id: village.id },
        data: { lastTickAt: now },
      })
    }
  }
}

function calculatePerSecondProduction(
  village: {
    woodProduction: number
    stoneProduction: number
    ironProduction: number
    goldProduction: number
    foodProduction: number
  },
  context: { heroBonus: number; loyaltyMultiplier: number; speedMultiplier: number; tickSeconds: number },
) {
  const heroMultiplier = 1 + context.heroBonus
  const multiplier = context.loyaltyMultiplier * heroMultiplier * context.speedMultiplier

  return {
    wood: (village.woodProduction * multiplier) / context.tickSeconds,
    stone: (village.stoneProduction * multiplier) / context.tickSeconds,
    iron: (village.ironProduction * multiplier) / context.tickSeconds,
    gold: (village.goldProduction * multiplier) / context.tickSeconds,
    food: (village.foodProduction * multiplier) / context.tickSeconds,
  }
}

async function computeStorageCapacities(
  buildings: Array<{ type: string; level: number }>,
): Promise<{ warehouse: number; granary: number }> {
  let warehouse = 0
  let granary = 0

  for (const building of buildings) {
    const capacity = await CapacityService.getCapacityForLevel(building.type as any, building.level)
    if (WAREHOUSE_TYPES.includes(building.type)) {
      warehouse += capacity
    } else {
      granary += capacity
    }
  }

  return {
    warehouse: Math.max(warehouse, 1200),
    granary: Math.max(granary, 1200),
  }
}

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------

async function runLogisticsIfDue(now: Date) {
  const nowMs = now.getTime()
  if (nowMs - lastLogisticsRun < LOGISTICS_INTERVAL_MS) return
  lastLogisticsRun = nowMs

  try {
    await ShipmentService.processDueArrivals(now)
    await ShipmentService.processDueReturns(now)
    await TradeRouteService.runDueRoutes(now)
  } catch (error) {
    console.error("[tick] Logistics processing error", error)
  }
}

async function runLedgerIfDue(now: Date, config: WorldConfig) {
  const nowMs = now.getTime()
  if (nowMs - lastLedgerRun < LEDGER_INTERVAL_MS) return
  lastLedgerRun = nowMs
  await ResourceProductionService.processAllVillages({ tickMinutes: config.tickIntervalMinutes })
}

async function runTrainingIfDue(now: Date) {
  const nowMs = now.getTime()
  if (nowMs - lastTrainingRun < TRAINING_INTERVAL_MS) return
  lastTrainingRun = nowMs

  const completedTraining = await prisma.troopProduction.findMany({
    where: { completionAt: { lte: now } },
    select: { id: true },
  })

  for (const production of completedTraining) {
    await TroopService.completeTroopTraining(production.id)
  }

  await UnitSystemService.startDueTraining(now)
  await UnitSystemService.completeFinishedTraining(now)
}

async function runMarketSweepIfDue(now: Date) {
  const nowMs = now.getTime()
  if (nowMs - lastMarketSweep < MARKET_SWEEP_INTERVAL_MS) return
  lastMarketSweep = nowMs

  const expiredOrders = await prisma.marketOrder.findMany({
    where: { status: "OPEN", expiresAt: { lte: now } },
  })

  for (const order of expiredOrders) {
    if (order.type === "SELL") {
      await prisma.village.update({
        where: { id: order.villageId },
        data: {
          [order.offeringResource.toLowerCase()]: { increment: order.offeringAmount },
        },
      })
    }

    await prisma.marketOrder.update({
      where: { id: order.id },
      data: { status: "EXPIRED" },
    })
  }
}

async function runRankingIfDue(now: Date) {
  const nowMs = now.getTime()
  if (nowMs - lastRankingUpdate < RANKING_INTERVAL_MS) return
  lastRankingUpdate = nowMs
  await updatePlayerRankings()
}

async function runEndgameIfDue(now: Date) {
  const nowMs = now.getTime()
  if (nowMs - lastEndgameCheck < ENDGAME_INTERVAL_MS) return
  lastEndgameCheck = nowMs
  await EndgameService.evaluateWorldEndgame(now)
}

async function runRallyPointIfDue(now: Date) {
  const nowMs = now.getTime()
  if (nowMs - lastRallyPointSweep < RALLY_POINT_INTERVAL_MS) return
  lastRallyPointSweep = nowMs
  await processRallyPointMovements(now)
}

async function runTroopEvasionIfDue(now: Date) {
  const nowMs = now.getTime()
  if (nowMs - lastTroopEvasionSweep < TROOP_EVASION_INTERVAL_MS) return
  lastTroopEvasionSweep = nowMs
  await processTroopEvasionReturns(now)
}

// ---------------------------------------------------------------------------
// Event queue seeding & utilities
// ---------------------------------------------------------------------------

async function seedOutstandingBuildingEvents() {
  const batchSize = 200
  let cursor: { id: string } | undefined

  while (true) {
    const tasks = await prisma.buildQueueTask.findMany({
      where: { status: "BUILDING", finishesAt: { not: null } },
      select: { id: true, finishesAt: true, buildingId: true },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor, skip: 1 } : {}),
    })

    if (!tasks.length) break

    for (const task of tasks) {
      if (!task.buildingId || !task.finishesAt) continue
      await EventQueueService.scheduleEvent(
        "BUILDING_COMPLETION",
        task.finishesAt,
        { buildingId: task.buildingId, taskId: task.id },
        { dedupeKey: `building:${task.id}` },
      )
    }

    cursor = { id: tasks[tasks.length - 1].id }
  }

  const demolitions = await prisma.building.findMany({
    where: { isDemolishing: true, demolitionAt: { not: null } },
    select: { id: true, demolitionAt: true },
  })

  for (const building of demolitions) {
    if (!building.demolitionAt) continue
    await EventQueueService.scheduleEvent(
      "BUILDING_COMPLETION",
      building.demolitionAt,
      { buildingId: building.id, demolition: true },
      { dedupeKey: `demolition:${building.id}` },
    )
  }
}

async function seedOutstandingMovementEvents() {
  const batchSize = 500
  let cursor: { id: string } | undefined

  while (true) {
    const movements = await prisma.movement.findMany({
      where: { status: "IN_PROGRESS" },
      select: { id: true, arrivalAt: true },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor, skip: 1 } : {}),
    })

    if (!movements.length) break

    for (const movement of movements) {
      await EventQueueService.scheduleEvent(
        "TROOP_MOVEMENT",
        movement.arrivalAt,
        { movementId: movement.id },
        { dedupeKey: `movement:${movement.id}` },
      )
    }

    cursor = { id: movements[movements.length - 1].id }
  }
}

async function scheduleRecurringTick(
  type: Extract<EventQueueType, "RESOURCE_TICK" | "LOYALTY_TICK">,
  now: Date,
  intervalMs: number,
) {
  await EventQueueService.scheduleEvent(
    type,
    new Date(now.getTime() + intervalMs),
    undefined,
    { dedupeKey: RECURRING_EVENT_KEYS[type] },
  )
}

async function ensureRecurringEvents(now: Date) {
  await Promise.all([
    scheduleRecurringTick("RESOURCE_TICK", now, RESOURCE_TICK_INTERVAL_MS),
    scheduleRecurringTick("LOYALTY_TICK", now, LOYALTY_TICK_INTERVAL_MS),
  ])
}

async function scheduleRecurringIfNeeded(event: EventQueueItem, now: Date) {
  if (event.type === "RESOURCE_TICK") {
    await scheduleRecurringTick("RESOURCE_TICK", now, RESOURCE_TICK_INTERVAL_MS)
  } else if (event.type === "LOYALTY_TICK") {
    await scheduleRecurringTick("LOYALTY_TICK", now, LOYALTY_TICK_INTERVAL_MS)
  }
}

function parsePayload<T>(event: EventQueueItem): T | null {
  if (!event.payload) return null
  return event.payload as T
}

// ---------------------------------------------------------------------------
// Legacy helpers preserved from the prior scheduler
// ---------------------------------------------------------------------------

/**
 * Update player rankings and cache leaderboard
 * Points = sum of all building levels + village count
 */
async function updatePlayerRankings() {
  const players = await prisma.player.findMany({
    where: { isDeleted: false },
    include: { villages: { include: { buildings: true } } },
  })

  const playersWithPoints = await Promise.all(
    players.map(async (player) => {
      const points = await VillageService.calculatePlayerPoints(player.id)
      return { ...player, totalPoints: points }
    }),
  )

  const sortedPlayers = playersWithPoints.sort((a, b) => b.totalPoints - a.totalPoints)

  let rank = 1
  for (const player of sortedPlayers) {
    await prisma.player.update({
      where: { id: player.id },
      data: { rank, totalPoints: player.totalPoints },
    })
    rank += 1
  }

  const leaderboardData = sortedPlayers.slice(0, 100).map((p, idx) => ({
    rank: idx + 1,
    playerId: p.id,
    playerName: p.playerName,
    points: p.totalPoints,
    villages: p.villages.length,
  }))

  await prisma.leaderboardCache.upsert({
    where: { type: "PLAYERS" },
    update: {
      data: JSON.stringify(leaderboardData),
      updatedAt: new Date(),
    },
    create: {
      type: "PLAYERS",
      data: JSON.stringify(leaderboardData),
    },
  })

  console.log(`Updated rankings for ${sortedPlayers.length} players`)
}

async function processRallyPointMovements(now: Date) {
  try {
    const engine = getRallyPointEngine()
    const resolved = await engine.resolveDueMovements()
    if (resolved.length > 0) {
      console.log(`Processed ${resolved.length} rally point movements due by ${now.toISOString()}`)
    }
  } catch (error) {
    console.error("Rally point movement resolution error:", error)
  }
}

async function processTroopEvasionReturns(now: Date) {
  try {
    const evasionMessages = await prisma.message.findMany({
      where: {
        type: "SYSTEM",
        content: {
          contains: '"type":"EVASION_RETURN"',
        },
        createdAt: {
          lte: new Date(now.getTime() - 3 * 60 * 1000),
        },
      },
    })

    for (const message of evasionMessages) {
      try {
        const evasionData = JSON.parse(message.content)

        if (evasionData.type === "EVASION_RETURN") {
          const returnTime = new Date(evasionData.returnAt)

          if (returnTime <= now) {
            await CombatService.processTroopReturn(
              evasionData.villageId,
              evasionData.evadedTroops,
            )

            await prisma.message.update({
              where: { id: message.id },
              data: {
                subject: "Troop Evasion Completed",
                content: `Troops returned from evasion at ${returnTime.toISOString()}`,
              },
            })
          }
        }
      } catch (error) {
        console.error(`Error processing evasion message ${message.id}:`, error)
      }
    }
  } catch (error) {
    console.error("Error processing troop evasion returns:", error)
  }
}

export async function spawnBarbainians() {
  console.log("Spawning barbarians...")

  try {
    const continents = await prisma.continent.findMany()
    if (continents.length === 0) {
      console.log("No continents found")
      return
    }

    const spawnCount = Math.floor(Math.random() * 5) + 5

    for (let i = 0; i < spawnCount; i++) {
      const continent = continents[Math.floor(Math.random() * continents.length)]
      const x = continent.x + Math.floor(Math.random() * continent.size) * 10
      const y = continent.y + Math.floor(Math.random() * continent.size) * 10

      const existing = await prisma.village.findUnique({
        where: { x_y: { x, y } },
      })

      if (!existing) {
        const village = await prisma.village.create({
          data: {
            playerId: "barbarian",
            continentId: continent.id,
            x,
            y,
            name: "🏴‍☠️ Barbarian Village",
          },
        })

        await prisma.troop.create({
          data: {
            villageId: village.id,
            type: "WARRIOR",
            quantity: 100,
            attack: 12,
            defense: 6,
            speed: 5,
            health: 100,
          },
        })

        await prisma.barbarian.create({
          data: {
            x,
            y,
            villageId: village.id,
            warriors: 100,
            spearmen: 50,
            bowmen: 30,
            horsemen: 10,
          },
        })
      }
    }

    console.log("Barbarian spawning completed")
  } catch (error) {
    console.error("Error spawning barbarians:", error)
  }
}
