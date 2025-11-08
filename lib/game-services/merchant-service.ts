import { prisma } from "@/lib/db"
import type { GameTribe, Prisma } from "@prisma/client"
import type { ResourceBundle } from "./storage-service"

type PrismaCtx = Prisma.TransactionClient | typeof prisma

const BASE_MERCHANTS = 2
const MERCHANTS_PER_LEVEL = 2

const MERCHANT_CONFIG: Record<GameTribe, { capacity: number; tilesPerHour: number }> = {
  ROMANS: { capacity: 500, tilesPerHour: 16 },
  TEUTONS: { capacity: 1000, tilesPerHour: 12 },
  GAULS: { capacity: 750, tilesPerHour: 14 },
  HUNS: { capacity: 800, tilesPerHour: 18 },
  EGYPTIANS: { capacity: 900, tilesPerHour: 14 },
  SPARTANS: { capacity: 600, tilesPerHour: 17 },
}

export type MerchantSnapshot = {
  villageId: string
  marketplaceLevel: number
  totalMerchants: number
  busyMerchants: number
  reservedMerchants: number
  availableMerchants: number
  capacityPerMerchant: number
  tilesPerHour: number
  tribe: GameTribe
}

export class MerchantService {
  static async getSnapshot(villageId: string, client: PrismaCtx = prisma): Promise<MerchantSnapshot> {
    const [building, village, state] = await Promise.all([
      client.building.findUnique({
        where: {
          villageId_type: {
            villageId,
            type: "MARKETPLACE",
          },
        },
        select: { level: true },
      }),
      client.village.findUnique({
        where: { id: villageId },
        select: {
          id: true,
          player: {
            select: {
              gameTribe: true,
            },
          },
        },
      }),
      client.merchantState.findUnique({
        where: { villageId },
      }),
    ])

    if (!village) {
      throw new Error(`Village ${villageId} not found`)
    }

    const tribe = village.player?.gameTribe ?? "ROMANS"
    const config = MERCHANT_CONFIG[tribe] ?? MERCHANT_CONFIG.ROMANS
    const marketplaceLevel = building?.level ?? 0
    const totalMerchants = this.calculateTotalMerchants(marketplaceLevel)
    const busyMerchants = state?.merchantsBusy ?? 0
    const reservedMerchants = state?.merchantsReserved ?? 0
    const availableMerchants = Math.max(0, totalMerchants - busyMerchants - reservedMerchants)

    return {
      villageId,
      marketplaceLevel,
      totalMerchants,
      busyMerchants,
      reservedMerchants,
      availableMerchants,
      capacityPerMerchant: config.capacity,
      tilesPerHour: config.tilesPerHour,
      tribe,
    }
  }

  static calculateRequiredMerchants(bundle: ResourceBundle, capacityPerMerchant: number): number {
    const total = Object.values(bundle).reduce((sum, value) => sum + Math.max(0, value ?? 0), 0)
    if (total === 0) return 0
    return Math.max(1, Math.ceil(total / capacityPerMerchant))
  }

  static async reserveMerchants(villageId: string, amount: number, client: PrismaCtx = prisma) {
    if (amount <= 0) return this.getSnapshot(villageId, client)

    return this.runWithClient(client, async (tx) => {
      const snapshot = await this.getSnapshot(villageId, tx)
      if (snapshot.availableMerchants < amount) {
        throw new Error(`Village ${villageId} does not have ${amount} free merchants`)
      }

      await tx.merchantState.upsert({
        where: { villageId },
        update: {
          merchantsBusy: { increment: amount },
          lastReservationAt: new Date(),
        },
        create: {
          villageId,
          merchantsBusy: amount,
          merchantsReserved: 0,
          lastReservationAt: new Date(),
        },
      })

      return {
        ...snapshot,
        busyMerchants: snapshot.busyMerchants + amount,
        availableMerchants: snapshot.availableMerchants - amount,
      }
    })
  }

  static async releaseMerchants(villageId: string, amount: number, client: PrismaCtx = prisma) {
    if (amount <= 0) return this.getSnapshot(villageId, client)

    return this.runWithClient(client, async (tx) => {
      const state = await tx.merchantState.findUnique({
        where: { villageId },
      })

      if (!state) {
        return this.getSnapshot(villageId, tx)
      }

      const newBusy = Math.max(0, state.merchantsBusy - amount)
      await tx.merchantState.update({
        where: { villageId },
        data: {
          merchantsBusy: newBusy,
        },
      })

      return this.getSnapshot(villageId, tx)
    })
  }

  static async clearReservations(villageId: string, client: PrismaCtx = prisma) {
    await client.merchantState.updateMany({
      where: { villageId },
      data: {
        merchantsReserved: 0,
      },
    })
  }

  static calculateTotalMerchants(marketplaceLevel: number) {
    if (marketplaceLevel <= 0) return 0
    return BASE_MERCHANTS + marketplaceLevel * MERCHANTS_PER_LEVEL
  }

  private static runWithClient<T>(client: PrismaCtx, cb: (tx: Prisma.TransactionClient) => Promise<T>) {
    const maybeClient = client as Prisma.TransactionClient & { $transaction?: typeof prisma.$transaction }
    if (typeof (maybeClient as any).$transaction === "function") {
      return (client as typeof prisma).$transaction(cb)
    }
    return cb(client as Prisma.TransactionClient)
  }
}
