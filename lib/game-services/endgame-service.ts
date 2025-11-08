import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import {
  NotificationSeverity,
  NotificationType,
} from "@prisma/client"

/**
 * Lightweight runtime definitions mirroring the Prisma enums declared in the schema.
 * The generated Prisma Client is not available inside the execution environment,
 * so we rely on the string literal versions to keep the logic type-safe enough for
 * linting while still matching the database values exactly.
 */
export const ENDGAME_TYPE = {
  NONE: "NONE",
  DOMINATION: "DOMINATION",
  RUNE_WARS: "RUNE_WARS",
} as const

export const ENDGAME_BASELINE = {
  PLAYER_OWNED: "PLAYER_OWNED",
  PLAYER_AND_BARBARIAN: "PLAYER_AND_BARBARIAN",
  ALL_VILLAGES: "ALL_VILLAGES",
} as const

export const ENDGAME_STATUS = {
  IDLE: "IDLE",
  WARNING: "WARNING",
  HOLDING: "HOLDING",
  COMPLETED: "COMPLETED",
} as const

export const RUNE_TIMER_BEHAVIOR = {
  RESET_ON_LOSS: "RESET_ON_LOSS",
  PAUSE_ON_LOSS: "PAUSE_ON_LOSS",
} as const

export type EndgameType = (typeof ENDGAME_TYPE)[keyof typeof ENDGAME_TYPE]
export type EndgameBaseline =
  (typeof ENDGAME_BASELINE)[keyof typeof ENDGAME_BASELINE]
export type EndgameStatus = (typeof ENDGAME_STATUS)[keyof typeof ENDGAME_STATUS]
export type RuneTimerBehavior =
  (typeof RUNE_TIMER_BEHAVIOR)[keyof typeof RUNE_TIMER_BEHAVIOR]

/**
 * Helper describing the state returned by `collectDominanceStats`.
 */
interface DominanceStats {
  totalVillages: number
  tribeVillageCounts: Map<string, number>
}

/**
 * Snapshot returned by `evaluateRuneVillages` summarising the rune requirement
 * progress for the currently leading tribe.
 */
interface RuneEvaluation {
  controlCount: number
  readyCount: number
}

interface RuneVillageSnapshot {
  id: string
  holdRequirementHours: number | null
  holdStartedAt: Date | null
  holdEndsAt: Date | null
  controllingTribeId: string | null
  lastContestedAt: Date | null
  village: {
    player: {
      tribeId: string | null
    } | null
  }
}

/**
 * Notification payload used to emit admin alerts without duplicating code.
 */
interface AdminNotificationPayload {
  title: string
  message: string
  severity: NotificationSeverity
}

/**
 * Centralised service that keeps the world endgame configuration in sync with
 * the live game state during the scheduled tick loop.
 */
export class EndgameService {
  /**
   * High level evaluation entry point called from the game tick once per cycle.
   * The routine loads the configured endgame, computes tribe dominance, keeps
   * rune objectives up to date, and manages hold timers or victory triggers.
   */
  static async evaluateWorldEndgame(now: Date = new Date()): Promise<void> {
    // Pull the endgame configuration together with the latest state snapshot.
    const prismaAny = prisma as Record<string, any>
    const hasDelegates =
      prismaAny.endgameConfig &&
      typeof prismaAny.endgameConfig.findFirst === "function" &&
      prismaAny.endgameState &&
      prismaAny.endgameRuneVillage

    if (!hasDelegates) {
      console.warn(
        "[EndgameService] Prisma client has not been regenerated for endgame tables; skipping evaluation.",
      )
      return
    }

    const config = await prismaAny.endgameConfig.findFirst({
      include: {
        states: { orderBy: { createdAt: "desc" }, take: 1 },
        runeVillages: {
          include: {
            village: {
              select: {
                id: true,
                name: true,
                x: true,
                y: true,
                player: {
                  select: {
                    id: true,
                    tribeId: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!config) {
      return
    }

    // Skip early evaluation if the world is configured without an endgame or if
    // an explicit start date has not yet been reached.
    if (config.type === ENDGAME_TYPE.NONE) {
      return
    }
    if (config.earliestStart && now < config.earliestStart) {
      return
    }

    const state =
      config.states[0] ??
      (await prismaAny.endgameState.create({
        data: {
          endgameConfigId: config.id,
          status: ENDGAME_STATUS.IDLE,
        },
      }))

    const notifications: AdminNotificationPayload[] = []

    // Compute tribe control progress against the configured dominance baseline.
    const dominance = await this.collectDominanceStats(
      config.dominanceBaseline as EndgameBaseline,
    )

    if (dominance.totalVillages === 0) {
      if (state.status !== ENDGAME_STATUS.IDLE) {
        await prismaAny.endgameState.update({
          where: { id: state.id },
          data: {
            status: ENDGAME_STATUS.IDLE,
            leadingTribeId: null,
            leadingPercent: 0,
            countedVillages: 0,
            runeControlCount: 0,
            holdStartedAt: null,
            holdEndsAt: null,
          },
        })
      }
      return
    }

    const [leadingTribeId, leadingCount] = this.resolveLeader(dominance)
    const leadingPercent = leadingTribeId
      ? leadingCount / dominance.totalVillages
      : 0

    let status: EndgameStatus = state.status as EndgameStatus
    let holdStartedAt = state.holdStartedAt ?? null
    let holdEndsAt = state.holdEndsAt ?? null
    let warningEmittedAt = state.warningEmittedAt ?? null
    let completedAt = state.completedAt ?? null

    // Evaluate rune objectives when Rune Wars are enabled. Even if the world is
    // flagged as pure domination, rune tracking gracefully resolves to zero.
    const runeEvaluation = await this.evaluateRuneVillages({
      configId: config.id,
      runeVillages: config.runeVillages,
      leadingTribeId,
      holdHours: config.runeHoldHours,
      timerBehavior: config.runeTimerBehavior as RuneTimerBehavior,
      now,
    })

    const dominanceMet =
      leadingPercent >= (config.dominanceThreshold ?? 0) && leadingTribeId
    const runeRequirementMet =
      (config.runeRequirement ?? 0) === 0 ||
      runeEvaluation.controlCount >= (config.runeRequirement ?? 0)
    const runeHoldMet =
      (config.runeRequirement ?? 0) === 0 ||
      runeEvaluation.readyCount >= (config.runeRequirement ?? 0)

    // Broadcast public warnings once the configured warning distance is crossed.
    if (
      leadingTribeId &&
      leadingPercent >=
        Math.max(
          0,
          (config.dominanceThreshold ?? 0) -
            (config.dominanceWarningDistance ?? 0),
        )
    ) {
      if (!warningEmittedAt || state.leadingTribeId !== leadingTribeId) {
        warningEmittedAt = now
        notifications.push({
          severity: NotificationSeverity.warning,
          title: "Endgame warning threshold reached",
          message: `Tribe ${leadingTribeId} is within striking distance of the domination threshold at ${(leadingPercent * 100).toFixed(2)}%.`,
        })
      }
      if (status === ENDGAME_STATUS.IDLE) {
        status = ENDGAME_STATUS.WARNING
      }
    }

    // Manage hold timers once dominance has been achieved by a tribe.
    if (dominanceMet) {
      const holdHours = config.dominanceHoldHours ?? 0
      if (
        !holdStartedAt ||
        state.leadingTribeId !== leadingTribeId ||
        status !== ENDGAME_STATUS.HOLDING
      ) {
        holdStartedAt = now
        holdEndsAt = holdHours > 0 ? this.addHours(now, holdHours) : now
        status = ENDGAME_STATUS.HOLDING
        notifications.push({
          severity: NotificationSeverity.info,
          title: "Domination hold started",
          message: `Tribe ${leadingTribeId} met the domination threshold at ${(leadingPercent * 100).toFixed(2)}% and must now hold for ${holdHours} hours.`,
        })
      } else if (holdHours > 0 && holdStartedAt) {
        holdEndsAt = this.addHours(holdStartedAt, holdHours)
      }
    } else {
      if (status === ENDGAME_STATUS.HOLDING) {
        notifications.push({
          severity: NotificationSeverity.warning,
          title: "Domination hold interrupted",
          message: `The domination hold timer for tribe ${state.leadingTribeId} was reset because they fell below ${(config.dominanceThreshold ?? 0) * 100}%.`,
        })
      }
      status = leadingTribeId ? ENDGAME_STATUS.WARNING : ENDGAME_STATUS.IDLE
      holdStartedAt = null
      holdEndsAt = null
    }

    const holdComplete =
      !holdEndsAt || (holdStartedAt && now >= holdEndsAt && dominanceMet)

    if (dominanceMet && holdComplete && runeRequirementMet && runeHoldMet) {
      if (status !== ENDGAME_STATUS.COMPLETED) {
        status = ENDGAME_STATUS.COMPLETED
        completedAt = now
        notifications.push({
          severity: NotificationSeverity.critical,
          title: "World victory achieved",
          message: `Tribe ${leadingTribeId} fulfilled all configured victory conditions. The world can now be closed or archived.`,
        })
      }
    } else {
      completedAt = null
      if (status === ENDGAME_STATUS.COMPLETED) {
        status = ENDGAME_STATUS.HOLDING
      }
    }

    await prismaAny.endgameState.update({
      where: { id: state.id },
      data: {
        status,
        leadingTribeId: leadingTribeId ?? null,
        leadingPercent,
        countedVillages: dominance.totalVillages,
        runeControlCount: runeEvaluation.controlCount,
        warningEmittedAt,
        holdStartedAt,
        holdEndsAt,
        completedAt,
      },
    })

    if (notifications.length > 0) {
      await this.dispatchNotifications(notifications)
    }
  }

  /**
   * Resolve the tribe currently leading the domination race.
   */
  private static resolveLeader(stats: DominanceStats): [string | null, number] {
    let leader: string | null = null
    let count = 0

    for (const [tribeId, villageCount] of stats.tribeVillageCounts.entries()) {
      if (villageCount > count) {
        leader = tribeId
        count = villageCount
      }
    }

    return [leader, count]
  }

  /**
   * Aggregate domination stats according to the configured baseline.
   */
  private static async collectDominanceStats(
    baseline: EndgameBaseline,
  ): Promise<DominanceStats> {
    const where: Prisma.VillageWhereInput = {}

    if (baseline === ENDGAME_BASELINE.PLAYER_OWNED) {
      where.player = { isDeleted: false }
    } else if (baseline === ENDGAME_BASELINE.PLAYER_AND_BARBARIAN) {
      where.player = { isDeleted: false }
    }

    const villages = await prisma.village.findMany({
      where,
      select: {
        player: {
          select: {
            id: true,
            tribeId: true,
            isDeleted: true,
          },
        },
      },
    })

    const tribeVillageCounts = new Map<string, number>()

    for (const village of villages) {
      const tribeId = village.player?.tribeId
      if (!tribeId) continue
      tribeVillageCounts.set(
        tribeId,
        (tribeVillageCounts.get(tribeId) ?? 0) + 1,
      )
    }

    return { totalVillages: villages.length, tribeVillageCounts }
  }

  /**
   * Update rune village ownership, handle timer resets, and return control stats.
   */
  private static async evaluateRuneVillages(params: {
    configId: string
    runeVillages: RuneVillageSnapshot[]
    leadingTribeId: string | null
    holdHours: number | null
    timerBehavior: RuneTimerBehavior
    now: Date
  }): Promise<RuneEvaluation> {
    const { runeVillages, leadingTribeId, holdHours, timerBehavior, now } =
      params

    if (!runeVillages.length) {
      return { controlCount: 0, readyCount: 0 }
    }

    const updates: Prisma.EndgameRuneVillageUpdateArgs[] = []
    let controlCount = 0
    let readyCount = 0

    for (const rune of runeVillages) {
      const tribeId = rune.village.player?.tribeId ?? null
      let holdStartedAt = rune.holdStartedAt ?? null
      let holdEndsAt = rune.holdEndsAt ?? null
      let controllingTribeId = rune.controllingTribeId ?? null
      let lastContestedAt = rune.lastContestedAt ?? null
      let requiresUpdate = false

      if (tribeId !== controllingTribeId) {
        controllingTribeId = tribeId
        lastContestedAt = now
        holdStartedAt = tribeId ? now : null
        if (tribeId && (rune.holdRequirementHours ?? holdHours ?? 0) > 0) {
          const hours = rune.holdRequirementHours ?? holdHours ?? 0
          holdEndsAt = this.addHours(now, hours)
        } else {
          holdEndsAt = tribeId ? now : null
        }
        requiresUpdate = true
      }

      if (
        tribeId !== leadingTribeId &&
        tribeId !== controllingTribeId &&
        timerBehavior === RUNE_TIMER_BEHAVIOR.RESET_ON_LOSS
      ) {
        if (holdStartedAt || holdEndsAt) {
          holdStartedAt = null
          holdEndsAt = null
          requiresUpdate = true
        }
      }

      const effectiveHoldHours = rune.holdRequirementHours ?? holdHours ?? 0

      if (tribeId && tribeId === leadingTribeId) {
        controlCount += 1
        if (!holdStartedAt) {
          holdStartedAt = now
          requiresUpdate = true
        }
        if (effectiveHoldHours > 0 && holdStartedAt) {
          holdEndsAt = this.addHours(holdStartedAt, effectiveHoldHours)
          requiresUpdate = true
          if (holdEndsAt && now >= holdEndsAt) {
            readyCount += 1
          }
        } else {
          readyCount += 1
        }
      }

      if (requiresUpdate) {
        updates.push({
          where: { id: rune.id },
          data: {
            controllingTribeId,
            holdStartedAt,
            holdEndsAt,
            lastContestedAt,
          },
        })
      }
    }

    if (updates.length > 0) {
      await (prisma as any).$transaction(
        updates.map((update) =>
          (prisma as any).endgameRuneVillage.update(update),
        ),
      )
    }

    return { controlCount, readyCount }
  }

  /**
   * Persist admin notifications when important thresholds are crossed.
   */
  private static async dispatchNotifications(
    notifications: AdminNotificationPayload[],
  ): Promise<void> {
    const admins = await prisma.admin.findMany({ select: { id: true } })
    if (!admins.length) {
      return
    }

    const data = notifications.flatMap((notification) =>
      admins.map((admin) => ({
        adminId: admin.id,
        type: NotificationType.SYSTEM,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
      })),
    )

    await prisma.adminNotification.createMany({ data })
  }

  /**
   * Utility that returns a new Date advanced by the requested number of hours.
   */
  private static addHours(base: Date, hours: number): Date {
    return new Date(base.getTime() + hours * 60 * 60 * 1000)
  }
}
