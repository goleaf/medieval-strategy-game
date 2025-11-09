"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TextTable } from "@/components/game/text-table"

type FeedbackItem = {
  id: number
  createdAt: string | Date
  playerId?: string
  category: string
  severity: "low" | "medium" | "high"
  summary: string
  details?: string
  contact?: string
  status: "open" | "triaged" | "resolved"
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/feedback', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` }
      })
      const data = await res.json()
      if (data.success && data.data?.feedback) {
        setItems(data.data.feedback)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.status !== statusFilter) return false
      if (search) {
        const hay = `${it.summary} ${it.details || ''} ${it.category} ${it.playerId || ''}`.toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [items, statusFilter, search])

  async function updateStatus(id: number, status: FeedbackItem['status']) {
    const res = await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` },
      body: JSON.stringify({ id, status })
    })
    const data = await res.json()
    if (data.success) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)))
    } else {
      alert(data.error || 'Failed to update status')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Player Feedback</h1>
        <div className="flex gap-2">
          <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="triaged">Triaged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Link href="/admin/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>

      {loading && <div>Loading…</div>}

      {!loading && (
        <TextTable
          headers={["ID", "Created", "Player", "Category", "Severity", "Summary", "Status"]}
          rows={filtered.map((f) => [
            String(f.id),
            new Date(f.createdAt).toLocaleString(),
            f.playerId || "-",
            f.category,
            f.severity,
            f.summary,
            <select
              key={`status-${f.id}`}
              className="border rounded px-2 py-1 bg-background"
              value={f.status}
              onChange={(e) => updateStatus(f.id, e.target.value as any)}
            >
              <option value="open">open</option>
              <option value="triaged">triaged</option>
              <option value="resolved">resolved</option>
            </select>,
          ])}
        />
      )}
    </div>
  )
}
