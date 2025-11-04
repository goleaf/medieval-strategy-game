"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/game/navbar"

interface LeaderboardEntry {
  id: string
  playerName: string
  totalPoints: number
  rank: number
  tribe?: { tag: string }
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [villages] = useState<any[]>([])

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard")
        const data = await res.json()
        setEntries(data)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        villages={villages}
        currentVillageId={null}
        onVillageChange={() => {}}
        notificationCount={0}
      />
      
      <main className="flex-1 w-full p-4">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Global Leaderboard</h1>

          {loading ? (
            <section>
              <p>Loading...</p>
            </section>
          ) : (
            <section>
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr>
                    <th className="border border-border p-2 text-left bg-secondary">Rank</th>
                    <th className="border border-border p-2 text-left bg-secondary">Player</th>
                    <th className="border border-border p-2 text-left bg-secondary">Tribe</th>
                    <th className="border border-border p-2 text-right bg-secondary">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-border p-4 text-center text-muted-foreground">
                        No entries yet
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="border border-border p-2 font-bold">{entry.rank}</td>
                        <td className="border border-border p-2">{entry.playerName}</td>
                        <td className="border border-border p-2 font-mono text-sm">{entry.tribe?.tag || "-"}</td>
                        <td className="border border-border p-2 text-right font-mono font-bold">
                          {entry.totalPoints.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
