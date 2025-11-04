"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"

export default function LeaderboardPage() {
  const [type, setType] = useState<"players" | "tribes" | "villages">("players")
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [type])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?type=${type}`)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

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
              variant={type === "players" ? "default" : "outline"}
              onClick={() => setType("players")}
            >
              Players
            </Button>
            <Button
              variant={type === "tribes" ? "default" : "outline"}
              onClick={() => setType("tribes")}
            >
              Tribes
            </Button>
            <Button
              variant={type === "villages" ? "default" : "outline"}
              onClick={() => setType("villages")}
            >
              Villages
            </Button>
          </div>

          {type === "players" && (
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

          {type === "tribes" && (
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

          {type === "villages" && (
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
        </div>
      </main>
    </div>
  )
}
