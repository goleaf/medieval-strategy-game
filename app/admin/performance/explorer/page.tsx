"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PerfLineChart } from "@/components/admin/perf-line-chart"
import { useToast } from "@/components/ui/use-toast"
import { TextTable } from "@/components/game/text-table"

type Row = { id: number; createdAt: string; route: string; durationMs: number; status: number; traceId: string | null }

export default function MetricsExplorerPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(200)
  const [route, setRoute] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ route: string; minute: string; count: number; avg: number; p50: number; p95: number }>>([])
  const [minutes, setMinutes] = useState(60)
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [extraParams, setExtraParams] = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (route) params.set("route", route)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const res = await fetch(`/api/admin/perf/query?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` },
      })
      const json = await res.json()
      if (json.success) {
        setRows(json.data.rows)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initialize from query params
    const qRoute = searchParams.get('route') || ''
    const qMinutes = searchParams.get('minutes')
    if (qRoute) setRoute(qRoute)
    if (qMinutes && !Number.isNaN(Number(qMinutes))) setMinutes(Number(qMinutes))
    load()
    // Auto-load history for deep links
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pageCount = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(offset / limit) + 1

  function goPage(p: number) {
    const clamped = Math.max(1, Math.min(pageCount, p))
    setOffset((clamped - 1) * limit)
  }

  useEffect(() => { load() }, [offset, limit])
  useEffect(() => { setOffset(0); load() }, [route])

  async function loadHistory() {
    const params = new URLSearchParams({ minutes: String(minutes) })
    if (route) params.set("route", route)
    const res = await fetch(`/api/admin/perf/history?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` },
    })
    const json = await res.json()
    if (json.success) {
      setHistory(json.data.series)
      // Default to top 5 routes by sample count
      const counts: Record<string, number> = {}
      for (const s of json.data.series as typeof history) counts[s.route] = (counts[s.route] || 0) + s.count
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r]) => r)
      setSelectedRoutes(top)
    }
  }

  const lineChartData = (() => {
    if (history.length === 0 || selectedRoutes.length === 0) return [] as any[]
    const map = new Map<string, any>()
    for (const s of history) {
      if (!selectedRoutes.includes(s.route)) continue
      const entry = map.get(s.minute) || { minute: s.minute }
      entry[s.route] = s.p95
      map.set(s.minute, entry)
    }
    return Array.from(map.values()).sort((a, b) => String(a.minute).localeCompare(String(b.minute)))
  })()

  function buildCurl(row: Row) {
    const label = row.route || "GET /"
    const [methodRaw, ...rest] = label.split(" ")
    const method = ["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"].includes(methodRaw) ? methodRaw : "GET"
    const path = rest.join(" ") || row.route
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const token = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') || '') : ''
    const authHeader = token ? ` -H "Authorization: Bearer ${token}"` : ''
    const url = extraParams ? `${origin}${path}${path.includes('?') ? '&' : '?'}${extraParams}` : `${origin}${path}`
    const jsonHeader = (method !== 'GET' && method !== 'HEAD') ? ' -H "Content-Type: application/json"' : ''
    return `curl -i -X ${method} "${url}"${authHeader}${jsonHeader}`
  }

  async function copyCurl(row: Row) {
    try {
      const cmd = buildCurl(row)
      await navigator.clipboard.writeText(cmd)
      toast({ title: 'Copied', description: 'cURL command copied to clipboard.' })
    } catch (e: any) {
      toast({ title: 'Copy failed', description: String(e?.message || e), variant: 'destructive' })
    }
  }

  function buildFetch(row: Row) {
    const label = row.route || "GET /"
    const [methodRaw, ...rest] = label.split(" ")
    const method = ["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"].includes(methodRaw) ? methodRaw : "GET"
    const path = rest.join(" ") || row.route
    const token = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') || '') : ''
    const lines: string[] = []
    lines.push(`const origin = window.location.origin`)
    lines.push(`const url = new URL('${path}', origin)`)    
    if (extraParams) {
      lines.push(`'${extraParams}'.split('&').forEach(kv => { const [k,v] = kv.split('='); if(k) url.searchParams.set(k, v ?? '') })`)
    }
    const headers: string[] = []
    if (token) headers.push("Authorization: 'Bearer " + token + "'")
    if (method !== 'GET' && method !== 'HEAD') headers.push("'Content-Type': 'application/json'")
    lines.push(`const headers = { ${headers.join(', ')} }`)
    if (method !== 'GET' && method !== 'HEAD') {
      lines.push(`const body = JSON.stringify({ /* TODO: payload */ })`)
      lines.push(`const res = await fetch(url.toString(), { method: '${method}', headers, body })`)
    } else {
      lines.push(`const res = await fetch(url.toString(), { method: '${method}', headers })`)
    }
    lines.push(`const data = await res.json()`)
    lines.push(`console.log(data)`)
    return lines.join('\n')
  }

  async function copyFetch(row: Row) {
    try {
      const code = buildFetch(row)
      await navigator.clipboard.writeText(code)
      toast({ title: 'Copied', description: 'Fetch snippet copied to clipboard.' })
    } catch (e: any) {
      toast({ title: 'Copy failed', description: String(e?.message || e), variant: 'destructive' })
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Metrics Explorer</h1>
        <Link href="/admin/performance"><Button variant="outline">Back</Button></Link>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs block mb-1">Route contains</label>
          <Input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="e.g. /api/villages" className="w-64" />
        </div>
        <div>
          <label className="text-xs block mb-1">From (ISO)</label>
          <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2025-11-11T00:00:00Z" className="w-64" />
        </div>
        <div>
          <label className="text-xs block mb-1">To (ISO)</label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2025-11-11T23:59:59Z" className="w-64" />
        </div>
        <div>
          <label className="text-xs block mb-1">Limit</label>
          <Input type="number" min={10} max={1000} value={limit} onChange={(e) => setLimit(parseInt(e.target.value || '200'))} className="w-28" />
        </div>
        <Button onClick={() => { setOffset(0); load() }} disabled={loading}>Query</Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">Total: {total.toLocaleString()} | Page {currentPage} of {pageCount}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => goPage(currentPage - 1)} disabled={currentPage <= 1}>Prev</Button>
          <Button variant="outline" onClick={() => goPage(currentPage + 1)} disabled={currentPage >= pageCount}>Next</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Extra params (query string)</label>
        <Input className="w-96" value={extraParams} onChange={(e) => setExtraParams(e.target.value)} placeholder="foo=1&bar=2" />
      </div>

      <TextTable
        headers={["Time", "Route", "ms", "Status", "Trace", "cURL", "Fetch"]}
        rows={rows.map(r => [
          new Date(r.createdAt).toLocaleString(),
          r.route,
          String(r.durationMs),
          String(r.status),
          r.traceId || "-",
          <Button key={`curl-${r.id}`} variant="outline" size="sm" onClick={() => copyCurl(r)}>Copy cURL</Button>,
          <Button key={`fetch-${r.id}`} variant="outline" size="sm" onClick={() => copyFetch(r)}>Copy Fetch</Button>,
        ])}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Top Routes (p95 over time)</h2>
          <Input className="w-28" type="number" min={5} max={1440} value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value || '60'))} />
          <Button variant="outline" onClick={loadHistory}>Load last {minutes}m</Button>
        </div>
        {history.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              {[...new Set(history.map(h => h.route))].slice(0, 12).map(r => (
                <label key={r} className="flex items-center gap-1 border rounded px-2 py-1">
                  <input type="checkbox" checked={selectedRoutes.includes(r)} onChange={(e) => {
                    setSelectedRoutes((prev) => e.target.checked ? [...prev, r] : prev.filter(x => x !== r))
                  }} />
                  {r}
                </label>
              ))}
            </div>
            <PerfLineChart data={lineChartData} routes={selectedRoutes} onLegendClick={(r) => setSelectedRoutes([r])} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Run a history query to see trends.</p>
        )}
      </div>
    </div>
  )
}
