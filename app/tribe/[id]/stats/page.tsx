"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { TribeStatsPayload } from "@/lib/stats/tribe"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

type PlayerResponse = { success: boolean; data?: { player?: { id: string } } }

const RANGES = [
  { key: "24h", label: "Last 24h" },
  { key: "7d", label: "Last 7d" },
  { key: "30d", label: "Last 30d" },
  { key: "all", label: "All time" },
]

export default function TribeStatsPage() {
  const { id } = useParams<{ id: string }>()
  const [requesterId, setRequesterId] = useState<string | null>(null)
  const [range, setRange] = useState<string>("7d")
  const [stats, setStats] = useState<TribeStatsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayer = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/player-data")
      const json: PlayerResponse = await res.json()
      if (json.success && json.data?.player?.id) setRequesterId(json.data.player.id)
    } catch {}
  }, [])

  const fetchStats = useCallback(async (tribeId: string, requester: string, r: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stats/tribe?tribeId=${tribeId}&requesterId=${requester}&range=${r}`)
      const json = await res.json()
      if (json.success && json.data) setStats(json.data)
      else setError(json.error ?? "Failed to load tribe stats")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tribe stats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlayer() }, [fetchPlayer])
  useEffect(() => { if (id && requesterId) fetchStats(id, requesterId, range) }, [id, requesterId, range, fetchStats])

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tribe Statistics</h1>
            <p className="text-sm text-muted-foreground">Officer portal for performance and strategy.</p>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Range" /></SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (<SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !stats ? null : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Members</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.tribe.memberCount}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total points</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.tribe.totalPoints.toLocaleString()}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Growth/day</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{Math.round(stats.contributions.growthRatePerDay).toLocaleString()}</CardContent></Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Leaderboard (Points)</CardTitle></CardHeader>
                <CardContent>
                  <TopList rows={stats.memberPerformance.byPoints.map((m) => ({ label: m.playerName, value: m.points }))} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Leaderboard (OD)</CardTitle></CardHeader>
                <CardContent>
                  <TopList rows={stats.memberPerformance.byOD.map((m) => ({ label: m.playerName, value: m.od }))} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Most Active</CardTitle></CardHeader>
                <CardContent>
                  <TopList rows={stats.contributions.mostActive.map((m) => ({ label: m.playerName, value: m.actions }))} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Most Helpful (Support)</CardTitle></CardHeader>
                <CardContent>
                  <TopList rows={stats.contributions.mostHelpful.map((m) => ({ label: m.playerName, value: m.supportCount }))} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Territories by Continent</CardTitle></CardHeader>
                <CardContent style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.territory.heatmapByContinent}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                      <XAxis dataKey="continentId" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="villages" fill="var(--color-chart-1)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Coverage & Frontline</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 text-sm gap-2">
                  <div><p className="text-muted-foreground">Frontline villages</p><p className="font-medium">{stats.territory.frontlineVillageCount}</p></div>
                  <div><p className="text-muted-foreground">Nearby barbarians</p><p className="font-medium">{stats.territory.expansionOpportunities.nearbyBarbarians}</p></div>
                  <div><p className="text-muted-foreground">Support total</p><p className="font-medium">{stats.territory.defensiveCoverage.totalSupportStacks.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">Avg support/village</p><p className="font-medium">{Math.round(stats.territory.defensiveCoverage.avgSupportPerVillage).toLocaleString()}</p></div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Operations</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 text-sm gap-2">
                  <div><p className="text-muted-foreground">Attacks launched</p><p className="font-medium">{stats.military.attacksLaunched}</p></div>
                  <div><p className="text-muted-foreground">Success rate</p><p className="font-medium">{Math.round(stats.military.successRate * 100)}%</p></div>
                  <div className="col-span-2"><p className="text-muted-foreground">Resources plundered</p><p className="font-medium">{sumRes(stats.military.resourcesPlundered).toLocaleString()}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Active Wars</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  {stats.military.activeWars.length === 0 ? (<p className="text-muted-foreground">None</p>) : (
                    stats.military.activeWars.map((w) => (
                      <div key={w.id} className="flex items-center justify-between"><span>{w.against.tag} – {w.against.name}</span><span className="text-muted-foreground">vs</span></div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TopList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  return (
    <div className="space-y-1 text-sm">
      {rows.slice(0, 10).map((r, i) => (
        <div key={i} className="flex items-center justify-between"><span>{i + 1}. {r.label}</span><span className="text-muted-foreground">{r.value.toLocaleString()}</span></div>
      ))}
    </div>
  )
}

function sumRes(r: { wood: number; stone: number; iron: number; gold: number; food: number }): number {
  return r.wood + r.stone + r.iron + r.gold + r.food
}

