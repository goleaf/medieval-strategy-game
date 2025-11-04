"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

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
    const interval = setInterval(fetchLeaderboard, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Global Leaderboard</h1>

        {loading ? (
          <Card className="p-6 text-center">Loading...</Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    <th className="p-4 text-left font-bold">#</th>
                    <th className="p-4 text-left font-bold">Player</th>
                    <th className="p-4 text-left font-bold">Tribe</th>
                    <th className="p-4 text-right font-bold">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-secondary/50">
                      <td className="p-4 font-bold">{entry.rank}</td>
                      <td className="p-4">{entry.playerName}</td>
                      <td className="p-4 font-mono text-xs">{entry.tribe?.tag || "-"}</td>
                      <td className="p-4 text-right font-mono font-bold">{entry.totalPoints.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
