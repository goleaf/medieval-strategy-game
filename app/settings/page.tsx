"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"

type Preferences = {
  language?: string | null
  timeZone?: string | null
  dateTimeFormat?: string | null
  numberFormat: "COMMA_DECIMAL" | "DOT_DECIMAL" | "SPACE_DECIMAL"
  theme?: string | null
  defaultAttackType?: string | null
  unitFormationTemplates: Record<string, any>
  enableAutoComplete: boolean
  confirmDialogs: Record<string, boolean>
  onlineStatusVisible: boolean
  contactPreferences: Record<string, boolean>
  dataSharingOptIn: boolean
  mapQuality: "LOW" | "MEDIUM" | "HIGH"
  animationsEnabled: boolean
  autoRefreshSeconds: number
  bandwidthSaver: boolean
}

type NotifPref = {
  globalEnabled: boolean
  doNotDisturbEnabled: boolean
  importanceThreshold: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  desktopEnabled: boolean
  mobilePushEnabled: boolean
  emailFrequency: "daily_summary" | "critical_only" | "disabled"
  quietHoursEnabled: boolean
  quietHoursStart?: number | null
  quietHoursEnd?: number | null
  suppressNonCriticalDuringQuietHours: boolean
  groupSimilar: boolean
  retentionDays: number
}

const DEFAULT_PREFS: Preferences = {
  language: "en",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateTimeFormat: "YYYY-MM-DD HH:mm",
  numberFormat: "COMMA_DECIMAL",
  theme: "system",
  defaultAttackType: "raid",
  unitFormationTemplates: {},
  enableAutoComplete: true,
  confirmDialogs: { attack: true, cancelTrain: true, demolish: true },
  onlineStatusVisible: true,
  contactPreferences: { friendRequests: true, mentorship: true },
  dataSharingOptIn: false,
  mapQuality: "MEDIUM",
  animationsEnabled: true,
  autoRefreshSeconds: 60,
  bandwidthSaver: false,
}

const DEFAULT_NOTIF: NotifPref = {
  globalEnabled: true,
  doNotDisturbEnabled: false,
  importanceThreshold: "MEDIUM",
  desktopEnabled: false,
  mobilePushEnabled: true,
  emailFrequency: "disabled",
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  suppressNonCriticalDuringQuietHours: true,
  groupSimilar: true,
  retentionDays: 90,
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [np, setNp] = useState<NotifPref>(DEFAULT_NOTIF)
  const [privacy, setPrivacy] = useState<{ profileVisibility: 'PUBLIC' | 'TRIBE_ONLY' | 'PRIVATE'; allowFriendRequests: boolean; allowMentorship: boolean; socialFeedOptIn: boolean } | null>(null)
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { setTheme } = useTheme()

  useEffect(() => {
    const run = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const [pRes, nRes, privRes] = await Promise.all([
          fetch("/api/settings/preferences", { headers }),
          fetch("/api/settings/notifications", { headers }),
          fetch("/api/settings/privacy", { headers }),
        ])
        const pData = await pRes.json()
        const nData = await nRes.json()
        const privData = await privRes.json()
        if (pData.success && pData.data) setPrefs((prev) => ({ ...prev, ...pData.data }))
        if (nData.success && nData.data) setNp((prev) => ({ ...prev, ...nData.data }))
        if (privData.success && privData.data) setPrivacy(privData.data)
      } catch (e) {
        console.error("Failed to load settings", e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  useEffect(() => {
    if (prefs.theme) {
      setTheme(prefs.theme)
    }
  }, [prefs.theme, setTheme])

  const resetAll = () => {
    setPrefs(DEFAULT_PREFS)
    setNp(DEFAULT_NOTIF)
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      const [pRes, nRes, privRes] = await Promise.all([
        fetch("/api/settings/preferences", { method: "PUT", headers, body: JSON.stringify(prefs) }),
        fetch("/api/settings/notifications", { method: "PUT", headers, body: JSON.stringify(np) }),
        privacy ? fetch("/api/settings/privacy", { method: "PUT", headers, body: JSON.stringify(privacy) }) : Promise.resolve({ ok: true } as any),
      ])
      const ok = pRes.ok && nRes.ok && (privRes as any).ok
      if (ok) alert("Settings saved")
      else alert("Failed to save some settings")
    } catch (e) {
      alert("Save failed")
    } finally {
      setSaving(false)
    }
  }

  const matches = (text: string) => text.toLowerCase().includes(filter.toLowerCase())

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-8 bg-gray-100 rounded" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetAll}>Reset to defaults</Button>
            <Button onClick={saveAll} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input placeholder="Search settings..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Display */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Display</h2>
            <div className="space-y-4">
              {matches("language") && (
                <div>
                  <Label>Language</Label>
                  <Input value={prefs.language ?? ""} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })} />
                </div>
              )}
              {matches("theme") && (
                <div>
                  <Label>Theme</Label>
                  <Select value={prefs.theme ?? "system"} onValueChange={(v) => setPrefs({ ...prefs, theme: v })}>
                    <SelectTrigger><SelectValue placeholder="Theme" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {matches("time zone") && (
                <div>
                  <Label>Time Zone</Label>
                  <Input value={prefs.timeZone ?? ""} onChange={(e) => setPrefs({ ...prefs, timeZone: e.target.value })} />
                </div>
              )}
              {matches("number format") && (
                <div>
                  <Label>Number Format</Label>
                  <Select value={prefs.numberFormat} onValueChange={(v) => setPrefs({ ...prefs, numberFormat: v as Preferences["numberFormat"] })}>
                    <SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMA_DECIMAL">1,000.00</SelectItem>
                      <SelectItem value="DOT_DECIMAL">1.000,00</SelectItem>
                      <SelectItem value="SPACE_DECIMAL">1 000,00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Card>

          {/* Gameplay */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Gameplay</h2>
            <div className="space-y-4">
              {matches("default attack") && (
                <div>
                  <Label>Default Attack Type</Label>
                  <Select value={prefs.defaultAttackType ?? "raid"} onValueChange={(v) => setPrefs({ ...prefs, defaultAttackType: v })}>
                    <SelectTrigger><SelectValue placeholder="Attack type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raid">Raid</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {matches("auto complete") && (
                <div className="flex items-center justify-between">
                  <Label>Auto-complete</Label>
                  <Switch checked={prefs.enableAutoComplete} onCheckedChange={(v) => setPrefs({ ...prefs, enableAutoComplete: v })} />
                </div>
              )}
              {matches("confirm") && (
                <div className="flex items-center justify-between">
                  <Label>Confirm on Attack</Label>
                  <Switch checked={!!prefs.confirmDialogs.attack} onCheckedChange={(v) => setPrefs({ ...prefs, confirmDialogs: { ...prefs.confirmDialogs, attack: v } })} />
                </div>
              )}
            </div>
          </Card>

          {/* Privacy */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Privacy</h2>
            <div className="space-y-4">
              {privacy && matches("profile visibility") && (
                <div>
                  <Label>Profile Visibility</Label>
                  <Select value={privacy.profileVisibility} onValueChange={(v) => setPrivacy({ ...(privacy as any), profileVisibility: v as any })}>
                    <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="TRIBE_ONLY">Tribe only</SelectItem>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {matches("online status") && (
                <div className="flex items-center justify-between">
                  <Label>Show Online Status</Label>
                  <Switch checked={prefs.onlineStatusVisible} onCheckedChange={(v) => setPrefs({ ...prefs, onlineStatusVisible: v })} />
                </div>
              )}
              {privacy && matches("friend requests") && (
                <div className="flex items-center justify-between">
                  <Label>Allow Friend Requests</Label>
                  <Switch checked={privacy.allowFriendRequests} onCheckedChange={(v) => setPrivacy({ ...(privacy as any), allowFriendRequests: v })} />
                </div>
              )}
              {privacy && matches("mentorship") && (
                <div className="flex items-center justify-between">
                  <Label>Allow Mentorship</Label>
                  <Switch checked={privacy.allowMentorship} onCheckedChange={(v) => setPrivacy({ ...(privacy as any), allowMentorship: v })} />
                </div>
              )}
              {matches("data sharing") && (
                <div className="flex items-center justify-between">
                  <Label>Data Sharing Opt-in</Label>
                  <Switch checked={prefs.dataSharingOptIn} onCheckedChange={(v) => setPrefs({ ...prefs, dataSharingOptIn: v })} />
                </div>
              )}
            </div>
          </Card>

          {/* Performance */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Performance</h2>
            <div className="space-y-4">
              {matches("map") && (
                <div>
                  <Label>Map Quality</Label>
                  <Select value={prefs.mapQuality} onValueChange={(v) => setPrefs({ ...prefs, mapQuality: v as Preferences["mapQuality"] })}>
                    <SelectTrigger><SelectValue placeholder="Quality" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {matches("animations") && (
                <div className="flex items-center justify-between">
                  <Label>Animations</Label>
                  <Switch checked={prefs.animationsEnabled} onCheckedChange={(v) => setPrefs({ ...prefs, animationsEnabled: v })} />
                </div>
              )}
              {matches("refresh") && (
                <div>
                  <Label>Auto Refresh (seconds)</Label>
                  <Input type="number" value={prefs.autoRefreshSeconds} onChange={(e) => setPrefs({ ...prefs, autoRefreshSeconds: parseInt(e.target.value || "0", 10) })} />
                </div>
              )}
              {matches("bandwidth") && (
                <div className="flex items-center justify-between">
                  <Label>Bandwidth Optimization</Label>
                  <Switch checked={prefs.bandwidthSaver} onCheckedChange={(v) => setPrefs({ ...prefs, bandwidthSaver: v })} />
                </div>
              )}
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Notifications</Label>
                <Switch checked={np.globalEnabled} onCheckedChange={(v) => setNp({ ...np, globalEnabled: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Do Not Disturb (suppress all non-critical)</Label>
                <Switch checked={np.doNotDisturbEnabled} onCheckedChange={(v) => setNp({ ...np, doNotDisturbEnabled: v })} />
              </div>
              <div>
                <Label>Importance Threshold</Label>
                <Select value={np.importanceThreshold} onValueChange={(v) => setNp({ ...np, importanceThreshold: v as NotifPref["importanceThreshold"] })}>
                  <SelectTrigger><SelectValue placeholder="Threshold" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Group Similar Notifications</Label>
                <Switch checked={np.groupSimilar} onCheckedChange={(v) => setNp({ ...np, groupSimilar: v })} />
              </div>
              <div>
                <Label>Retention (days)</Label>
                <Input type="number" value={np.retentionDays} onChange={(e) => setNp({ ...np, retentionDays: parseInt(e.target.value || "0", 10) })} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
