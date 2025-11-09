"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type Prefs = {
  email: string
  verified: boolean
  deliverySchedule: "IMMEDIATE" | "HOURLY" | "DAILY"
  language: "EN" | "DE"
  preferences: {
    attackIncoming: boolean
    attackReport: boolean
    conquestWarning: boolean
    conquestLost: boolean
    tribeMessage: boolean
    trainingComplete: boolean
    buildingComplete: boolean
    dailySummary: boolean
  }
  dailyDigestHour: number
  unsubscribed: boolean
}

export function EmailSettingsPanel({ playerId }: { playerId: string }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/email-notifications/preferences?playerId=${playerId}`)
      const json = await res.json()
      if (json.success) setPrefs(json.data)
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    try {
      const res = await fetch("/api/email-notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, ...prefs }),
      })
      const json = await res.json()
      if (json.success) setPrefs(json.data)
    } finally {
      setSaving(false)
    }
  }

  const requestVerification = async () => {
    setVerifying(true)
    try {
      await fetch("/api/email-notifications/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      })
      alert("Verification email sent.")
    } finally {
      setVerifying(false)
    }
  }

  if (loading || !prefs) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading email settings…</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input
                value={prefs.email}
                onChange={(e) => setPrefs({ ...prefs, email: e.target.value })}
                placeholder="you@example.com"
              />
              <div className="text-xs text-muted-foreground">{prefs.verified ? "Verified" : "Not verified"}</div>
              {!prefs.verified && (
                <Button size="sm" variant="outline" onClick={requestVerification} disabled={verifying}>
                  {verifying ? "Sending…" : "Send verification email"}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Select
                value={prefs.deliverySchedule}
                onValueChange={(v) => setPrefs({ ...prefs, deliverySchedule: v as Prefs["deliverySchedule"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                  <SelectItem value="HOURLY">Hourly digest</SelectItem>
                  <SelectItem value="DAILY">Daily digest</SelectItem>
                </SelectContent>
              </Select>
              {prefs.deliverySchedule === "DAILY" && (
                <div className="space-y-1">
                  <Label>Daily digest hour (0–23)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={prefs.dailyDigestHour}
                    onChange={(e) => setPrefs({ ...prefs, dailyDigestHour: Number(e.target.value) })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={prefs.language} onValueChange={(v) => setPrefs({ ...prefs, language: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EN">English</SelectItem>
                    <SelectItem value="DE">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {([
            ["attackIncoming", "Incoming attacks"],
            ["attackReport", "Attack reports"],
            ["conquestWarning", "Loyalty warnings"],
            ["conquestLost", "Village conquered"],
            ["tribeMessage", "Tribe messages"],
            ["trainingComplete", "Noble/training complete"],
            ["buildingComplete", "Major building complete"],
            ["dailySummary", "Include daily summary in digest"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded border p-2">
              <span className="text-sm">{label}</span>
              <Switch
                checked={(prefs.preferences as any)[key]}
                onCheckedChange={(checked) =>
                  setPrefs({ ...prefs, preferences: { ...prefs.preferences, [key]: checked } })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save email settings"}
        </Button>
      </div>
    </div>
  )
}

