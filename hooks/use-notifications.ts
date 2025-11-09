"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  GameNotification,
  NotificationController,
  NotificationFeedMeta,
  NotificationFiltersState,
} from "@/types/notifications"
import { NOTIFICATION_PRIORITY_ORDER, NOTIFICATION_TYPE_IDS } from "@/lib/config/notification-types"

const createEmptyMeta = (): NotificationFeedMeta => ({
  unreadCount: 0,
  priorityCounts: NOTIFICATION_PRIORITY_ORDER.reduce(
    (acc, priority) => {
      acc[priority] = { total: 0, unread: 0 }
      return acc
    },
    {} as NotificationFeedMeta["priorityCounts"],
  ),
  typeCounts: NOTIFICATION_TYPE_IDS.reduce(
    (acc, type) => {
      acc[type] = { total: 0, unread: 0 }
      return acc
    },
    {} as NotificationFeedMeta["typeCounts"],
  ),
})

export function useNotificationFeed(playerId: string | null, options?: { pollInterval?: number }): NotificationController {
  const pollInterval = options?.pollInterval ?? 30_000
  const [notifications, setNotifications] = useState<GameNotification[]>([])
  const [meta, setMeta] = useState<NotificationFeedMeta>(() => createEmptyMeta())
  const [filters, setFilters] = useState<NotificationFiltersState>({
    priority: "ALL",
    type: "ALL",
    showMuted: false,
  })
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!playerId) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        playerId,
        includeRead: "true",
      })
      if (filters.priority !== "ALL") params.set("priority", filters.priority)
      if (filters.type !== "ALL") params.set("type", filters.type)
      if (filters.showMuted) params.set("includeMuted", "true")
      params.set("limit", "75")
      const res = await fetch(`/api/notifications?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Failed to load notifications")
      }
      const json = await res.json()
      if (json.success) {
        setNotifications(json.data.notifications ?? [])
        setMeta({
          unreadCount: json.data.unreadCount,
          priorityCounts: json.data.priorityCounts,
          typeCounts: json.data.typeCounts,
        })
      }
    } catch (error) {
      console.error("Notification fetch failed:", error)
    } finally {
      setIsLoading(false)
    }
  }, [playerId, filters.priority, filters.type, filters.showMuted])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!playerId) return
    const id = setInterval(() => {
      fetchNotifications()
    }, pollInterval)
    return () => clearInterval(id)
  }, [playerId, fetchNotifications, pollInterval])

  const markAsRead = useCallback(
    async (id: string) => {
      if (!playerId) return
      try {
        await fetch(`/api/notifications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        })
        await fetchNotifications()
      } catch (error) {
        console.error("Failed to mark notification as read:", error)
      }
    },
    [playerId, fetchNotifications],
  )

  const markAllAsRead = useCallback(async () => {
    if (!playerId) return
    try {
      await fetch("/api/notifications/mark-all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      })
      await fetchNotifications()
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }, [playerId, fetchNotifications])

  const controller: NotificationController = useMemo(
    () => ({
      notifications,
      meta,
      filters,
      setFilters,
      isLoading,
      refresh: fetchNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, meta, filters, isLoading, fetchNotifications, markAsRead, markAllAsRead],
  )

  return controller
}
