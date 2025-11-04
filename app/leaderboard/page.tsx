"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"

type LeaderboardType = "players" | "tribes" | "villages"

export default function LeaderboardPage() {
  const [data, setData] = useState<any[]>([])
  const [type, setType] = useState<LeaderboardType>("players")
  const [loading, setLoading] = useState(false)

  const fetchLeaderboard = async (newType: LeaderboardType) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/leaderboard?type=${newType}`)
      const result = await res.json()
      if (result.success && result.data) {
        setData(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const switchType = async (newType: LeaderboardType) => {
    setType(newType)
    await fetchLeaderboard(newType)
  }

  useEffect(() => {
    switchType("players")
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">📊 Leaderboard</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => switchType('players')}
              variant={type === 'players' ? 'default' : 'outline'}
            >
              Players
            </Button>
            <Button
              onClick={() => switchType('tribes')}
              variant={type === 'tribes' ? 'default' : 'outline'}
            >
              Tribes
            </Button>
            <Button
              onClick={() => switchType('villages')}
              variant={type === 'villages' ? 'default' : 'outline'}
            >
              Villages
            </Button>
          </div>

          {loading && <div className="text-center py-4">Loading...</div>}
          {!loading && (
            <>
              {type === 'players' && (
                <TextTable
                  headers={["Rank", "Player", "Points", "Tribe"]}
                  rows={data.map((player, idx) => [
                    (idx + 1).toString(),
                    player.playerName,
                    player.totalPoints?.toLocaleString() || "0",
                    player.tribe?.tag || "-",
                  ])}
                />
              )}

              {type === 'tribes' && (
                <TextTable
                  headers={["Rank", "Tribe", "Tag", "Points", "Members", "Leader"]}
                  rows={data.map((tribe, idx) => [
                    (idx + 1).toString(),
                    tribe.name,
                    tribe.tag,
                    tribe.totalPoints?.toLocaleString() || "0",
                    tribe.memberCount?.toString() || "0",
                    tribe.leader?.playerName || "-",
                  ])}
                />
              )}

              {type === 'villages' && (
                <TextTable
                  headers={["Rank", "Village", "Position", "Player", "Points"]}
                  rows={data.map((village, idx) => [
                    (idx + 1).toString(),
                    village.name,
                    `(${village.x}, ${village.y})`,
                    village.player?.playerName || "-",
                    village.points?.toLocaleString() || "0",
                  ])}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
