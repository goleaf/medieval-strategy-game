import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { BuildingType, TrainingBuilding, TrainingStatus, StorageLedgerReason } from "@prisma/client"
import { WorldSettingsService } from "@/lib/game-services/world-settings-service"

import { getTroopSystemConfig, requireUnitDefinition } from "@/lib/troop-system/config"
import { enqueueTraining, type TrainingQueueItem as TrainingPlanItem } from "@/lib/troop-system/training"
import type { UnitCosts, UnitDefinition, TroopSystemConfig } from "@/lib/troop-system/types"
import { adjustHomeUnitCount } from "@/lib/game-services/unit-ledger"
import { StorageService } from "@/lib/game-services/storage-service"
import { BuildingService } from "@/lib/game-services/building-service"
import { NotificationService } from "@/lib/game-services/notification-service"
import { buildingPopulationPerLevel } from "@/lib/game-services/population-helpers"

interface TrainUnitsInput {
  villageId: string
  unitTypeId: string
  count: number
}

const TRAINING_BUILDING_TO_KEY: Record<TrainingBuilding, "barracks" | "stable" | "workshop" | "residence" | "palace"> = {
  [TrainingBuilding.BARRACKS]: "barracks",
  [TrainingBuilding.STABLE]: "stable",
  [TrainingBuilding.WORKSHOP]: "workshop",
  [TrainingBuilding.RESIDENCE]: "residence",
  [TrainingBuilding.PALACE]: "palace",
}

const TRAINING_BUILDING_TO_STRUCTURE: Record<TrainingBuilding, BuildingType> = {
  [TrainingBuilding.BARRACKS]: BuildingType.BARRACKS,
  [TrainingBuilding.STABLE]: BuildingType.STABLES,
  [TrainingBuilding.WORKSHOP]: BuildingType.WORKSHOP,
  [TrainingBuilding.RESIDENCE]: BuildingType.RESIDENCE,
  [TrainingBuilding.PALACE]: BuildingType.PALACE,
}

const REQUIREMENT_BUILDING_MAP: Record<string, BuildingType> = {
  barracks: BuildingType.BARRACKS,
  stable: BuildingType.STABLES,
  stables: BuildingType.STABLES,
  workshop: BuildingType.WORKSHOP,
  residence: BuildingType.RESIDENCE,
  palace: BuildingType.PALACE,
  academy: BuildingType.ACADEMY,
  smithy: BuildingType.SMITHY,
}

function normalizeRequirementKey(key: string): string {
  return key.toLowerCase().replace(/[\s-]+/g, "_")
}

function mapRequirementToBuildingType(key: string): BuildingType {
  const normalized = normalizeRequirementKey(key)
  const mapped = REQUIREMENT_BUILDING_MAP[normalized]
  if (!mapped) {
    throw new Error(`Unsupported building requirement: ${key}`)
  }
  return mapped
}

function convertCostToVillageResources(cost: UnitCosts) {
  return {
    wood: cost.wood,
    stone: cost.clay,
    iron: cost.iron,
    gold: 0,
    food: cost.crop,
  }
}

type BuildingSnapshot = { type: BuildingType; level: number }
type QueueVillageContext = {
  id: string
  buildings: BuildingSnapshot[]
}

type TrainingQueueRow = {
  id: string
  villageId: string
  building: TrainingBuilding
  status: TrainingStatus
  startAt: Date
  finishAt: Date
  totalDurationSeconds: number
  populationCost: number
  costWood: number
  costClay: number
  costIron: number
  costCrop: number
  costGold: number
}

function bundleFromJobCosts(job: Pick<TrainingQueueRow, "costWood" | "costClay" | "costIron" | "costCrop" | "costGold">) {
  return {
    wood: job.costWood,
    stone: job.costClay,
    iron: job.costIron,
    food: job.costCrop,
    gold: job.costGold,
  }
}

export class UnitSystemService {
  static async syncUnitTypes(config: TroopSystemConfig = getTroopSystemConfig()): Promise<void> {
    for (const [unitTypeId, definition] of Object.entries(config.units)) {
      await this.ensureUnitTypeRecord(unitTypeId, definition)
    }
  }

  private static resolveTrainingBuilding(definition: UnitDefinition): TrainingBuilding {
    switch (definition.role) {
      case "cav":
        return TrainingBuilding.STABLE
      case "ram":
      case "catapult":
        return TrainingBuilding.WORKSHOP
      case "settler":
      case "admin":
        return definition.buildingReq.palace ? TrainingBuilding.PALACE : TrainingBuilding.RESIDENCE
      default:
        return TrainingBuilding.BARRACKS
    }
  }

  private static async ensureUnitTypeRecord(unitTypeId: string, definition: UnitDefinition): Promise<void> {
    await prisma.unitType.upsert({
      where: { id: unitTypeId },
      update: {
        role: definition.role.toUpperCase() as any,
        attack: definition.attack,
        defInf: definition.defInf,
        defCav: definition.defCav,
        defArch: definition.defArch ?? 0,
        speedTilesPerHour: definition.speedTilesPerHour,
        carry: definition.carry,
        upkeepCropPerHour: definition.upkeepCropPerHour,
        popCost: definition.popCost,
        trainTimeSec: definition.trainTimeSec,
        costWood: definition.cost.wood,
        costClay: definition.cost.clay,
        costIron: definition.cost.iron,
        costCrop: definition.cost.crop,
        buildingReqJson: definition.buildingReq,
        researchReqJson: definition.researchReq,
      },
      create: {
        id: unitTypeId,
        role: definition.role.toUpperCase() as any,
        attack: definition.attack,
        defInf: definition.defInf,
        defCav: definition.defCav,
        defArch: definition.defArch ?? 0,
        speedTilesPerHour: definition.speedTilesPerHour,
        carry: definition.carry,
        upkeepCropPerHour: definition.upkeepCropPerHour,
        popCost: definition.popCost,
        trainTimeSec: definition.trainTimeSec,
        costWood: definition.cost.wood,
        costClay: definition.cost.clay,
        costIron: definition.cost.iron,
        costCrop: definition.cost.crop,
        buildingReqJson: definition.buildingReq,
        researchReqJson: definition.researchReq,
      },
    })
  }

  private static async loadVillageContext(
    tx: Prisma.TransactionClient,
    village: QueueVillageContext | string,
  ): Promise<QueueVillageContext> {
    if (typeof village !== "string") {
      return village
    }
    const buildings = await tx.building.findMany({
      where: { villageId: village },
      select: { type: true, level: true },
    })
    return { id: village, buildings }
  }

  private static async hasPopulationCapacity(
    tx: Prisma.TransactionClient,
    village: QueueVillageContext,
    populationCost: number,
  ): Promise<boolean> {
    const limit = BuildingService.calculatePopulationLimit(village.buildings)
    const unitStacks = await tx.unitStack.findMany({
      where: { villageId: village.id },
      select: { count: true, unitType: { select: { popCost: true } } },
    })
    const usedPopulation = unitStacks.reduce((sum, stack) => sum + stack.count * stack.unitType.popCost, 0)
    const reservedPopulation = await tx.trainingQueueItem.aggregate({
      where: { villageId: village.id, status: TrainingStatus.TRAINING },
      _sum: { populationCost: true },
    })
    // Reserve population for buildings currently under construction (delta per level)
    const buildingReservations = await tx.buildQueueTask.findMany({
      where: { villageId: village.id, status: "BUILDING" },
      include: { building: { select: { type: true } } },
    })
    const reservedForBuildings = buildingReservations.reduce((sum, task) => {
      const type = task.building?.type as any
      if (!type) return sum
      // Reserve only the next level increment while under construction
      const perLevel = buildingPopulationPerLevel(type)
      return sum + perLevel
    }, 0)

    const nextTotal = usedPopulation + (reservedPopulation._sum.populationCost ?? 0) + reservedForBuildings + populationCost
    return nextTotal <= limit
  }

  private static async normalizeWaitingQueue(
    tx: Prisma.TransactionClient,
    villageId: string,
    building: TrainingBuilding,
    referenceTime: Date = new Date(),
  ): Promise<void> {
    const activeJob = await tx.trainingQueueItem.findFirst({
      where: { villageId, building, status: TrainingStatus.TRAINING },
      orderBy: { startAt: "asc" },
      select: { finishAt: true },
    })

    let cursor = activeJob?.finishAt ?? referenceTime
    if (cursor.getTime() < referenceTime.getTime()) {
      cursor = referenceTime
    }

    const waitingJobs = await tx.trainingQueueItem.findMany({
      where: { villageId, building, status: TrainingStatus.WAITING },
      orderBy: { startAt: "asc" },
      select: { id: true, totalDurationSeconds: true, startAt: true, finishAt: true },
    })

    for (const job of waitingJobs) {
      const startAt = cursor
      const finishAt = new Date(startAt.getTime() + job.totalDurationSeconds * 1000)
      if (job.startAt.getTime() !== startAt.getTime() || job.finishAt.getTime() !== finishAt.getTime()) {
        await tx.trainingQueueItem.update({
          where: { id: job.id },
          data: { startAt, finishAt },
        })
      }
      cursor = finishAt
    }
  }

  private static async startTrainingJob(
    tx: Prisma.TransactionClient,
    job: TrainingQueueRow,
    referenceTime: Date,
    village: QueueVillageContext,
  ): Promise<Date | null> {
    const effectiveStart = referenceTime.getTime() > job.startAt.getTime() ? referenceTime : job.startAt
    const finishAt = new Date(effectiveStart.getTime() + job.totalDurationSeconds * 1000)

    const hasCapacity = await this.hasPopulationCapacity(tx, village, job.populationCost)
    if (!hasCapacity) {
      return null
    }

    try {
      await StorageService.deductResources(job.villageId, bundleFromJobCosts(job), StorageLedgerReason.TRAINING_COST, {
        client: tx,
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes("lacks")) {
        return null
      }
      throw error
    }

    await tx.trainingQueueItem.update({
      where: { id: job.id },
      data: {
        status: TrainingStatus.TRAINING,
        startAt: effectiveStart,
        finishAt,
        updatedAt: referenceTime,
      },
    })

    return finishAt
  }

  private static async tryStartQueuedTraining(
    tx: Prisma.TransactionClient,
    village: QueueVillageContext | string,
    building: TrainingBuilding,
    referenceTime: Date = new Date(),
  ): Promise<boolean> {
    const context = await this.loadVillageContext(tx, village)
    const activeJob = await tx.trainingQueueItem.findFirst({
      where: { villageId: context.id, building, status: TrainingStatus.TRAINING },
      select: { id: true },
    })

    if (activeJob) {
      return false
    }

    const nextJob = await tx.trainingQueueItem.findFirst({
      where: { villageId: context.id, building, status: TrainingStatus.WAITING },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        villageId: true,
        building: true,
        status: true,
        startAt: true,
        finishAt: true,
        totalDurationSeconds: true,
        populationCost: true,
        costWood: true,
        costClay: true,
        costIron: true,
        costCrop: true,
        costGold: true,
      },
    })

    if (!nextJob || nextJob.startAt > referenceTime) {
      return false
    }

    const finishAt = await this.startTrainingJob(tx, nextJob as TrainingQueueRow, referenceTime, context)
    if (!finishAt) {
      return false
    }

    await this.normalizeWaitingQueue(tx, context.id, building, finishAt)
    return true
  }

  private static assertBuildingRequirements(
    village: {
      buildings: Array<{ type: BuildingType; level: number }>
    },
    definition: UnitDefinition,
  ): void {
    const combinedRequirements = { ...definition.buildingReq, ...definition.researchReq }
    for (const [key, level] of Object.entries(combinedRequirements)) {
      const buildingType = mapRequirementToBuildingType(key)
      const building = village.buildings.find((b) => b.type === buildingType)
      if (!building || building.level < level) {
        throw new Error(`${key} level ${level} required`)
      }
    }
  }

  static async trainUnits(input: TrainUnitsInput) {
    if (input.count <= 0) {
      throw new Error("Training quantity must be greater than zero")
    }
    const config = getTroopSystemConfig()
    const definition = requireUnitDefinition(input.unitTypeId, config)
    const trainingBuilding = this.resolveTrainingBuilding(definition)
    await this.ensureUnitTypeRecord(input.unitTypeId, definition)

    const queueItem = await prisma.$transaction(async (tx) => {
      const village = await tx.village.findUnique({
        where: { id: input.villageId },
        include: {
          player: {
            select: {
              gameWorld: {
                select: { id: true, speed: true, worldType: true, settings: true },
              },
            },
          },
          buildings: true,
          trainingQueueItems: {
            where: {
              building: trainingBuilding,
              status: { in: [TrainingStatus.WAITING, TrainingStatus.TRAINING] },
            },
            orderBy: { finishAt: "asc" },
          },
        },
      })

      if (!village) {
        throw new Error("Village not found")
      }

      const worldSettings = WorldSettingsService.derive(village.player?.gameWorld)
      if (WorldSettingsService.isArcherUnit(input.unitTypeId) && !worldSettings.archersEnabled) {
        throw new Error("Archer units are disabled on this world.")
      }

      this.assertBuildingRequirements(village, definition)

      // Enforce paladin uniqueness across player's account
      if (input.unitTypeId === "paladin") {
        const allVillages = await tx.village.findMany({ where: { playerId: village.player?.id }, select: { id: true } })
        const villageIds = allVillages.map((v) => v.id)
        if (villageIds.length > 0) {
          const existingStacks = await tx.unitStack.findMany({
            where: { villageId: { in: villageIds }, unitTypeId: "paladin" },
            select: { count: true },
          })
          const existingQueued = await tx.trainingQueueItem.count({
            where: { villageId: { in: villageIds }, unitTypeId: "paladin", status: { in: [TrainingStatus.WAITING, TrainingStatus.TRAINING] } },
          })
          const hasPaladin = existingStacks.some((s) => s.count > 0) || existingQueued > 0
          if (hasPaladin) {
            throw new Error("Only one Paladin is allowed per player.")
          }
        }
      }

      const existingQueue: TrainingPlanItem[] = village.trainingQueueItems.map((item) => ({
        unitType: item.unitTypeId,
        count: item.count,
        building: TRAINING_BUILDING_TO_KEY[trainingBuilding],
        startAt: item.startAt,
        finishAt: item.finishAt,
      }))

      const trainingStructureType = TRAINING_BUILDING_TO_STRUCTURE[trainingBuilding]
      const trainingStructure = village.buildings.find((b) => b.type === trainingStructureType)
      if (!trainingStructure || trainingStructure.level <= 0) {
        throw new Error(`${trainingStructureType} required to train ${input.unitTypeId}`)
      }

      const serverSpeed = worldSettings.speed ?? village.player?.gameWorld?.speed ?? 1

      const { order, totalCost, unitDurationSeconds, totalDurationSeconds } = enqueueTraining({
        unitType: input.unitTypeId,
        count: input.count,
        buildingType: TRAINING_BUILDING_TO_KEY[trainingBuilding],
        buildingLevel: trainingStructure.level,
        existingQueue,
        serverSpeedOverride: serverSpeed,
      })

      const populationCost = definition.popCost * input.count
      const totalGoldCost =
        input.unitTypeId === "NOBLEMAN" ? worldSettings.noble.coinCost * input.count : 0

      const createdQueueItem = await tx.trainingQueueItem.create({
        data: {
          villageId: village.id,
          unitTypeId: input.unitTypeId,
          building: trainingBuilding,
          count: order.count,
          startAt: order.startAt,
          finishAt: order.finishAt,
          buildingLevel: trainingStructure.level,
          unitDurationSeconds,
          totalDurationSeconds,
          costWood: totalCost.wood,
          costClay: totalCost.clay,
          costIron: totalCost.iron,
          costCrop: totalCost.crop,
          costGold: totalGoldCost,
          populationCost,
          worldSpeedApplied: serverSpeed,
          status: TrainingStatus.WAITING,
        },
        include: { unitType: true },
      })

      await this.tryStartQueuedTraining(tx, { id: village.id, buildings: village.buildings }, trainingBuilding, new Date())

      return createdQueueItem
    })

    return queueItem
  }

  static async startDueTraining(referenceTime: Date = new Date()): Promise<number> {
    const dueItems = await prisma.trainingQueueItem.findMany({
      where: {
        status: TrainingStatus.WAITING,
        startAt: { lte: referenceTime },
      },
      select: {
        villageId: true,
        building: true,
      },
    })

    const processedKeys = new Set<string>()
    let started = 0

    for (const item of dueItems) {
      const key = `${item.villageId}:${item.building}`
      if (processedKeys.has(key)) {
        continue
      }
      processedKeys.add(key)

      const didStart = await prisma.$transaction((tx) =>
        this.tryStartQueuedTraining(tx, item.villageId, item.building, referenceTime),
      )
      if (didStart) {
        started += 1
      }
    }

    return started
  }

  static async cancelTrainingJob(queueItemId: string) {
    const now = new Date()

    return prisma.$transaction(async (tx) => {
      const job = await tx.trainingQueueItem.findUnique({
        where: { id: queueItemId },
      })

      if (!job) {
        throw new Error("Training queue item not found")
      }

      if (job.status === TrainingStatus.DONE || job.status === TrainingStatus.CANCELLED) {
        throw new Error("Training queue item already resolved")
      }

      if (job.status === TrainingStatus.WAITING) {
        await tx.trainingQueueItem.update({
          where: { id: job.id },
          data: { status: TrainingStatus.CANCELLED, cancelledAt: now, updatedAt: now },
        })
        await this.normalizeWaitingQueue(tx, job.villageId, job.building, now)
        await this.tryStartQueuedTraining(tx, job.villageId, job.building, now)
        return { refundedResources: null, queueItemId, villageId: job.villageId, unitTypeId: job.unitTypeId }
      }

      if (!job.startAt || !job.finishAt) {
        throw new Error("Training job missing timing metadata")
      }

      const totalMs = job.finishAt.getTime() - job.startAt.getTime()
      const elapsedMs = now.getTime() - job.startAt.getTime()
      const progress = totalMs <= 0 ? 1 : elapsedMs / totalMs

      if (progress > 0.1) {
        throw new Error("Training can only be cancelled within the first 10% of progress")
      }

      const refundBundle = {
        wood: Math.floor(job.costWood * 0.9),
        stone: Math.floor(job.costClay * 0.9),
        iron: Math.floor(job.costIron * 0.9),
        food: Math.floor(job.costCrop * 0.9),
        gold: Math.floor(job.costGold * 0.9),
      }

      await StorageService.addResources(job.villageId, refundBundle, StorageLedgerReason.TRAINING_REFUND, {
        client: tx,
      })

      await tx.trainingQueueItem.update({
        where: { id: job.id },
        data: { status: TrainingStatus.CANCELLED, cancelledAt: now, updatedAt: now },
      })

      await this.normalizeWaitingQueue(tx, job.villageId, job.building, now)
      await this.tryStartQueuedTraining(tx, job.villageId, job.building, now)

      return { refundedResources: refundBundle, queueItemId, villageId: job.villageId, unitTypeId: job.unitTypeId }
    })
  }

  static async completeFinishedTraining(referenceTime: Date = new Date()): Promise<number> {
    const dueItems = await prisma.trainingQueueItem.findMany({
      where: {
        status: TrainingStatus.TRAINING,
        finishAt: { lte: referenceTime },
      },
      include: {
        village: {
          select: { playerId: true },
        },
        unitType: {
          select: { id: true, role: true, attack: true },
        },
      },
      orderBy: { finishAt: "asc" },
    })

    let processed = 0
    for (const job of dueItems) {
      await prisma.$transaction(async (tx) => {
        const ownerAccountId = job.village?.playerId
        if (!ownerAccountId) {
          throw new Error(`Unable to resolve owner for village ${job.villageId}`)
        }

        await adjustHomeUnitCount(tx, {
          villageId: job.villageId,
          ownerAccountId,
          unitTypeId: job.unitTypeId,
          delta: job.count,
        })

        await tx.trainingQueueItem.update({
          where: { id: job.id },
          data: { status: TrainingStatus.DONE, updatedAt: referenceTime },
        })

        await this.tryStartQueuedTraining(tx, job.villageId, job.building, referenceTime)
      })
      // Fire a completion notification
      try {
        const ownerAccountId = job.village?.playerId
        if (ownerAccountId) {
          const isNoble = job.unitTypeId === "admin" || job.unitType?.role === "admin"
          await NotificationService.emit({
            playerId: ownerAccountId,
            type: isNoble ? "NOBLE_TRAINING_COMPLETE" : "TROOP_TRAINING_COMPLETE",
            title: isNoble ? "Nobleman Ready" : "Troop Training Complete",
            message: `${job.count.toLocaleString()} × ${job.unitType?.id ?? job.unitTypeId} completed`,
            actionUrl: `/village/${job.villageId}/rally-point`,
            metadata: {
              unitTypeId: job.unitTypeId,
              count: job.count,
              villageId: job.villageId,
              finishAt: job.finishAt,
            },
          })
        }
      } catch (err) {
        console.warn("[training] Notification emit failed:", err)
      }
      processed += 1
    }
    return processed
  }
}
