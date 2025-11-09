"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type WorldItem = {
  id: string
  worldName: string
  worldCode: string
  isActive: boolean
  isRegistrationOpen: boolean
  worldType: string
  version: string
  region: string
  speed: number
  seasonType?: string | null
  seasonName?: string | null
  seasonDescription?: string | null
  estimatedDurationDays?: number | null
  seasonFeatures?: any
  startedAt?: string | null
  createdAt: string
  playerCount: number
  ageDays: number
}

export default function WorldsPage() {
  const [items, setItems] = useState<WorldItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch(`/api/worlds`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error || "Failed to load worlds")
        if (!alive) return
        setItems(json.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load worlds")
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading…</div>
  if (error) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">{error}</div>

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Game Worlds</p>
          <h1 className="text-3xl font-semibold">World Selection</h1>
          <p className="text-sm text-muted-foreground">Pick a seasonal or classic world with unique settings.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((w) => (
            <Card key={w.id} className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Badge variant="outline">{w.worldCode}</Badge>
                  {w.worldName}
                  <span className="ml-auto text-xs text-muted-foreground">{w.playerCount} players</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{w.version}</Badge>
                  <Badge variant="secondary">{w.region}</Badge>
                  <Badge variant="secondary">Speed ×{w.speed}</Badge>
                  {w.seasonType && <Badge variant="secondary">{w.seasonType}</Badge>}
                </div>
                {w.seasonName && <p className="font-medium">{w.seasonName}</p>}
                <p className="text-muted-foreground">{w.seasonDescription || "Classic rules"}</p>
                <div className="text-xs text-muted-foreground">
                  {w.isActive ? (
                    <span>Age: {w.ageDays} days</span>
                  ) : (
                    <span>Not active</span>
                  )}
                  {w.estimatedDurationDays ? (
                    <span className="ml-2">Est. duration: {w.estimatedDurationDays} days</span>
                  ) : null}
                </div>
                {w.seasonFeatures && Object.keys(w.seasonFeatures || {}).length > 0 && (
                  <pre className="bg-muted/30 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(w.seasonFeatures, null, 2)}</pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

