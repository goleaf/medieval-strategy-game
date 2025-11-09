"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download } from "lucide-react"
import type { PersonalStatsPayload } from "@/lib/stats/personal"
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"

type PlayerResponse = { success: boolean; data?: { player?: { id: string } } }

const RANGES = [
  { key: "24h", label: "Last 24h" },
  { key: "7d", label: "Last 7d" },
  { key: "30d", label: "Last 30d" },
  { key: "all", label: "All time" },
]

export default function PersonalStatsPage() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<string>("7d")
  const [stats, setStats] = useState<PersonalStatsPayload | null>(null)

  const fetchPlayer = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/player-data")
      const json: PlayerResponse = await res.json()
      if (json.success && json.data?.player?.id) setPlayerId(json.data.player.id)
      else setPlayerId("temp-player-id")
    } catch {
      setPlayerId("temp-player-id")
    }
  }, [])

  const fetchStats = useCallback(async (pid: string, r: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stats/player?playerId=${pid}&range=${r}&compare=true`)
      const json = await res.json()
      if (json.success && json.data) setStats(json.data)
      else setError(json.error ?? "Failed to load stats")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlayer() }, [fetchPlayer])
  useEffect(() => { if (playerId) fetchStats(playerId, range) }, [playerId, range, fetchStats])

  const exportCsv = () => { if (!playerId) return; window.open(`/api/stats/player?playerId=${playerId}&range=${range}&format=csv`, "_blank") }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Personal Statistics</h1>
            <p className="text-sm text-muted-foreground">Performance, economy, and military at a glance.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (<SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2"><Download className="w-4 h-4" /> Export</Button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading stats…</div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !stats ? null : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Stat title="Total points" value={stats.overview.totalPoints.toLocaleString()} />
              <Stat title="Rank" value={stats.overview.rank} />
              <Stat title="Villages" value={stats.overview.villagesOwned} />
              <Stat title="Growth/day" value={Math.round(stats.overview.growthRatePerDay).toLocaleString()} />
            </div>

            <Tabs defaultValue="economy" className="space-y-4">
              <TabsList>
                <TabsTrigger value="economy">Economy</TabsTrigger>
                <TabsTrigger value="military">Military</TabsTrigger>
                <TabsTrigger value="timeline">Timelines</TabsTrigger>
                <TabsTrigger value="compare">Compare</TabsTrigger>
              </TabsList>

              <TabsContent value="economy" className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Production per hour</CardTitle></CardHeader>
                  <CardContent>
                    <BarChartSimple data={[{ name: "Wood", value: stats.economy.productionPerHour.wood }, { name: "Clay", value: stats.economy.productionPerHour.stone }, { name: "Iron", value: stats.economy.productionPerHour.iron }, { name: "Food", value: stats.economy.productionPerHour.food }]} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Trading</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Sent</p>
                        <p className="font-medium">{sumRes(stats.economy.trading.sent).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Received</p>
                        <p className="font-medium">{sumRes(stats.economy.trading.received).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Merchants used</p>
                        <p className="font-medium">{stats.economy.trading.merchantsUsed.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Efficiency</p>
                        <p className="font-medium">{Math.round(stats.economy.trading.merchantEfficiency).toLocaleString()} / merchant</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                  <CardHeader><CardTitle className="text-lg">Resource production trend</CardTitle></CardHeader>
                  <CardContent style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.timeSeries.resourceProduction}>
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
              </TabsContent>

              <TabsContent value="military" className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Attack success</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{Math.round((stats.military.attackSuccessRate || 0) * 100)}%</div>
                    <p className="text-sm text-muted-foreground">Success across filtered range.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Combat efficiency</CardTitle></CardHeader>
                  <CardContent className="text-sm grid grid-cols-3 gap-2">
                    <div><p className="text-muted-foreground">Kills</p><p className="font-medium">{stats.military.combatEfficiency.killed.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Losses</p><p className="font-medium">{stats.military.combatEfficiency.lost.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Ratio</p><p className="font-medium">{Number.isFinite(stats.military.combatEfficiency.ratio) ? stats.military.combatEfficiency.ratio.toFixed(2) : "∞"}</p></div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                  <CardHeader><CardTitle className="text-lg">Combat timeline</CardTitle></CardHeader>
                  <CardContent style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.timeSeries.combat}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="sent" stroke="var(--color-chart-1)" dot={false} />
                        <Line type="monotone" dataKey="received" stroke="var(--color-chart-2)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Village acquisitions</CardTitle></CardHeader>
                  <CardContent style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.timeSeries.villageAcquisitions}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                        <XAxis dataKey="day" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--color-chart-1)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Activity by hour</CardTitle></CardHeader>
                  <CardContent style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.timeSeries.activityByHour}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--color-chart-2)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compare" className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Tribe average</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    {stats.comparison?.tribe ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-muted-foreground">Avg points</p><p className="font-medium">{Math.round(stats.comparison.tribe.avgPoints).toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground">Avg villages</p><p className="font-medium">{(stats.comparison.tribe.avgVillages ?? 0).toFixed(1)}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground">Avg OD</p><p className="font-medium">{Math.round(stats.comparison.tribe.avgOD).toLocaleString()}</p></div>
                      </div>
                    ) : <p className="text-muted-foreground">No tribe data.</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">World average</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    {stats.comparison?.world ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-muted-foreground">Avg points</p><p className="font-medium">{Math.round(stats.comparison.world.avgPoints).toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground">Avg villages</p><p className="font-medium">{(stats.comparison.world.avgVillages ?? 0).toFixed(1)}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground">Avg OD</p><p className="font-medium">{Math.round(stats.comparison.world.avgOD).toLocaleString()}</p></div>
                      </div>
                    ) : <p className="text-muted-foreground">No world data.</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">OD</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <div><p className="text-muted-foreground">Off</p><p className="font-medium">{stats.overview.od.attacking.toLocaleString()}</p></div>
                      <div><p className="text-muted-foreground">Def</p><p className="font-medium">{stats.overview.od.defending.toLocaleString()}</p></div>
                      <div><p className="text-muted-foreground">Sup</p><p className="font-medium">{stats.overview.od.supporting.toLocaleString()}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  )
}

function BarChartSimple({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="var(--color-chart-1)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function sumRes(r: { wood: number; stone: number; iron: number; gold: number; food: number }): number {
  return r.wood + r.stone + r.iron + r.gold + r.food
}

