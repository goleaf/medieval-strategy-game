import { prisma } from "@/lib/db"
import { CapacityService } from "./capacity-service"
import type { Prisma, StorageLedgerReason } from "@prisma/client"

const RESOURCE_KEYS = CapacityService.resourceKeys
type ResourceKey = (typeof RESOURCE_KEYS)[number]

type PrismaCtx = Prisma.TransactionClient | typeof prisma

export type ResourceBundle = Partial<Record<ResourceKey, number>>

export type StorageSnapshot = {
  resources: Record<ResourceKey, number>
  capacities: Record<ResourceKey, number>
}

type AdjustOptions = {
  allowNegative?: boolean
  metadata?: Record<string, unknown>
  client?: PrismaCtx
}

export class StorageService {
  static async getSnapshot(villageId: string, client: PrismaCtx = prisma): Promise<StorageSnapshot | null> {
    const village = await client.village.findUnique({
      where: { id: villageId },
      select: {
        id: true,
        wood: true,
        stone: true,
        iron: true,
        gold: true,
        food: true,
      },
    })

    if (!village) return null

    const { totals } = await CapacityService.getVillageCapacitySummary(villageId, client)
    return {
      resources: {
        wood: village.wood,
        stone: village.stone,
        iron: village.iron,
        gold: village.gold,
        food: village.food,
      },
      capacities: totals,
    }
  }

  static async canAfford(villageId: string, cost: ResourceBundle): Promise<boolean> {
    const snapshot = await this.getSnapshot(villageId)
    if (!snapshot) return false

    return RESOURCE_KEYS.every((key) => {
      const required = cost[key] ?? 0
      if (required <= 0) return true
      return snapshot.resources[key] >= required
    })
  }

  static async addResources(
    villageId: string,
    bundle: ResourceBundle,
    reason: StorageLedgerReason,
    options?: Omit<AdjustOptions, "allowNegative">,
  ) {
    return this.adjustResources(villageId, bundle, reason, options)
  }

  static async deductResources(
    villageId: string,
    bundle: ResourceBundle,
    reason: StorageLedgerReason,
    options?: AdjustOptions,
  ) {
    const strictOptions = { ...options, allowNegative: false }
    const negativeBundle = RESOURCE_KEYS.reduce<ResourceBundle>((acc, key) => {
      const value = bundle[key]
      if (value && value !== 0) {
        acc[key] = -Math.abs(value)
      }
      return acc
    }, {})

    return this.adjustResources(villageId, negativeBundle, reason, strictOptions)
  }

  static async adjustResources(
    villageId: string,
    delta: ResourceBundle,
    reason: StorageLedgerReason,
    options?: AdjustOptions,
  ) {
    const client = options?.client ?? prisma
    return this.runWithClient(client, async (tx) => {
      const village = await tx.village.findUnique({
        where: { id: villageId },
        select: { id: true, wood: true, stone: true, iron: true, gold: true, food: true },
      })

      if (!village) {
        throw new Error(`Village ${villageId} not found`)
      }

      const { totals } = await CapacityService.getVillageCapacitySummary(villageId, tx)
      const updates: Partial<Record<ResourceKey, number>> = {}
      const appliedDelta = StorageService.createEmptyBundle()

      for (const key of RESOURCE_KEYS) {
        const value = delta[key] ?? 0
        if (value === 0) {
          appliedDelta[key] = 0
          continue
        }

        const current = village[key]
        const target = options?.allowNegative ? current + value : Math.max(0, current + value)
        const clamped = Math.min(totals[key] ?? Number.MAX_SAFE_INTEGER, target)

        if (!options?.allowNegative && current + value < 0) {
          throw new Error(`Village ${villageId} lacks ${key} for requested change (${value})`)
        }

        if (clamped !== current) {
          updates[key] = clamped
        }
        appliedDelta[key] = clamped - current
      }

      if (Object.keys(updates).length > 0) {
        await tx.village.update({
          where: { id: villageId },
          data: updates,
        })
      }

      const hasDelta = Object.values(appliedDelta).some((value) => value !== 0)
      if (hasDelta) {
        await tx.villageStorageLedger.create({
          data: {
            villageId,
            woodDelta: appliedDelta.wood,
            stoneDelta: appliedDelta.stone,
            ironDelta: appliedDelta.iron,
            goldDelta: appliedDelta.gold,
            foodDelta: appliedDelta.food,
            reason,
            metadata: options?.metadata,
          },
        })
      }

      return { appliedDelta, totals }
    })
  }

  static calculateTimeToFull(snapshot: StorageSnapshot, productionPerHour: ResourceBundle) {
    const times: Record<ResourceKey, number | null> = {}

    for (const key of RESOURCE_KEYS) {
      const capacity = snapshot.capacities[key]
      const current = snapshot.resources[key]
      const production = productionPerHour[key] ?? 0

      if (production <= 0 || capacity <= current) {
        times[key] = null
      } else {
        const hours = (capacity - current) / production
        times[key] = Math.max(0, hours)
      }
    }

    return times
  }

  private static createEmptyBundle(): Record<ResourceKey, number> {
    return RESOURCE_KEYS.reduce((acc, key) => {
      acc[key] = 0
      return acc
    }, {} as Record<ResourceKey, number>)
  }

  private static runWithClient<T>(client: PrismaCtx, cb: (tx: Prisma.TransactionClient) => Promise<T>) {
    const maybeClient = client as Prisma.TransactionClient & { $transaction?: typeof prisma.$transaction }
    if (typeof (maybeClient as any).$transaction === "function") {
      return (client as typeof prisma).$transaction(cb)
    }
    return cb(client as Prisma.TransactionClient)
  }
}
