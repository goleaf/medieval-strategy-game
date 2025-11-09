import { prisma } from "@/lib/db"
import type { Prisma, TradeRoute, TradeRouteLogResult, StorageLedgerReason } from "@prisma/client"
import { ShipmentService } from "./shipment-service"
import { StorageService } from "./storage-service"

type PrismaCtx = Prisma.TransactionClient | typeof prisma

type FixedTimesSchedule = {
  type: "fixed_times"
  times: string[] // HH:mm in UTC
}

type IntervalSchedule = {
  type: "interval"
  everyMinutes: number
}

export type TradeRouteSchedule = FixedTimesSchedule | IntervalSchedule

type CreateTradeRouteParams = {
  sourceVillageId: string
  targetVillageId: string
  bundle: {
    wood?: number
    stone?: number
    iron?: number
    gold?: number
    food?: number
  }
  schedule: TradeRouteSchedule
  skipIfInsufficient?: boolean
  priority?: number
  startsAt?: Date | null
  endsAt?: Date | null
  createdByPlayerId?: string | null
}

export class TradeRouteService {
  static async createRoute(params: CreateTradeRouteParams) {
    const sanitizedBundle = this.sanitizeBundle(params.bundle)
    if (Object.values(sanitizedBundle).every((value) => !value)) {
      throw new Error("Trade route bundle must contain at least one resource")
    }

    const route = await prisma.tradeRoute.create({
      data: {
        sourceVillageId: params.sourceVillageId,
        targetVillageId: params.targetVillageId,
        ...sanitizedBundle,
        scheduleJson: params.schedule,
        skipIfInsufficient: params.skipIfInsufficient ?? true,
        priority: params.priority ?? 0,
        startsAt: params.startsAt ?? null,
        endsAt: params.endsAt ?? null,
        createdByPlayerId: params.createdByPlayerId ?? null,
      },
    })

    const nextRunAt = this.computeNextRun(route)
    if (nextRunAt) {
      await prisma.tradeRoute.update({
        where: { id: route.id },
        data: { nextRunAt },
      })
    }

    return prisma.tradeRoute.findUnique({ where: { id: route.id } })
  }

  static async runDueRoutes(now = new Date()) {
    const routes = await prisma.tradeRoute.findMany({
      where: {
        status: "ACTIVE",
        nextRunAt: { lte: now },
      },
      orderBy: { priority: "desc" },
    })

    for (const route of routes) {
      await this.runRoute(route, now)
    }
  }

  static async runRoute(route: TradeRoute, runTime = new Date()) {
    if (route.status !== "ACTIVE") return
    if (route.endsAt && runTime > route.endsAt) {
      await prisma.tradeRoute.update({
        where: { id: route.id },
        data: { status: "COMPLETED", nextRunAt: null },
      })
      return
    }

    const bundle = this.extractBundle(route)
    const canAfford = await StorageService.canAfford(route.sourceVillageId, bundle)

    if (!canAfford) {
      if (!route.skipIfInsufficient) {
        await this.logRoute(route.id, "SKIPPED_INSUFFICIENT_RESOURCES", {
          reason: "insufficient_resources",
        })
      } else {
        await this.logRoute(route.id, "SKIPPED_INSUFFICIENT_RESOURCES")
      }
      await this.bumpNextRun(route)
      return
    }

    try {
      await ShipmentService.createDirectShipment({
        sourceVillageId: route.sourceVillageId,
        targetVillageId: route.targetVillageId,
        bundle,
        createdBy: "ROUTE",
        ledgerReason: StorageLedgerReason.TRADE_OUT,
        metadata: { routeId: route.id },
      })

      await prisma.tradeRoute.update({
        where: { id: route.id },
        data: { lastRunAt: runTime },
      })

      await this.logRoute(route.id, "SUCCESS")
    } catch (error) {
      await this.logRoute(route.id, "ERROR", {
        message: (error as Error).message,
      })
    } finally {
      await this.bumpNextRun(route)
    }
  }

  static computeNextRun(route: TradeRoute, from: Date = new Date()): Date | null {
    const schedule = this.parseSchedule(route)
    const base =
      route.startsAt && route.startsAt > from ? route.startsAt : from

    if (schedule.type === "fixed_times") {
      const next = this.computeNextFixedTime(schedule.times, base)
      if (!next) return null
      if (route.endsAt && next > route.endsAt) {
        return null
      }
      return next
    }

    const anchor = route.lastRunAt ?? route.startsAt ?? route.createdAt
    const intervalMs = schedule.everyMinutes * 60 * 1000
    const diff = Math.max(0, base.getTime() - anchor.getTime())
    const steps = Math.floor(diff / intervalMs) + 1
    const nextTick = anchor.getTime() + steps * intervalMs
    const estimate = new Date(nextTick)
    if (route.endsAt && estimate > route.endsAt) {
      return null
    }
    return estimate
  }

  private static async bumpNextRun(route: TradeRoute) {
    const refreshed = await prisma.tradeRoute.findUnique({ where: { id: route.id } })
    if (!refreshed) return
    const nextRunAt = this.computeNextRun(refreshed)
    await prisma.tradeRoute.update({
      where: { id: route.id },
      data: { nextRunAt },
    })
  }

  private static parseSchedule(route: TradeRoute): TradeRouteSchedule {
    const payload = route.scheduleJson as TradeRouteSchedule
    if (payload.type === "fixed_times") {
      return {
        type: "fixed_times",
        times: payload.times ?? [],
      }
    }
    if (payload.type === "interval") {
      return {
        type: "interval",
        everyMinutes: Math.max(5, payload.everyMinutes ?? 60),
      }
    }
    throw new Error(`Unsupported trade route schedule for route ${route.id}`)
  }

  private static extractBundle(route: TradeRoute) {
    return {
      wood: route.wood,
      stone: route.stone,
      iron: route.iron,
      gold: route.gold,
      food: route.food,
    }
  }

  private static sanitizeBundle(bundle: CreateTradeRouteParams["bundle"]) {
    return {
      wood: Math.max(0, Math.floor(bundle.wood ?? 0)),
      stone: Math.max(0, Math.floor(bundle.stone ?? 0)),
      iron: Math.max(0, Math.floor(bundle.iron ?? 0)),
      gold: Math.max(0, Math.floor(bundle.gold ?? 0)),
      food: Math.max(0, Math.floor(bundle.food ?? 0)),
    }
  }

  private static computeNextFixedTime(times: string[], from: Date) {
    if (times.length === 0) return null
    const sortedTimes = times
      .map((t) => t.trim())
      .filter(Boolean)
      .sort()

    for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
      const candidateDay = new Date(from)
      candidateDay.setUTCDate(candidateDay.getUTCDate() + dayOffset)

      for (const slot of sortedTimes) {
        const [hours, minutes] = slot.split(":").map((value) => parseInt(value, 10) || 0)
        const candidate = new Date(Date.UTC(candidateDay.getUTCFullYear(), candidateDay.getUTCMonth(), candidateDay.getUTCDate(), hours, minutes))
        if (candidate >= from) {
          return candidate
        }
      }
    }

    const fallback = new Date(from)
    fallback.setUTCDate(fallback.getUTCDate() + 1)
    fallback.setUTCHours(0, 0, 0, 0)
    return fallback
  }

  private static async logRoute(routeId: string, result: TradeRouteLogResult, details?: Record<string, unknown>) {
    await prisma.tradeRouteLog.create({
      data: {
        tradeRouteId: routeId,
        result,
        details,
      },
    })
  }
}
