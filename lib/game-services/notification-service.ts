import { prisma } from "@/lib/db"
import type {
  NotificationPreference as NotificationPreferenceModel,
  NotificationPriority as PrismaNotificationPriority,
  PlayerNotificationType as PrismaNotificationType,
  NotificationEmailFrequency,
} from "@prisma/client"
import {
  DEFAULT_TYPE_SETTINGS,
  NOTIFICATION_PRIORITY_ORDER,
  NOTIFICATION_SOUND_PRESETS,
  NOTIFICATION_TYPE_CONFIG,
  type NotificationPriority,
  type NotificationSoundPreset,
  type NotificationTypePreference,
  type PlayerNotificationType,
  type NotificationTypeConfig,
} from "@/lib/config/notification-types"

export type NotificationCreateInput = {
  playerId: string
  type: PlayerNotificationType | PrismaNotificationType
  title?: string
  message?: string
  priority?: NotificationPriority | PrismaNotificationPriority
  metadata?: Record<string, unknown>
  actionUrl?: string
  sourceId?: string | null
  requiresAcknowledgement?: boolean
  channelsOverride?: Record<string, unknown>
  muteOverride?: boolean
  expiresAt?: Date | null
}

export type NotificationFilters = {
  priority?: NotificationPriority | PrismaNotificationPriority | "ALL"
  type?: PlayerNotificationType | PrismaNotificationType | "ALL"
  includeRead?: boolean
  includeMuted?: boolean
  limit?: number
}

export type NotificationRecord = {
  id: string
  type: PlayerNotificationType
  title: string
  message: string
  createdAt: string
  priority: NotificationPriority
  isRead: boolean
  requiresAcknowledgement: boolean
  acknowledgedAt: string | null
  muted: boolean
  actionUrl?: string | null
  metadata?: Record<string, unknown>
  channels?: Record<string, unknown> | null
}

export type NotificationFeedPayload = {
  notifications: NotificationRecord[]
  unreadCount: number
  priorityCounts: Record<NotificationPriority, { total: number; unread: number }>
  typeCounts: Record<PlayerNotificationType, { total: number; unread: number }>
}

export type QuietHourPreference = {
  enabled: boolean
  start: string | null
  end: string | null
}

export type NotificationPreferencesDTO = {
  importanceThreshold: NotificationPriority
  desktopEnabled: boolean
  mobilePushEnabled: boolean
  emailFrequency: NotificationEmailFrequency
  quietHours: QuietHourPreference
  suppressNonCriticalDuringQuietHours: boolean
  typeSettings: Record<PlayerNotificationType, NotificationTypePreference>
  soundProfiles: Record<NotificationPriority, NotificationSoundPreset>
  lastDigestAt?: string | null
}

export type NotificationPreferenceUpdateInput = Partial<{
  importanceThreshold: NotificationPriority
  desktopEnabled: boolean
  mobilePushEnabled: boolean
  emailFrequency: NotificationEmailFrequency
  suppressNonCriticalDuringQuietHours: boolean
  quietHours: {
    enabled: boolean
    start?: string | null
    end?: string | null
  }
  typeSettings: Partial<Record<PlayerNotificationType, NotificationTypePreference>>
  soundProfiles: Partial<Record<NotificationPriority, NotificationSoundPreset>>
}>

const PRIORITY_RANK: Record<NotificationPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

const PRIORITY_DEFAULT_SOUNDS: Record<NotificationPriority, NotificationSoundPreset> = {
  CRITICAL: "siren",
  HIGH: "drumline",
  MEDIUM: "ping",
  LOW: "chime",
}

const MINUTES_PER_DAY = 24 * 60

function minutesFromTime(time: string | null | undefined): number | null {
  if (!time) return null
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return (hours % 24) * 60 + Math.min(59, Math.max(0, minutes))
}

function timeFromMinutes(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const normalized = ((value % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function normalizeTypeSettings(rawSettings: unknown): Record<PlayerNotificationType, NotificationTypePreference> {
  const fallback = JSON.parse(JSON.stringify(DEFAULT_TYPE_SETTINGS)) as Record<
    PlayerNotificationType,
    NotificationTypePreference
  >
  if (!rawSettings || typeof rawSettings !== "object") {
    return fallback
  }
  const entries = Object.entries(DEFAULT_TYPE_SETTINGS).map(([type, defaults]) => {
    const current = (rawSettings as Record<string, NotificationTypePreference | undefined>)[type]
    if (!current) return [type, defaults]
    return [
      type,
      {
        enabled: current.enabled ?? true,
        sound: (NOTIFICATION_SOUND_PRESETS.includes(current.sound as NotificationSoundPreset)
          ? current.sound
          : defaults.sound) as NotificationSoundPreset,
        channels: {
          popup: current.channels?.popup ?? defaults.channels.popup,
          sound: current.channels?.sound ?? defaults.channels.sound,
          desktop: current.channels?.desktop ?? defaults.channels.desktop,
          push: current.channels?.push ?? defaults.channels.push,
          email: current.channels?.email ?? defaults.channels.email,
        },
      },
    ]
  })
  return Object.fromEntries(entries) as Record<PlayerNotificationType, NotificationTypePreference>
}

function normalizeSoundProfiles(raw: unknown): Record<NotificationPriority, NotificationSoundPreset> {
  const base = { ...PRIORITY_DEFAULT_SOUNDS }
  if (!raw || typeof raw !== "object") {
    return base
  }
  for (const [priority, sound] of Object.entries(raw as Record<string, unknown>)) {
    if (NOTIFICATION_PRIORITY_ORDER.includes(priority as NotificationPriority) &&
        NOTIFICATION_SOUND_PRESETS.includes(sound as NotificationSoundPreset)) {
      base[priority as NotificationPriority] = sound as NotificationSoundPreset
    }
  }
  return base
}

export class NotificationService {
  private static ensurePreferenceRecordPromise: Map<string, Promise<NotificationPreferenceModel>> = new Map()

  private static priorityRank(value: NotificationPriority | PrismaNotificationPriority): number {
    const key = value as NotificationPriority
    return PRIORITY_RANK[key] ?? 0
  }

  private static async ensurePreferenceRecord(playerId: string) {
    if (!this.ensurePreferenceRecordPromise.has(playerId)) {
      const promise = prisma.notificationPreference.upsert({
        where: { playerId },
        create: {
          playerId,
          typeSettings: DEFAULT_TYPE_SETTINGS,
          soundProfiles: PRIORITY_DEFAULT_SOUNDS,
        },
        update: {},
      })
      this.ensurePreferenceRecordPromise.set(playerId, promise)
      try {
        const record = await promise
        return record
      } finally {
        this.ensurePreferenceRecordPromise.delete(playerId)
      }
    }
    return this.ensurePreferenceRecordPromise.get(playerId)!
  }

  static async getPreferences(playerId: string): Promise<NotificationPreferencesDTO> {
    const record =
      (await prisma.notificationPreference.findUnique({
        where: { playerId },
      })) ?? (await this.ensurePreferenceRecord(playerId))

    const typeSettings = normalizeTypeSettings(record.typeSettings)
    const soundProfiles = normalizeSoundProfiles(record.soundProfiles)

    return {
      importanceThreshold: record.importanceThreshold as NotificationPriority,
      desktopEnabled: record.desktopEnabled,
      mobilePushEnabled: record.mobilePushEnabled,
      emailFrequency: record.emailFrequency,
      quietHours: {
        enabled: record.quietHoursEnabled,
        start: timeFromMinutes(record.quietHoursStart),
        end: timeFromMinutes(record.quietHoursEnd),
      },
      suppressNonCriticalDuringQuietHours: record.suppressNonCriticalDuringQuietHours,
      typeSettings,
      soundProfiles,
      lastDigestAt: record.lastDigestAt ? record.lastDigestAt.toISOString() : null,
    }
  }

  static async updatePreferences(
    playerId: string,
    payload: NotificationPreferenceUpdateInput,
  ): Promise<NotificationPreferencesDTO> {
    await this.ensurePreferenceRecord(playerId)
    const updateData: Record<string, unknown> = {}

    if (payload.importanceThreshold) {
      updateData.importanceThreshold = payload.importanceThreshold
    }
    if (payload.desktopEnabled !== undefined) {
      updateData.desktopEnabled = payload.desktopEnabled
    }
    if (payload.mobilePushEnabled !== undefined) {
      updateData.mobilePushEnabled = payload.mobilePushEnabled
    }
    if (payload.emailFrequency) {
      updateData.emailFrequency = payload.emailFrequency
    }
    if (payload.suppressNonCriticalDuringQuietHours !== undefined) {
      updateData.suppressNonCriticalDuringQuietHours = payload.suppressNonCriticalDuringQuietHours
    }
    if (payload.quietHours) {
      updateData.quietHoursEnabled = payload.quietHours.enabled
      if (payload.quietHours.start !== undefined) {
        updateData.quietHoursStart = minutesFromTime(payload.quietHours.start)
      }
      if (payload.quietHours.end !== undefined) {
        updateData.quietHoursEnd = minutesFromTime(payload.quietHours.end)
      }
    }
    if (payload.typeSettings) {
      const current = await this.getPreferences(playerId)
      const merged = { ...current.typeSettings }
      for (const [type, config] of Object.entries(payload.typeSettings)) {
        if (!config) continue
        const safeType = type as PlayerNotificationType
        const existing = merged[safeType] ?? DEFAULT_TYPE_SETTINGS[safeType]
        merged[safeType] = {
          enabled: config.enabled ?? existing.enabled,
          sound: config.sound ?? existing.sound,
          channels: {
            popup: config.channels?.popup ?? existing.channels?.popup,
            sound: config.channels?.sound ?? existing.channels?.sound,
            desktop: config.channels?.desktop ?? existing.channels?.desktop,
            push: config.channels?.push ?? existing.channels?.push,
            email: config.channels?.email ?? existing.channels?.email,
          },
        }
      }
      updateData.typeSettings = merged
    }
    if (payload.soundProfiles) {
      const current = await this.getPreferences(playerId)
      updateData.soundProfiles = { ...current.soundProfiles, ...payload.soundProfiles }
    }

    await prisma.notificationPreference.update({
      where: { playerId },
      data: updateData,
    })

    return this.getPreferences(playerId)
  }

  private static isWithinQuietHours(record: NotificationPreferenceModel): boolean {
    if (!record.quietHoursEnabled) return false
    const start = record.quietHoursStart ?? null
    const end = record.quietHoursEnd ?? null
    if (start === null || end === null) return false
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    if (start <= end) {
      return minutes >= start && minutes < end
    }
    // Wraps past midnight
    return minutes >= start || minutes < end
  }

  private static async resolvePreferenceRecord(playerId: string) {
    return prisma.notificationPreference.findUnique({
      where: { playerId },
    })
  }

  private static shouldMute({
    type,
    priority,
    preference,
  }: {
    type: PlayerNotificationType
    priority: NotificationPriority
    preference: NotificationPreferenceModel
  }) {
    const typeSettings = normalizeTypeSettings(preference.typeSettings)
    const typePreference = typeSettings[type]
    if (!typePreference?.enabled) {
      return true
    }
    const thresholdRank = this.priorityRank(preference.importanceThreshold as NotificationPriority)
    const notificationRank = this.priorityRank(priority)
    if (notificationRank < thresholdRank) {
      return true
    }

    if (
      preference.suppressNonCriticalDuringQuietHours &&
      this.isWithinQuietHours(preference) &&
      priority !== "CRITICAL"
    ) {
      return true
    }

    return false
  }

  static async emit(payload: NotificationCreateInput) {
    const type = payload.type as PlayerNotificationType
    const config: NotificationTypeConfig | undefined = NOTIFICATION_TYPE_CONFIG[type]
    if (!config) {
      throw new Error(`Unsupported notification type: ${type}`)
    }

    const preference =
      (await this.resolvePreferenceRecord(payload.playerId)) ??
      (await this.ensurePreferenceRecord(payload.playerId))

    const priority = (payload.priority ?? config.priority) as NotificationPriority
    const muted = payload.muteOverride ?? this.shouldMute({ type, priority, preference })
    const requiresAcknowledgement =
      payload.requiresAcknowledgement ?? config.persistUntilAck ?? priority === "CRITICAL" || priority === "HIGH"

    await prisma.playerNotification.create({
      data: {
        playerId: payload.playerId,
        type,
        priority,
        title: payload.title ?? config.label,
        message: payload.message ?? config.description,
        metadata: payload.metadata ?? {},
        actionUrl: payload.actionUrl,
        sourceId: payload.sourceId ?? null,
        requiresAcknowledgement,
        channels: payload.channelsOverride ?? config.defaultChannels,
        muted,
        expiresAt: payload.expiresAt ?? null,
      },
    })
  }

  static async markAsRead(notificationId: string, playerId: string) {
    await prisma.playerNotification.updateMany({
      where: { id: notificationId, playerId },
      data: {
        isRead: true,
        readAt: new Date(),
        acknowledgedAt: new Date(),
      },
    })
  }

  static async markAllAsRead(playerId: string): Promise<number> {
    const result = await prisma.playerNotification.updateMany({
      where: { playerId, isRead: false },
      data: { isRead: true, readAt: new Date(), acknowledgedAt: new Date() },
    })
    return result.count
  }

  static async getFeed(playerId: string, filters: NotificationFilters = {}): Promise<NotificationFeedPayload> {
    await this.ensurePreferenceRecord(playerId)
    const whereClause: Record<string, unknown> = { playerId }
    if (filters.priority && filters.priority !== "ALL") {
      whereClause.priority = filters.priority
    }
    if (filters.type && filters.type !== "ALL") {
      whereClause.type = filters.type
    }
    if (!filters.includeMuted) {
      whereClause.muted = false
    }
    if (!filters.includeRead) {
      whereClause.isRead = false
    }

    const notifications = await prisma.playerNotification.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: filters.limit ?? 50,
    })

    const unreadCountPromise = prisma.playerNotification.count({
      where: { playerId, isRead: false },
    })

    const priorityGroupsPromise = prisma.playerNotification.groupBy({
      by: ["priority", "isRead"],
      where: { playerId },
      _count: { _all: true },
    })

    const typeGroupsPromise = prisma.playerNotification.groupBy({
      by: ["type", "isRead"],
      where: { playerId },
      _count: { _all: true },
    })

    const [unreadCount, priorityGroups, typeGroups] = await Promise.all([
      unreadCountPromise,
      priorityGroupsPromise,
      typeGroupsPromise,
    ])

    const priorityCounts = NOTIFICATION_PRIORITY_ORDER.reduce<Record<
      NotificationPriority,
      { total: number; unread: number }
    >>((acc, priority) => {
      acc[priority] = { total: 0, unread: 0 }
      return acc
    }, {} as Record<NotificationPriority, { total: number; unread: number }>)

    for (const group of priorityGroups) {
      const priority = group.priority as NotificationPriority
      const bucket = priorityCounts[priority]
      if (!bucket) continue
      bucket.total += group._count._all
      if (!group.isRead) {
        bucket.unread += group._count._all
      }
    }

    const typeCounts = Object.keys(NOTIFICATION_TYPE_CONFIG).reduce<Record<
      PlayerNotificationType,
      { total: number; unread: number }
    >>((acc, type) => {
      acc[type as PlayerNotificationType] = { total: 0, unread: 0 }
      return acc
    }, {} as Record<PlayerNotificationType, { total: number; unread: number }>)

    for (const group of typeGroups) {
      const type = group.type as PlayerNotificationType
      const bucket = typeCounts[type]
      if (!bucket) continue
      bucket.total += group._count._all
      if (!group.isRead) {
        bucket.unread += group._count._all
      }
    }

    const sorted = [...notifications].sort((a, b) => {
      const rankDiff = this.priorityRank(b.priority as NotificationPriority) - this.priorityRank(a.priority as NotificationPriority)
      if (rankDiff !== 0) {
        return rankDiff
      }
      return Number(b.createdAt) - Number(a.createdAt)
    })

    const normalized: NotificationRecord[] = sorted.map((item) => ({
      id: item.id,
      type: item.type as PlayerNotificationType,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt.toISOString(),
      priority: item.priority as NotificationPriority,
      isRead: item.isRead,
      requiresAcknowledgement: item.requiresAcknowledgement,
      acknowledgedAt: item.acknowledgedAt ? item.acknowledgedAt.toISOString() : null,
      muted: item.muted,
      actionUrl: item.actionUrl,
      metadata: (item.metadata ?? undefined) as Record<string, unknown> | undefined,
      channels: (item.channels ?? undefined) as Record<string, unknown> | undefined,
    }))

    return {
      notifications: normalized,
      unreadCount,
      priorityCounts,
      typeCounts,
    }
  }
}
