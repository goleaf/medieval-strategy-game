"use client"

import { useEffect, useState } from "react"
import { TextTable } from "./text-table"

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const playerId = "temp-player-id"
      const res = await fetch(`/api/notifications?playerId=${playerId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setNotifications(data.data)
        setUnreadCount(data.data.filter((n: Notification) => !n.read).length)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  const markAsRead = async (id: string, link?: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      })
      fetchNotifications()
      if (link) {
        window.location.href = link
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

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
      x-data="{ showDropdown: false }"
      x-on:click.outside="showDropdown = false"
      className="relative"
    >
      <button
        x-on:click="showDropdown = !showDropdown"
        className="relative p-2 rounded hover:bg-secondary"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
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
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No notifications
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id, notification.link)}
                className={`p-3 hover:bg-secondary cursor-pointer ${!notification.read ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{notification.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

