import type { Dispatch, SetStateAction } from "react"
import type {
  NotificationPriority,
  NotificationSoundPreset,
  NotificationTypePreference,
  PlayerNotificationType,
} from "@/lib/config/notification-types"

export type GameNotification = {
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

export type NotificationCountSummary = {
  total: number
  unread: number
}

export type NotificationFeedMeta = {
  unreadCount: number
  priorityCounts: Record<NotificationPriority, NotificationCountSummary>
  typeCounts: Record<PlayerNotificationType, NotificationCountSummary>
}

export type NotificationFiltersState = {
  priority: NotificationPriority | "ALL"
  type: PlayerNotificationType | "ALL"
  showMuted: boolean
}

export type NotificationPreferencesViewModel = {
  importanceThreshold: NotificationPriority
  desktopEnabled: boolean
  mobilePushEnabled: boolean
  emailFrequency: "daily_summary" | "critical_only" | "disabled"
  quietHours: {
    enabled: boolean
    start: string | null
    end: string | null
  }
  suppressNonCriticalDuringQuietHours: boolean
  typeSettings: Record<PlayerNotificationType, NotificationTypePreference>
  soundProfiles: Record<NotificationPriority, NotificationSoundPreset>
  lastDigestAt?: string | null
}

export type NotificationController = {
  notifications: GameNotification[]
  meta: NotificationFeedMeta
  filters: NotificationFiltersState
  setFilters: Dispatch<SetStateAction<NotificationFiltersState>>
  isLoading: boolean
  refresh: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}
