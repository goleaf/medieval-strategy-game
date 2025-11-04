"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"

type LeaderboardType = "players" | "tribes" | "villages"

export default function LeaderboardPage() {
  const [data, setData] = useState<any[]>([])

  const fetchLeaderboard = async (newType: LeaderboardType) => {
    try {
      const res = await fetch(`/api/leaderboard?type=${newType}`)
      const result = await res.json()
      if (result.success && result.data) {
        setData(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error)
    }
  }

  useEffect(() => {
    fetchLeaderboard("players")
    if (typeof window !== "undefined") {
      (window as any).__leaderboardFetchHandler = fetchLeaderboard
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__leaderboardFetchHandler
      }
    }
  }, [])

  return (
    <div
      x-data={`{
        type: 'players',
        data: ${JSON.stringify(data)},
        loading: false,
        async switchType(newType) {
          this.type = newType;
          this.loading = true;
          if (window.__leaderboardFetchHandler) {
            await window.__leaderboardFetchHandler(newType);
            this.data = ${JSON.stringify(data)};
          }
          this.loading = false;
        }
      }`}
      x-init="switchType('players')"
      className="min-h-screen bg-background text-foreground"
    >
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
              x-on:click="switchType('players')"
              x-bind:variant="type === 'players' ? 'default' : 'outline'"
            >
              Players
            </Button>
            <Button
              x-on:click="switchType('tribes')"
              x-bind:variant="type === 'tribes' ? 'default' : 'outline'"
            >
              Tribes
            </Button>
            <Button
              x-on:click="switchType('villages')"
              x-bind:variant="type === 'villages' ? 'default' : 'outline'"
            >
              Villages
            </Button>
          </div>

          <div x-show="loading" className="text-center py-4">Loading...</div>
          <div x-show="!loading">
            <div x-show="type === 'players'">
              <TextTable
                headers={["Rank", "Player", "Points", "Tribe"]}
                rows={data.map((player, idx) => [
                  (idx + 1).toString(),
                  player.playerName,
                  player.totalPoints?.toLocaleString() || "0",
                  player.tribe?.tag || "-",
                ])}
              />
            </div>

            <div x-show="type === 'tribes'">
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
            </div>

            <div x-show="type === 'villages'">
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
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
