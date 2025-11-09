"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AdminNotificationGroupingPage() {
  const [distribution, setDistribution] = useState<Array<{ groupingWindowMinutes: number; _count: { _all: number } }>>([])
  const [total, setTotal] = useState(0)
  const [minutes, setMinutes] = useState(60)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch('/api/admin/notifications/grouping', { headers })
        const json = await res.json()
        if (json.success) {
          setDistribution(json.data.distribution)
          setTotal(json.data.total)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const updateAll = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    await fetch('/api/admin/notifications/grouping', { method: 'PUT', headers, body: JSON.stringify({ groupingWindowMinutes: minutes }) })
    location.reload()
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notification Grouping</h1>
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm">Set grouping window (minutes):</label>
          <Input type="number" value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value || '0', 10))} className="w-32" />
          <Button onClick={updateAll}>Apply to all players</Button>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Current Distribution</h2>
        <ul className="space-y-1 text-sm">
          {distribution.map((d) => (
            <li key={d.groupingWindowMinutes}>
              {d.groupingWindowMinutes} minutes — {d._count._all} players
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">Total players with preferences: {total}</p>
      </Card>
    </div>
  )
}

