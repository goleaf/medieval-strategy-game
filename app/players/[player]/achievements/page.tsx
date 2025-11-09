"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type AchievementView = {
  key: string
  title: string
  description?: string | null
  category: "ECONOMIC" | "MILITARY" | "SOCIAL" | "PROGRESSION" | "SPECIAL"
  status: "LOCKED" | "IN_PROGRESS" | "COMPLETED" | "CLAIMED"
  progress: number
  target: number
  favorite: boolean
  unlockedAt?: string | null
  claimedAt?: string | null
  rarity: "COMMON" | "RARE" | "LEGENDARY"
  reward?: { premiumPoints?: number; badgeKey?: string | null; title?: string | null }
}

type PageProps = { params: { player: string } }

export default function PlayerAchievementsPage({ params }: PageProps) {
  const playerId = decodeURIComponent(params.player)
  const { auth, initialized } = useAuth()
  const [items, setItems] = useState<AchievementView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<AchievementView["category"] | "ALL">("ALL")

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/players/achievements?playerId=${playerId}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error || "Failed to load achievements")
        if (!active) return
        setItems(json.data as AchievementView[])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load achievements")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [playerId])

  const filtered = useMemo(() => items.filter((i) => category === "ALL" || i.category === category), [items, category])

  const canAct = initialized && auth?.playerId === playerId

  const doClaim = async (key: string) => {
    if (!canAct || !auth?.token) return
    const res = await fetch(`/api/players/achievements/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ playerId, key }),
    })
    const json = await res.json()
    if (json.success) {
      setItems((prev) => prev.map((it) => (it.key === key ? { ...it, status: "CLAIMED", claimedAt: new Date().toISOString() } : it)))
    }
  }

  const toggleFavorite = async (key: string, next: boolean) => {
    if (!canAct || !auth?.token) return
    const res = await fetch(`/api/players/achievements/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ playerId, key, favorite: next }),
    })
    const json = await res.json()
    if (json.success) {
      setItems((prev) => prev.map((it) => (it.key === key ? { ...it, favorite: next } : it)))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading…</div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="font-semibold">Failed to load achievements</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  const categories: Array<AchievementView["category"] | "ALL"> = ["ALL", "ECONOMIC", "MILITARY", "SOCIAL", "PROGRESSION", "SPECIAL"]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Achievements</p>
            <h1 className="text-3xl font-semibold">Player Achievements</h1>
          </div>
          <Link href={`/players/${playerId}`} className="text-sm text-primary hover:underline">← Back to profile</Link>
        </header>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button key={c} variant={category === c ? "default" : "outline"} size="sm" onClick={() => setCategory(c)}>
              {c}
            </Button>
          ))}
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {filtered.map((a) => {
            const pct = Math.max(0, Math.min(100, Math.floor((a.progress / a.target) * 100)))
            const claimable = a.status === "COMPLETED" && !a.claimedAt
            return (
              <Card key={a.key} className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant="outline">{a.category}</Badge>
                    {a.title}
                    <span className="ml-auto text-xs text-muted-foreground">{a.rarity.toLowerCase()}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{a.description || ""}</p>
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>
                        {a.progress.toLocaleString()} / {a.target.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    {canAct && (
                      <Button size="sm" variant={a.favorite ? "secondary" : "outline"} onClick={() => toggleFavorite(a.key, !a.favorite)}>
                        {a.favorite ? "Unfavorite" : "Favorite"}
                      </Button>
                    )}
                    {canAct && claimable && (
                      <Button size="sm" onClick={() => doClaim(a.key)}>
                        Claim Reward{a.reward?.premiumPoints ? ` (+${a.reward.premiumPoints} PP)` : ""}
                      </Button>
                    )}
                    {!canAct && a.claimedAt && <Badge variant="secondary">Claimed</Badge>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>
      </div>
    </div>
  )
}

