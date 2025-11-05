"use client"

import { useEffect } from "react"

interface Notification {
  id: string
  type: "BATTLE" | "SCOUT" | "CONSTRUCTION" | "TRAINING" | "MARKET" | "SYSTEM"
  title: string
  message: string
  createdAt: string
  read: boolean
  link?: string
}

export function NotificationBell() {
  const fetchNotifications = async () => {
    try {
      const playerId = "temp-player-id"
      const res = await fetch(`/api/notifications?playerId=${playerId}`)
      const data = await res.json()
      if (data.success && data.data) {
        return data.data
      }
      return []
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
      return []
    }
  }

  const markAsRead = async (id: string, link?: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      })
      if (link) {
        window.location.href = link
      }
      return true
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
      return false
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__notificationBellFetchHandler = fetchNotifications
      ;(window as any).__notificationBellMarkReadHandler = markAsRead
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__notificationBellFetchHandler
        delete (window as any).__notificationBellMarkReadHandler
      }
    }
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case "BATTLE":
        return "⚔️"
      case "SCOUT":
        return "👁️"
      case "CONSTRUCTION":
        return "🏗️"
      case "TRAINING":
        return "⚒️"
      case "MARKET":
        return "💰"
      case "SYSTEM":
        return "🔔"
      default:
        return "📬"
    }
  }

  return (
    <div
      x-data={`{
        showDropdown: false,
        notifications: [],
        getIcon(type) {
          const icons = {
            BATTLE: '⚔️',
            SCOUT: '👁️',
            CONSTRUCTION: '🏗️',
            TRAINING: '⚒️',
            MARKET: '💰',
            SYSTEM: '🔔'
          };
          return icons[type] || '📬';
        },
        get unreadCount() {
          return this.notifications.filter(n => !n.read).length;
        },
        async init() {
          await this.refresh();
          setInterval(() => this.refresh(), 30000);
        },
        async refresh() {
          if (window.__notificationBellFetchHandler) {
            this.notifications = await window.__notificationBellFetchHandler();
          }
        },
        async markAsRead(id, link) {
          if (window.__notificationBellMarkReadHandler) {
            await window.__notificationBellMarkReadHandler(id, link);
            await this.refresh();
          }
        }
      }`}
      {...{ "x-on:click.outside": "showDropdown = false" }}
      className="relative"
    >
      <button
        x-on:click="showDropdown = !showDropdown"
        className="relative p-2 rounded hover:bg-secondary"
        aria-label="Notifications"
      >
        🔔
        <span x-show="unreadCount > 0" className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
          <span x-show="unreadCount <= 9" x-text="unreadCount" />
          <span x-show="unreadCount > 9">9+</span>
        </span>
      </button>

      <div
        x-show="showDropdown"
        x-transition:enter="transition ease-out duration-100"
        x-transition:enter-start="opacity-0 scale-95"
        x-transition:enter-end="opacity-100 scale-100"
        x-transition:leave="transition ease-in duration-75"
        x-transition:leave-start="opacity-100 scale-100"
        x-transition:leave-end="opacity-0 scale-95"
        className="absolute right-0 mt-2 w-80 bg-background border border-border rounded shadow-lg z-50 max-h-96 overflow-y-auto"
      >
        <div className="p-2 border-b border-border flex items-center justify-between">
          <h3 className="font-bold">Notifications</h3>
          <button
            x-on:click="showDropdown = false"
            className="text-sm hover:underline"
          >
            Close
          </button>
        </div>
        <div x-show="notifications.length === 0" className="p-4 text-center text-muted-foreground text-sm">
          No notifications
        </div>
        <template x-for="notification in notifications" x-key="notification.id">
          <div
            x-on:click="markAsRead(notification.id, notification.link)"
            x-bind:class="notification.read ? '' : 'bg-primary/5'"
            className="p-3 hover:bg-secondary cursor-pointer"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg" x-text="getIcon(notification.type)" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" x-text="notification.title" />
                <div className="text-xs text-muted-foreground mt-1" x-text="notification.message" />
                <div className="text-xs text-muted-foreground mt-1" x-text="new Date(notification.createdAt).toLocaleString()" />
              </div>
              <span x-show="!notification.read" className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
            </div>
          </div>
        </template>
      </div>
    </div>
  )
}

