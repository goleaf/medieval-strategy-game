"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

type WorldEvent = {
  id: string
  gameWorldId: string
  type: string
  scope: string
  name: string
  description?: string | null
  rules?: any
  rewards?: any
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  startsAt: string
  endsAt: string
}

type LeaderboardRow = { rank: number; participantId: string; participantName: string; score: number; metrics: Record<string, unknown> }

export default function EventDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [event, setEvent] = useState<WorldEvent | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [eRes, lbRes] = await Promise.all([
          fetch(`/api/events/${id}`),
          fetch(`/api/events/${id}/leaderboard?take=100`),
        ])
        const eJson = await eRes.json()
        const lbJson = await lbRes.json()
        if (!eJson.success) throw new Error(eJson.error || "Event load failed")
        if (!lbJson.success) throw new Error(lbJson.error || "Leaderboard load failed")
        if (!alive) return
        setEvent(eJson.data)
        setLeaderboard((lbJson.data?.leaderboard || []) as LeaderboardRow[])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load event")
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 10_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [id])

  const countdown = useCountdown(event?.startsAt, event?.endsAt)

  if (loading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading…</div>
  if (error || !event) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">{error || "Event not found"}</div>

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <Link href="/events" className="text-sm text-primary hover:underline">← Back to events</Link>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Badge variant="outline">{event.type}</Badge>
            {event.name}
            <span className="ml-auto text-sm text-muted-foreground">{countdown.label}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{event.description || "No description provided"}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rules & Rewards</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <pre className="bg-muted/30 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(event.rules || {}, null, 2)}</pre>
              {event.rewards && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Rewards</p>
                  <pre className="bg-muted/30 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(event.rewards || {}, null, 2)}</pre>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{formatRange(event.startsAt, event.endsAt)}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Leaderboard (Top 100)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border text-sm">
                  <thead>
                    <tr>
                      <th className="border border-border bg-secondary p-2 text-left">#</th>
                      <th className="border border-border bg-secondary p-2 text-left">Participant</th>
                      <th className="border border-border bg-secondary p-2 text-left">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="border border-border p-3 text-center text-muted-foreground">No entries yet</td>
                      </tr>
                    ) : (
                      leaderboard.map((row) => (
                        <tr key={row.rank} className="hover:bg-secondary/50">
                          <td className="border border-border p-2">{row.rank}</td>
                          <td className="border border-border p-2">{row.participantName}</td>
                          <td className="border border-border p-2">{row.score.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function useCountdown(start?: string, end?: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const label = useMemo(() => {
    if (!start || !end) return ""
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    if (now < s) return `Starts in ${formatDelta(s - now)}`
    if (now > e) return "Completed"
    return `Ends in ${formatDelta(e - now)}`
  }, [now, start, end])
  return { label }
}

function formatDelta(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${h}h ${m}m ${s}s`
}

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) return `${start.toLocaleString()} – ${end.toLocaleTimeString()}`
  return `${start.toLocaleString()} → ${end.toLocaleString()}`
}

