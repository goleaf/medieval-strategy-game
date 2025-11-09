"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NOTIFICATION_TYPE_CONFIG } from "@/lib/config/notification-types"
import { notificationIcons } from "@/components/game/notification-icons"
import type { NotificationController } from "@/types/notifications"

interface NotificationBellProps {
  controller: NotificationController | null
}

export function NotificationBell({ controller }: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  if (!controller) {
    return null
  }

  const { notifications, meta, markAsRead, markAllAsRead } = controller
  const unreadCount = meta.unreadCount
  const recent = notifications.slice(0, 6)

  const handleItemClick = async (id: string, actionUrl?: string | null) => {
    await markAsRead(id)
    if (actionUrl) {
      window.location.href = actionUrl
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-full border border-border bg-background p-2 hover:bg-secondary"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-96 rounded-lg border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={unreadCount === 0}
              onClick={() => markAllAsRead().catch(() => undefined)}
            >
              Mark all
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</p>
            ) : (
              recent.map((notification) => {
                const config = NOTIFICATION_TYPE_CONFIG[notification.type]
                const Icon = notificationIcons[config?.icon ?? "BellRing"] ?? Bell
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleItemClick(notification.id, notification.actionUrl)}
                    className={`w-full border-b border-border px-4 py-3 text-left transition ${
                      !notification.isRead ? "bg-primary/5" : "bg-background"
                    } hover:bg-secondary`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`rounded-full p-2 ${config?.badgeClass ?? "bg-slate-200 text-slate-900"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{notification.title}</p>
                          <Badge
                            variant="outline"
                            className={config?.badgeClass ?? "border-slate-200 text-slate-700"}
                          >
                            {notification.priority.toLowerCase()}
                          </Badge>
                          {notification.muted && (
                            <Badge variant="secondary" className="text-xs">
                              Quiet hours
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
