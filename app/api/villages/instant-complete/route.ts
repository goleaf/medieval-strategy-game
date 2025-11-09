import { prisma } from "@/lib/db"
import { BuildingService } from "@/lib/game-services/building-service"
import { TroopService } from "@/lib/game-services/troop-service"
import { UnitSystemService } from "@/lib/game-services/unit-system-service"
import { StorageService } from "@/lib/game-services/storage-service"
import { TrainingStatus, StorageLedgerReason } from "@prisma/client"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

const GOLD_COST_PER_ITEM = 2 // Gold cost per construction/research item

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { villageId } = body

    if (!villageId) {
      return errorResponse("Village ID required", 400)
    }

    // Get village with all relations
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        buildings: {
          include: {
            research: true,
            troopProduction: true,
          },
        },
        trainingQueueItems: {
          where: { status: { in: [TrainingStatus.WAITING, TrainingStatus.TRAINING] } },
          orderBy: { startAt: "asc" },
        },
      },
    })

    if (!village) {
      return errorResponse("Village not found", 404)
    }

    // Count active constructions and research
    const queuedBuildings = village.buildings.filter(
      (b) => b.isBuilding && b.queuePosition !== null,
    )
    const activeResearch = village.buildings.filter(
      (b) => b.research?.isResearching === true,
    )
    const activeTroopProduction = village.buildings.flatMap((b) =>
      b.troopProduction.filter((tp) => tp.completionAt > new Date()),
    )

    const activeModernTraining = village.trainingQueueItems.length

    const totalActiveItems =
      queuedBuildings.length + activeResearch.length + activeTroopProduction.length + activeModernTraining

    if (totalActiveItems === 0) {
      return errorResponse("No active constructions or research to complete", 400)
    }

    // Calculate total gold cost
    const totalGoldCost = totalActiveItems * GOLD_COST_PER_ITEM

    // Check if village has enough gold
    if (village.gold < totalGoldCost) {
      return errorResponse(
        `Insufficient gold. Required: ${totalGoldCost}, Available: ${village.gold}`,
        400,
      )
    }

    let completedBuildings = 0
    let completedResearch = 0
    let completedTroopProduction = 0
    let completedModernTraining = 0

    // Complete all queued buildings
    for (const building of queuedBuildings) {
      try {
        await BuildingService.completeBuilding(building.id)
        completedBuildings++
      } catch (error) {
        console.error(`Failed to complete building ${building.id}:`, error)
      }
    }

    // Complete all active research
    for (const building of activeResearch) {
      if (building.research?.isResearching) {
        try {
          // Complete research immediately
          await prisma.research.update({
            where: { buildingId: building.id },
            data: {
              isResearching: false,
              completionAt: new Date(),
            },
          })
          completedResearch++
        } catch (error) {
          console.error(`Failed to complete research for building ${building.id}:`, error)
        }
      }
    }

    // Complete all active troop production
    for (const building of village.buildings) {
      for (const production of building.troopProduction) {
        if (production.completionAt > new Date()) {
          try {
            await TroopService.completeTroopTraining(production.id)
            completedTroopProduction++
          } catch (error) {
            console.error(`Failed to complete troop production ${production.id}:`, error)
          }
        }
      }
    }

    if (activeModernTraining > 0) {
      try {
        const now = new Date()
        await prisma.$transaction(async (tx) => {
          for (const job of village.trainingQueueItems) {
            if (job.status === TrainingStatus.WAITING) {
              const bundle = {
                wood: job.costWood,
                stone: job.costClay,
                iron: job.costIron,
                food: job.costCrop,
                gold: 0,
              }
              await StorageService.deductResources(village.id, bundle, StorageLedgerReason.TRAINING_COST, {
                client: tx,
              })
              const adjustedStart = new Date(now.getTime() - job.totalDurationSeconds * 1000)
              await tx.trainingQueueItem.update({
                where: { id: job.id },
                data: {
                  status: TrainingStatus.TRAINING,
                  startAt: adjustedStart,
                  finishAt: now,
                },
              })
            } else {
              await tx.trainingQueueItem.update({
                where: { id: job.id },
                data: { finishAt: now },
              })
            }
          }
        })
        completedModernTraining = await UnitSystemService.completeFinishedTraining(now)
      } catch (error) {
        console.error("Failed to complete modern training queue:", error)
      }
    }

    // Deduct gold
    await prisma.village.update({
      where: { id: villageId },
      data: {
        gold: village.gold - totalGoldCost,
      },
    })

    return successResponse({
      completedBuildings,
      completedResearch,
      completedTroopProduction,
      totalGoldCost,
      remainingGold: village.gold - totalGoldCost,
      completedModernTraining,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
