import { randomUUID } from "crypto"
import { prisma } from "@/lib/db"
import type { EventQueueItem, EventQueueStatus, EventQueueType, Prisma } from "@prisma/client"

const DEFAULT_BATCH_LIMIT = 100

type ScheduleOptions = {
  priority?: number
  dedupeKey?: string
}

export class EventQueueService {
  static async scheduleEvent(
    type: EventQueueType,
    scheduledAt: Date,
    payload?: Prisma.JsonValue,
    options?: ScheduleOptions,
  ) {
    if (options?.dedupeKey) {
      return prisma.eventQueueItem.upsert({
        where: { dedupeKey: options.dedupeKey },
        update: {
          scheduledAt,
          payload,
          status: "PENDING",
          attempts: 0,
          lastError: null,
          priority: options.priority ?? 0,
        },
        create: {
          type,
          scheduledAt,
          payload,
          priority: options.priority ?? 0,
          dedupeKey: options.dedupeKey,
        },
      })
    }

    return prisma.eventQueueItem.create({
      data: {
        type,
        scheduledAt,
        payload,
        priority: options?.priority ?? 0,
      },
    })
  }

  static async ensureRecurring(
    type: EventQueueType,
    intervalMs: number,
    payload?: Prisma.JsonValue,
    options?: { priority?: number; dedupeKey?: string },
  ) {
    const dedupeKey = options?.dedupeKey ?? `recurring:${type}`
    const scheduledAt = new Date(Date.now() + intervalMs)
    return this.scheduleEvent(type, scheduledAt, payload, { ...options, dedupeKey })
  }

  static async pullDueEvents(params?: {
    limit?: number
    now?: Date
    processorId?: string
  }): Promise<EventQueueItem[]> {
    const limit = params?.limit ?? DEFAULT_BATCH_LIMIT
    const now = params?.now ?? new Date()
    const processorId = params?.processorId ?? randomUUID()

    return prisma.$transaction(async (tx) => {
      const candidates = await tx.eventQueueItem.findMany({
        where: {
          status: "PENDING",
          scheduledAt: { lte: now },
        },
        orderBy: [
          { scheduledAt: "asc" },
          { priority: "desc" },
          { createdAt: "asc" },
        ],
        take: limit,
      })

      const claimed: EventQueueItem[] = []
      for (const event of candidates) {
        const result = await tx.eventQueueItem.updateMany({
          where: {
            id: event.id,
            status: "PENDING",
          },
          data: {
            status: "PROCESSING",
            lockedAt: now,
            lockedBy: processorId,
          },
        })

        if (result.count === 1) {
          claimed.push({
            ...event,
            status: "PROCESSING",
            lockedAt: now,
            lockedBy: processorId,
          })
        }
      }

      return claimed
    })
  }

  static async markComplete(id: string) {
    await prisma.eventQueueItem.update({
      where: { id },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    })
  }

  static async markFailed(id: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.eventQueueItem.update({
      where: { id },
      data: {
        status: "FAILED",
        processedAt: new Date(),
        attempts: { increment: 1 },
        lastError: message,
        lockedAt: null,
        lockedBy: null,
      },
    })
  }

  static async requeue(id: string, scheduledAt: Date, status: EventQueueStatus = "PENDING") {
    await prisma.eventQueueItem.update({
      where: { id },
      data: {
        status,
        scheduledAt,
        lockedAt: null,
        lockedBy: null,
      },
    })
  }

  static async releaseStaleLocks(maxAgeMs: number) {
    const cutoff = new Date(Date.now() - maxAgeMs)
    await prisma.eventQueueItem.updateMany({
      where: {
        status: "PROCESSING",
        lockedAt: { lte: cutoff },
      },
      data: {
        status: "PENDING",
        lockedAt: null,
        lockedBy: null,
      },
    })
  }

  static async removeByDedupeKey(dedupeKey: string) {
    await prisma.eventQueueItem.deleteMany({
      where: { dedupeKey },
    })
  }
}
