import { prisma } from "@/lib/db"
import type { Prisma, ResourceReservation } from "@prisma/client"
import type { ResourceBundle } from "./storage-service"

const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const
type ResourceKey = (typeof RESOURCE_KEYS)[number]
type PrismaCtx = Prisma.TransactionClient | typeof prisma

type ReservationInput = {
  playerId: string
  villageId: string
  label: string
  resources: ResourceBundle
  expiresAt?: Date | null
}

const isActiveReservation = (reservation: Pick<ResourceReservation, "expiresAt" | "fulfilledAt">) => {
  if (reservation.fulfilledAt) return false
  if (reservation.expiresAt && reservation.expiresAt < new Date()) {
    return false
  }
  return true
}

export class ResourceReservationService {
  static async getVillageReservedTotals(
    villageId: string,
    client: PrismaCtx = prisma,
  ): Promise<ResourceBundle> {
    const reservations = await client.resourceReservation.findMany({
      where: {
        villageId,
        fulfilledAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        wood: true,
        stone: true,
        iron: true,
        gold: true,
        food: true,
      },
    })

    return reservations.reduce<ResourceBundle>(
      (totals, reservation) => {
        for (const key of RESOURCE_KEYS) {
          totals[key] = (totals[key] ?? 0) + (reservation[key] ?? 0)
        }
        return totals
      },
      { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 },
    )
  }

  static async createReservation(input: ReservationInput) {
    const bundle = this.sanitizeBundle(input.resources)
    const total = this.getBundleTotal(bundle)
    if (total <= 0) {
      throw new Error("Reservation must include at least one resource")
    }

    const village = await prisma.village.findUnique({
      where: { id: input.villageId },
      select: {
        playerId: true,
        wood: true,
        stone: true,
        iron: true,
        gold: true,
        food: true,
      },
    })

    if (!village) {
      throw new Error("Village not found")
    }
    if (village.playerId !== input.playerId) {
      throw new Error("Cannot reserve resources for another player's village")
    }

    const reservedTotals = await this.getVillageReservedTotals(input.villageId)
    for (const key of RESOURCE_KEYS) {
      const available = (village[key] ?? 0) - (reservedTotals[key] ?? 0)
      if (available < (bundle[key] ?? 0)) {
        throw new Error(`Not enough ${key} to reserve (available: ${available})`)
      }
    }

    return prisma.resourceReservation.create({
      data: {
        playerId: input.playerId,
        villageId: input.villageId,
        label: input.label,
        wood: bundle.wood ?? 0,
        stone: bundle.stone ?? 0,
        iron: bundle.iron ?? 0,
        gold: bundle.gold ?? 0,
        food: bundle.food ?? 0,
        expiresAt: input.expiresAt ?? null,
      },
    })
  }

  static async releaseReservation(reservationId: string, playerId: string) {
    const reservation = await prisma.resourceReservation.findUnique({
      where: { id: reservationId },
      select: { id: true, playerId: true, fulfilledAt: true },
    })

    if (!reservation) {
      throw new Error("Reservation not found")
    }
    if (reservation.playerId !== playerId) {
      throw new Error("You can only manage your own reservations")
    }
    if (reservation.fulfilledAt) {
      return reservation
    }

    return prisma.resourceReservation.update({
      where: { id: reservationId },
      data: { fulfilledAt: new Date() },
    })
  }

  static async listActiveReservations(playerId: string) {
    const reservations = await prisma.resourceReservation.findMany({
      where: {
        playerId,
        fulfilledAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        village: {
          select: {
            id: true,
            name: true,
            x: true,
            y: true,
          },
        },
      },
      orderBy: { reservedAt: "desc" },
    })

    return reservations
  }

  static async getReservedTotalsForPlayer(playerId: string) {
    const reservations = await prisma.resourceReservation.findMany({
      where: {
        playerId,
        fulfilledAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        villageId: true,
        wood: true,
        stone: true,
        iron: true,
        gold: true,
        food: true,
      },
    })

    const map = new Map<
      string,
      ResourceBundle
    >()

    for (const entry of reservations) {
      const current = map.get(entry.villageId) ?? { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }
      for (const key of RESOURCE_KEYS) {
        current[key] = (current[key] ?? 0) + (entry[key] ?? 0)
      }
      map.set(entry.villageId, current)
    }

    return map
  }

  private static sanitizeBundle(bundle: ResourceBundle): ResourceBundle {
    const result: ResourceBundle = {}
    for (const key of RESOURCE_KEYS) {
      const value = bundle[key]
      if (value && value > 0) {
        result[key] = Math.floor(value)
      }
    }
    return result
  }

  private static getBundleTotal(bundle: ResourceBundle) {
    return RESOURCE_KEYS.reduce((sum, key) => sum + Math.max(0, bundle[key] ?? 0), 0)
  }
}
