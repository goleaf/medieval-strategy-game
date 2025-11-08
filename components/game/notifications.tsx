"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"

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
  const [expanded, setExpanded] = useState(false)

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

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkRead = (id: string) => {
    if (onMarkRead) {
      onMarkRead(id)
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-secondary rounded"
      >
        <h3 className="font-bold">Notifications</h3>
        {unreadCount > 0 && (
          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
            {unreadCount}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No notifications</p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded border transition ${
                  notif.read ? 'border-border bg-background' : 'border-primary bg-primary/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{getIcon(notif.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{notif.title}</p>
                    <p className="text-xs text-muted-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notif.timestamp.toLocaleTimeString()}</p>
                  </div>
                  {!notif.read && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkRead(notif.id)}
                      className="whitespace-nowrap"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}
