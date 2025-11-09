import { authenticateRequest } from "@/app/api/auth/middleware"
import { MerchantService } from "@/lib/game-services/merchant-service"
import { ResourceReservationService } from "@/lib/game-services/resource-reservation-service"
import { errorResponse, handleValidationError, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import type { ResourceBundle } from "@/lib/game-services/storage-service"
import { prisma } from "@/lib/db"
import type { NextRequest } from "next/server"
import { z } from "zod"

const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const

const PLANNER_SCHEMA = z.object({
  villageIds: z.array(z.string().min(1)).optional(),
  needs: z.object({
    wood: z.number().int().min(0).default(0),
    stone: z.number().int().min(0).default(0),
    iron: z.number().int().min(0).default(0),
    gold: z.number().int().min(0).default(0),
    food: z.number().int().min(0).default(0),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = PLANNER_SCHEMA.parse(await request.json())
    const villageFilter = payload.villageIds?.length ? { id: { in: payload.villageIds } } : {}

    const villages = await prisma.village.findMany({
      where: {
        playerId: auth.playerId,
        ...villageFilter,
      },
      select: {
        id: true,
        name: true,
        wood: true,
        stone: true,
        iron: true,
        gold: true,
        food: true,
      },
      orderBy: { name: "asc" },
    })

    if (villages.length === 0) {
      return errorResponse("No villages available for planning", 404)
    }

    const [merchantSnapshots, reservedMap] = await Promise.all([
      Promise.all(villages.map((village) => MerchantService.getSnapshot(village.id))),
      ResourceReservationService.getReservedTotalsForPlayer(auth.playerId),
    ])

    const snapshotMap = new Map(merchantSnapshots.map((snapshot) => [snapshot.villageId, snapshot]))
    const remainingNeeds: ResourceBundle = { ...payload.needs }
    const plan: Array<{
      villageId: string
      villageName: string
      bundle: ResourceBundle
      merchantsRequired: number
    }> = []

    for (const village of villages) {
      const snapshot = snapshotMap.get(village.id)
      if (!snapshot || snapshot.availableMerchants <= 0) continue

      const reserved = reservedMap.get(village.id) ?? emptyBundle()
      const availableResources: ResourceBundle = {
        wood: Math.max(0, village.wood - reserved.wood),
        stone: Math.max(0, village.stone - reserved.stone),
        iron: Math.max(0, village.iron - reserved.iron),
        gold: Math.max(0, village.gold - reserved.gold),
        food: Math.max(0, village.food - reserved.food),
      }

      let remainingCapacity = snapshot.availableMerchants * snapshot.capacityPerMerchant
      if (remainingCapacity <= 0) continue

      const allocation = emptyBundle()
      for (const resource of RESOURCE_KEYS) {
        if (remainingNeeds[resource] <= 0 || availableResources[resource] <= 0) continue
        const amount = Math.min(remainingNeeds[resource], availableResources[resource], remainingCapacity)
        if (amount <= 0) continue
        allocation[resource] += amount
        remainingNeeds[resource] -= amount
        availableResources[resource] -= amount
        remainingCapacity -= amount
        if (remainingCapacity <= 0) break
      }

      const totalAllocated = sumBundle(allocation)
      if (totalAllocated > 0) {
        plan.push({
          villageId: village.id,
          villageName: village.name,
          bundle: allocation,
          merchantsRequired: Math.max(1, Math.ceil(totalAllocated / snapshot.capacityPerMerchant)),
        })
      }
    }

    return successResponse({
      plan,
      remainingNeeds,
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return errorResponse((error as Error).message, 400)
  }
}

function emptyBundle(): ResourceBundle {
  return { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }
}

function sumBundle(bundle: ResourceBundle) {
  return RESOURCE_KEYS.reduce((sum, key) => sum + (bundle[key] ?? 0), 0)
}
