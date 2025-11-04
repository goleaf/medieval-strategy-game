"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

interface Notification {
  id: string
  type: "ATTACK" | "DEFENSE" | "TRADE" | "ALLIANCE" | "SYSTEM"
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface NotificationsProps {
  notifications: Notification[]
  onMarkRead?: (id: string) => void
}

export function NotificationCenter({ notifications, onMarkRead }: NotificationsProps) {
  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      ATTACK: "⚔️",
      DEFENSE: "🛡️",
      TRADE: "💰",
      ALLIANCE: "🤝",
      SYSTEM: "ℹ️",
    }
    return icons[type] || "ℹ️"
  }

  useEffect(() => {
    if (typeof window !== "undefined" && onMarkRead) {
      (window as any).__notificationMarkReadHandler = onMarkRead
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__notificationMarkReadHandler
      }
    }
  }, [onMarkRead])

  return (
    <Card
      x-data={`{
        expanded: false,
        notifications: ${JSON.stringify(notifications)},
        get unreadCount() {
          return this.notifications.filter(n => !n.read).length;
        },
        markRead(id) {
          if (window.__notificationMarkReadHandler) {
            window.__notificationMarkReadHandler(id);
          }
        }
      }`}
      className="p-4 space-y-3"
    >
      <button
        x-on:click="expanded = !expanded"
        className="w-full flex items-center justify-between p-2 hover:bg-secondary rounded"
      >
        <h3 className="font-bold">Notifications</h3>
        <span x-show="unreadCount > 0" className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded" x-text="unreadCount" />
      </button>

      <div x-show="expanded" x-transition className="space-y-2 max-h-96 overflow-y-auto">
        <p x-show="notifications.length === 0" className="text-sm text-muted-foreground text-center py-4">No notifications</p>
        {notifications.map((notif) => (
          <div
            key={notif.id}
            x-bind:class={`${notif.read ? 'border-border bg-background' : 'border-primary bg-primary/5'}`}
            className="p-3 rounded border transition"
          >
            <div className="flex items-start gap-2">
              <span className="text-xl">{getIcon(notif.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{notif.title}</p>
                <p className="text-xs text-muted-foreground">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{notif.timestamp.toLocaleTimeString()}</p>
              </div>
              <Button
                x-show={`${!notif.read}`}
                size="sm"
                variant="outline"
                x-on:click={`markRead('${notif.id}')`}
                className="whitespace-nowrap"
              >
                Mark read
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
