"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type WorldEvent = {
  id: string
  gameWorldId: string
  type: string
  scope: string
  name: string
  description?: string | null
  rewards?: any
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  startsAt: string
  endsAt: string
}

type Grouped = { active: WorldEvent[]; upcoming: WorldEvent[]; past: WorldEvent[] }

export default function EventsPage() {
  const [items, setItems] = useState<WorldEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/events`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error || "Failed to load events")
        if (!active) return
        setItems(json.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load events")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const grouped = useMemo<Grouped>(() => {
    const now = Date.now()
    const g: Grouped = { active: [], upcoming: [], past: [] }
    for (const ev of items) {
      const start = new Date(ev.startsAt).getTime()
      const end = new Date(ev.endsAt).getTime()
      if (now < start) g.upcoming.push(ev)
      else if (now > end) g.past.push(ev)
      else g.active.push(ev)
    }
    return g
  }, [items])

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading…</div>
  }
  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="font-semibold">Failed to load events</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Competitions</p>
          <h1 className="text-3xl font-semibold">World Events</h1>
          <p className="text-sm text-muted-foreground">Point races, conquest challenges, OD tournaments, and more.</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Active</h2>
          <EventGrid items={grouped.active} empty="No active events right now." />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Upcoming</h2>
          <EventGrid items={grouped.upcoming} empty="No upcoming events scheduled." />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Past</h2>
          <EventGrid items={grouped.past} empty="No past events to show." />
        </section>
      </div>
    </div>
  )
}

function EventGrid({ items, empty }: { items: WorldEvent[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((ev) => (
        <Card key={ev.id} className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge variant="outline">{ev.type}</Badge>
              {ev.name}
              <span className="ml-auto text-xs text-muted-foreground">{ev.scope.toLowerCase()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground line-clamp-2">{ev.description || "No description provided."}</p>
            <p className="text-xs text-muted-foreground">
              {formatRange(ev.startsAt, ev.endsAt)}
            </p>
            <Link href={`/events/${ev.id}`} className="text-primary text-sm hover:underline">
              View leaderboard and rules →
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) {
    return `${start.toLocaleString()} – ${end.toLocaleTimeString()}`
  }
  return `${start.toLocaleString()} → ${end.toLocaleString()}`
}

