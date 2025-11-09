"use client"

import { Filter, RefreshCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NOTIFICATION_PRIORITY_ORDER, NOTIFICATION_TYPE_CONFIG, NOTIFICATION_TYPE_IDS, PRIORITY_BEHAVIOUR } from "@/lib/config/notification-types"
import { notificationIcons } from "@/components/game/notification-icons"
import type { NotificationController } from "@/types/notifications"
import { cn } from "@/lib/utils"

interface NotificationCenterProps {
  controller: NotificationController | null
}

export function NotificationCenter({ controller }: NotificationCenterProps) {
  if (!controller) {
    return null
  }

  const { notifications, meta, filters, setFilters, markAsRead, markAllAsRead, isLoading, refresh } = controller

  const handlePriorityChange = (priority: string) => {
    setFilters((prev) => ({ ...prev, priority: priority as typeof filters.priority }))
  }

  const handleTypeChange = (type: string) => {
    setFilters((prev) => ({ ...prev, type: type as typeof filters.type }))
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Notification Center</CardTitle>
          <p className="text-sm text-muted-foreground">{meta.unreadCount} unread alerts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={meta.unreadCount === 0}
            onClick={() => markAllAsRead().catch(() => undefined)}
          >
            Mark all as read
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 md:grid-cols-4">
          {NOTIFICATION_PRIORITY_ORDER.map((priority) => {
            const summary = PRIORITY_BEHAVIOUR[priority]
            const counts = meta.priorityCounts[priority]
            return (
              <button
                key={priority}
                onClick={() => handlePriorityChange(priority)}
                className={cn(
                  "rounded-lg border p-3 text-left transition",
                  filters.priority === priority ? "border-primary shadow" : "border-border",
                )}
              >
                <p className="text-xs uppercase text-muted-foreground">{summary.label}</p>
                <p className="text-2xl font-bold">{counts.total}</p>
                <p className="text-xs text-muted-foreground">{counts.unread} unread</p>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Filter className="mr-2 h-4 w-4" />
            <div className="flex gap-2">
              <Select value={filters.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  {NOTIFICATION_PRIORITY_ORDER.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Notification type" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">All types</SelectItem>
                  {NOTIFICATION_TYPE_IDS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {NOTIFICATION_TYPE_CONFIG[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="show-muted" className="text-sm">
              Show quiet-hour alerts
            </Label>
            <Switch
              id="show-muted"
              checked={filters.showMuted}
              onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, showMuted: checked }))}
            />
          </div>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {isLoading ? "Loading notifications..." : "No notifications match the current filters."}
            </p>
          ) : (
            notifications.map((notification) => {
              const config = NOTIFICATION_TYPE_CONFIG[notification.type]
              const Icon = notificationIcons[config?.icon ?? "BellRing"]
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "rounded-lg border p-4",
                    notification.isRead ? "bg-background" : "bg-primary/5",
                    config?.accent ?? "border-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("rounded-full p-2", config?.badgeClass ?? "bg-slate-200 text-slate-900")}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{notification.title}</p>
                        <Badge variant="outline" className={config?.badgeClass}>
                          {notification.priority.toLowerCase()}
                        </Badge>
                        {notification.muted && <Badge variant="secondary">Muted</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsRead(notification.id)}
                        className="shrink-0"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
