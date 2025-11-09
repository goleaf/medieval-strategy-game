"use client"

import { useCallback, useEffect, useState } from "react"
import type { WorldStatsPayload } from "@/lib/stats/world"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts"

type WorldSummary = { id: string; worldName: string; worldCode: string; isActive: boolean }
type WorldsResponse = { success: boolean; data?: WorldSummary[] }

const RANGES = [
  { key: "24h", label: "Last 24h" },
  { key: "7d", label: "Last 7d" },
  { key: "30d", label: "Last 30d" },
  { key: "all", label: "All time" },
]

export default function WorldStatsPage() {
  const [worlds, setWorlds] = useState<WorldSummary[]>([])
  const [worldId, setWorldId] = useState<string | null>(null)
  const [range, setRange] = useState<string>("7d")
  const [stats, setStats] = useState<WorldStatsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorlds = useCallback(async () => {
    const res = await fetch("/api/worlds")
    const json: WorldsResponse = await res.json()
    if (json.success && json.data) {
      setWorlds(json.data)
      if (json.data.length && !worldId) setWorldId(json.data[0].id)
    }
  }, [worldId])

  const fetchStats = useCallback(async (wid: string, r: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stats/world?worldId=${wid}&range=${r}`)
      const json = await res.json()
      if (json.success && json.data) setStats(json.data)
      else setError(json.error ?? "Failed to load world stats")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load world stats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorlds() }, [fetchWorlds])
  useEffect(() => { if (worldId) fetchStats(worldId, range) }, [worldId, range, fetchStats])

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">World Statistics</h1>
            <p className="text-sm text-muted-foreground">Global overview and trends.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={worldId ?? undefined} onValueChange={setWorldId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select world" /></SelectTrigger>
              <SelectContent>
                {worlds.map((w) => (<SelectItem key={w.id} value={w.id}>{w.worldCode} – {w.worldName}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (<SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !stats ? null : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">World</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.world.worldCode}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Age (days)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.world.ageDays}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Players</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.population.totalPlayers}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active 24h</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.population.active24h}</CardContent></Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Battles per day</CardTitle></CardHeader>
                <CardContent style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.timeSeries.battlesPerDay}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="var(--color-chart-1)" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Registrations per day</CardTitle></CardHeader>
                <CardContent style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.timeSeries.registrationsPerDay}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="players" fill="var(--color-chart-2)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader><CardTitle className="text-lg">Points distribution</CardTitle></CardHeader>
                <CardContent style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.population.byPoints}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                      <XAxis dataKey="bucket" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-chart-3)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Production per day</CardTitle></CardHeader>
                <CardContent style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.timeSeries.productionPerDay}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                      <XAxis dataKey="day" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="wood" stroke="var(--color-chart-1)" dot={false} />
                      <Line type="monotone" dataKey="stone" stroke="var(--color-chart-2)" dot={false} />
                      <Line type="monotone" dataKey="iron" stroke="var(--color-chart-3)" dot={false} />
                      <Line type="monotone" dataKey="food" stroke="var(--color-chart-5)" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Aggressive players</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  {stats.military.mostAggressivePlayers.map((p) => (<div key={p.id} className="flex items-center justify-between"><span>{p.playerName ?? p.id}</span><span className="text-muted-foreground">{p.attacks}</span></div>))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

