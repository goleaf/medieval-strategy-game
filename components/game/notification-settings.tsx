"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { NOTIFICATION_PRIORITY_ORDER, NOTIFICATION_SOUND_PRESETS, NOTIFICATION_TYPE_CONFIG } from "@/lib/config/notification-types"
import type { NotificationPreferencesViewModel, GameNotification } from "@/types/notifications"
import { notificationIcons } from "@/components/game/notification-icons"
import { cn } from "@/lib/utils"

const SOUND_LABELS: Record<string, string> = {
  siren: "Siren",
  "war-horn": "War Horn",
  drumline: "Marching Drum",
  ping: "Ping",
  chime: "Chime",
  mute: "Mute",
}

const SOUND_PREVIEW_FREQUENCIES: Record<string, number> = {
  siren: 620,
  "war-horn": 440,
  drumline: 180,
  ping: 880,
  chime: 540,
  mute: 0,
}

const emailOptions = [
  { value: "daily_summary", label: "Daily summary" },
  { value: "critical_only", label: "Critical only" },
  { value: "disabled", label: "Disabled" },
]

async function playPreview(sound: string) {
  if (typeof window === "undefined" || sound === "mute") return
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = SOUND_PREVIEW_FREQUENCIES[sound] ?? 500
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch (error) {
    console.error("Unable to play preview tone", error)
  }
}

interface NotificationSettingsProps {
  playerId: string
}

export function NotificationSettingsPanel({ playerId }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferencesViewModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState<GameNotification[]>([])
  const [logLoading, setLogLoading] = useState(false)

  const fetchPreferences = useCallback(async () => {
    if (!playerId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications/preferences?playerId=${playerId}`)
      const json = await res.json()
      if (json.success) {
        setPreferences(json.data)
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error)
    } finally {
      setLoading(false)
    }
  }, [playerId])

  const fetchLog = useCallback(async () => {
    if (!playerId) return
    setLogLoading(true)
    try {
      const params = new URLSearchParams({
        playerId,
        includeRead: "true",
        includeMuted: "true",
        limit: "20",
      })
      const res = await fetch(`/api/notifications?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setLog(json.data.notifications || [])
      }
    } catch (error) {
      console.error("Failed to load notification log:", error)
    } finally {
      setLogLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    fetchPreferences()
    fetchLog()
  }, [fetchPreferences, fetchLog])

  const handleSave = async () => {
    if (!preferences) return
    setSaving(true)
    try {
      const payload = {
        playerId,
        importanceThreshold: preferences.importanceThreshold,
        desktopEnabled: preferences.desktopEnabled,
        mobilePushEnabled: preferences.mobilePushEnabled,
        emailFrequency: preferences.emailFrequency,
        suppressNonCriticalDuringQuietHours: preferences.suppressNonCriticalDuringQuietHours,
        quietHours: {
          enabled: preferences.quietHours.enabled,
          start: preferences.quietHours.start,
          end: preferences.quietHours.end,
        },
        typeSettings: preferences.typeSettings,
        soundProfiles: preferences.soundProfiles,
      }
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setPreferences(json.data)
      }
    } catch (error) {
      console.error("Failed to save notification preferences:", error)
    } finally {
      setSaving(false)
    }
  }

  const groupedTypes = useMemo(() => {
    return NOTIFICATION_PRIORITY_ORDER.map((priority) => ({
      priority,
      items: Object.values(NOTIFICATION_TYPE_CONFIG).filter((config) => config.priority === priority),
    }))
  }, [])

  if (loading || !preferences) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading notification settings…</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Delivery preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Importance threshold</Label>
              <Select
                value={preferences.importanceThreshold}
                onValueChange={(value) => setPreferences((prev) => prev && { ...prev, importanceThreshold: value as typeof prev.importanceThreshold })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_PRIORITY_ORDER.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only notifications at this level or higher will interrupt quiet play.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Email notifications</Label>
              <Select
                value={preferences.emailFrequency}
                onValueChange={(value) => setPreferences((prev) => prev && { ...prev, emailFrequency: value as typeof prev.emailFrequency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Daily summaries list unread reports; critical-only forwards red alerts instantly.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Quiet hours</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => prev && { ...prev, quietHours: { ...prev.quietHours, enabled: checked } })
                  }
                />
                <span className="text-sm">Mute non-critical alerts during sleep</span>
              </div>
              <div className="flex gap-3">
                <Input
                  type="time"
                  value={preferences.quietHours.start ?? ""}
                  onChange={(event) =>
                    setPreferences((prev) => prev && { ...prev, quietHours: { ...prev.quietHours, start: event.target.value } })
                  }
                />
                <Input
                  type="time"
                  value={preferences.quietHours.end ?? ""}
                  onChange={(event) =>
                    setPreferences((prev) => prev && { ...prev, quietHours: { ...prev.quietHours, end: event.target.value } })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={preferences.suppressNonCriticalDuringQuietHours}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => prev && { ...prev, suppressNonCriticalDuringQuietHours: checked })
                  }
                />
                <span className="text-xs text-muted-foreground">Suppress everything except critical alerts.</span>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Desktop & mobile</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={preferences.desktopEnabled}
                  onCheckedChange={(checked) => setPreferences((prev) => prev && { ...prev, desktopEnabled: checked })}
                />
                <span className="text-sm">Browser notifications</span>
                <Button variant="ghost" size="sm" onClick={requestDesktopPermission}>
                  Request permission
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={preferences.mobilePushEnabled}
                  onCheckedChange={(checked) => setPreferences((prev) => prev && { ...prev, mobilePushEnabled: checked })}
                />
                <span className="text-sm">Send to mobile companion app</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedTypes.map((group) => (
            <div key={group.priority} className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{group.priority}</Badge>
                <p className="text-sm text-muted-foreground">
                  Configure {group.priority.toLowerCase()} priority notifications
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((config) => {
                  const Icon = notificationIcons[config.icon] ?? notificationIcons.BellRing
                  const typePreference = preferences.typeSettings[config.id]
                  return (
                    <div key={config.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-full p-2", config.badgeClass)}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={typePreference?.enabled ?? true}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => {
                              if (!prev) return prev
                              return {
                                ...prev,
                                typeSettings: {
                                  ...prev.typeSettings,
                                  [config.id]: {
                                    ...typePreference,
                                    enabled: checked,
                                    sound: typePreference?.sound ?? config.defaultSound,
                                    channels: typePreference?.channels ?? config.defaultChannels,
                                  },
                                },
                              }
                            })
                          }
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Select
                          value={typePreference?.sound ?? config.defaultSound}
                          onValueChange={(value) =>
                            setPreferences((prev) => {
                              if (!prev) return prev
                              return {
                                ...prev,
                                typeSettings: {
                                  ...prev.typeSettings,
                                  [config.id]: {
                                    ...typePreference,
                                    enabled: typePreference?.enabled ?? true,
                                    sound: value,
                                    channels: typePreference?.channels ?? config.defaultChannels,
                                  },
                                },
                              }
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Sound" />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTIFICATION_SOUND_PRESETS.map((preset) => (
                              <SelectItem key={preset} value={preset}>
                                {SOUND_LABELS[preset]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => playPreview(typePreference?.sound ?? config.defaultSound)}>
                          Preview
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority sounds</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {NOTIFICATION_PRIORITY_ORDER.map((priority) => (
            <div key={priority} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-semibold">{priority}</p>
                <p className="text-xs text-muted-foreground">Default tone for {priority.toLowerCase()} alerts</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={preferences.soundProfiles[priority]}
                  onValueChange={(value) =>
                    setPreferences((prev) => prev && { ...prev, soundProfiles: { ...prev.soundProfiles, [priority]: value } })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_SOUND_PRESETS.map((sound) => (
                      <SelectItem key={sound} value={sound}>
                        {SOUND_LABELS[sound]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => playPreview(preferences.soundProfiles[priority])}>
                  Preview
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Notification log</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchLog}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {logLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading log…</p>
          ) : log.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No historical notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {log.map((entry) => {
                const config = NOTIFICATION_TYPE_CONFIG[entry.type]
                return (
                  <div key={entry.id} className="rounded border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={config?.badgeClass}>
                          {config?.label ?? entry.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{entry.priority}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="text-sm text-muted-foreground">{entry.message}</p>
                    {!entry.isRead && <Badge variant="secondary">Unread</Badge>}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save notification settings"}
        </Button>
      </div>
    </div>
  )
}
function requestDesktopPermission() {
  if (typeof window === "undefined") return
  if ("Notification" in window) {
    window.Notification.requestPermission().catch(() => undefined)
  }
}
