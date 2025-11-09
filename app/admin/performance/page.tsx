"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextTable } from "@/components/game/text-table"
import { PerfBarChart } from "@/components/admin/perf-bar-chart"
import { PerfLineChart } from "@/components/admin/perf-line-chart"

type Metrics = Record<string, {
  count: number
  errors: number
  errorRate: number
  lastMs: number
  avgMs: number
  p50: number
  p95: number
  p99: number
}>

export default function AdminPerformancePage() {
  const [metrics, setMetrics] = useState<Metrics>({})
  const [timestamp, setTimestamp] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("")
  const [history, setHistory] = useState<Array<{ route: string; minute: string; count: number; avg: number; p50: number; p95: number }>>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [minutes, setMinutes] = useState(60)
  const [selectedRoute, setSelectedRoute] = useState<string>("")
  const [topRoutes, setTopRoutes] = useState<string[]>([])

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/perf', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` }
      })
      const data = await res.json()
      if (data.success && data.data) {
        setMetrics(data.data.metrics || {})
        setTimestamp(data.data.timestamp || new Date().toISOString())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredEntries = useMemo(() => {
    const entries = Object.entries(metrics)
    if (!filter) return entries
    return entries.filter(([route]) => route.toLowerCase().includes(filter.toLowerCase()))
  }, [metrics, filter])

  async function loadHistory() {
    try {
      setHistoryLoading(true)
      const params = new URLSearchParams({ minutes: String(minutes) })
      if (filter) params.set("route", filter)
      const res = await fetch(`/api/admin/perf/history?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` }
      })
      const data = await res.json()
      if (data.success && data.data?.series) {
        setHistory(data.data.series)
        if (!selectedRoute && data.data.series.length > 0) {
          setSelectedRoute(data.data.series[0].route)
        }
        // Compute top 5 routes by volume
        const counts: Record<string, number> = {}
        for (const s of data.data.series as any[]) counts[s.route] = (counts[s.route] || 0) + s.count
        setTopRoutes(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r]) => r))
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">API Performance</h1>
          <div className="flex gap-2 items-center">
            <Input className="w-64" placeholder="Filter by route" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
            <Link href="/admin/performance/explorer"><Button variant="outline">Explorer</Button></Link>
            <Link href="/admin/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
          </div>
        </div>

      {filteredEntries.length > 0 ? (
        <PerfBarChart data={filteredEntries.map(([route, m]) => ({
          route,
          count: m.count,
          errors: m.errors,
          errorRate: m.errorRate,
          lastMs: m.lastMs,
          avgMs: m.avgMs,
          p50: m.p50,
          p95: m.p95,
          p99: m.p99,
        }))} onSelectRoute={(r) => {
          window.location.assign(`/admin/performance/explorer?route=${encodeURIComponent(r)}&minutes=${minutes}`)
        }} />
      ) : (
        <p className="text-sm">No metrics to display. Hit some endpoints and refresh.</p>
      )}

      <TextTable
        headers={["Route", "Count", "Errors", "Error Rate", "p50", "p95", "p99", "Avg", "Last"]}
        rows={filteredEntries.map(([route, m]) => [
          route,
          String(m.count || 0),
          String(m.errors || 0),
          ((m.errorRate || 0) * 100).toFixed(1) + "%",
          `${Math.round(m.p50 || 0)} ms`,
          `${Math.round(m.p95 || 0)} ms`,
          `${Math.round(m.p99 || 0)} ms`,
          `${Math.round(m.avgMs || 0)} ms`,
          `${Math.round(m.lastMs || 0)} ms`,
        ])}
      />

      <p className="text-xs text-muted-foreground">Last updated: {timestamp ? new Date(timestamp).toLocaleString() : '-'}</p>

      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Persisted History</h2>
          <Input className="w-28" type="number" min={5} max={1440} value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value || '60'))} />
          <Button variant="outline" onClick={loadHistory} disabled={historyLoading}>Load last {minutes}m</Button>
          <select className="border rounded px-2 py-1 bg-background" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
            {[...new Set(history.map(h => h.route))].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {selectedRoute && (
          <div className="w-full h-48 border border-border rounded bg-card">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              {(() => {
                const points = history.filter(h => h.route === selectedRoute).sort((a, b) => a.minute.localeCompare(b.minute))
                if (points.length === 0) return null
                const max = Math.max(1, ...points.map(p => p.p95))
                const step = 100 / Math.max(1, points.length - 1)
                const d = points.map((p, idx) => {
                  const x = idx * step
                  const y = 100 - (p.p95 / max) * 90 - 5
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ')
                return <path d={d} stroke="#16a34a" strokeWidth="1.5" fill="none" />
              })()}
            </svg>
          </div>
        )}
      </div>

      {history.length > 0 && topRoutes.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-lg font-bold">Top Routes p95 (last {minutes}m)</h2>
          {(() => {
            const map = new Map<string, any>()
            for (const s of history) {
              if (!topRoutes.includes(s.route)) continue
              const entry = map.get(s.minute) || { minute: s.minute }
              entry[s.route] = s.p95
              map.set(s.minute, entry)
            }
            const data = Array.from(map.values()).sort((a, b) => String(a.minute).localeCompare(String(b.minute)))
            return <PerfLineChart data={data} routes={topRoutes} onLegendClick={(r) => {
              window.location.assign(`/admin/performance/explorer?route=${encodeURIComponent(r)}&minutes=${minutes}`)
            }} />
          })()}
        </div>
      )}
    </div>
  )
}
