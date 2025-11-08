import { prisma } from "@/lib/db"
import { BuildingType, TrainingBuilding, TrainingStatus } from "@prisma/client"

import { getTroopSystemConfig, requireUnitDefinition } from "@/lib/troop-system/config"
import { enqueueTraining, type TrainingQueueItem as TrainingPlanItem } from "@/lib/troop-system/training"
import type { UnitCosts, UnitDefinition, TroopSystemConfig } from "@/lib/troop-system/types"
import { adjustHomeUnitCount } from "@/lib/game-services/unit-ledger"

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
    food: cost.crop,
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

      this.assertBuildingRequirements(village, definition)

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

      const { order, totalCost } = enqueueTraining({
        unitType: input.unitTypeId,
        count: input.count,
        buildingType: TRAINING_BUILDING_TO_KEY[trainingBuilding],
        buildingLevel: trainingStructure.level,
        existingQueue,
      })

      const resourceCost = convertCostToVillageResources(totalCost)
      if (
        village.wood < resourceCost.wood ||
        village.stone < resourceCost.stone ||
        village.iron < resourceCost.iron ||
        village.food < resourceCost.food
      ) {
        throw new Error("Insufficient resources for training")
      }

      await tx.village.update({
        where: { id: village.id },
        data: {
          wood: village.wood - resourceCost.wood,
          stone: village.stone - resourceCost.stone,
          iron: village.iron - resourceCost.iron,
          food: village.food - resourceCost.food,
        },
      })

      const createdQueueItem = await tx.trainingQueueItem.create({
        data: {
          villageId: village.id,
          unitTypeId: input.unitTypeId,
          building: trainingBuilding,
          count: order.count,
          startAt: order.startAt,
          finishAt: order.finishAt,
          status: TrainingStatus.WAITING,
        },
        include: { unitType: true },
      })

      return createdQueueItem
    })

    return queueItem
  }

  static async completeFinishedTraining(referenceTime: Date = new Date()): Promise<number> {
    const dueItems = await prisma.trainingQueueItem.findMany({
      where: {
        status: { in: [TrainingStatus.WAITING, TrainingStatus.TRAINING] },
        finishAt: { lte: referenceTime },
      },
      include: {
        village: {
          select: { playerId: true },
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
      })
      processed += 1
    }
    return processed
  }
}
