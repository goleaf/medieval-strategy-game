"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [worldConfig, setWorldConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("stats")
  const [loading, setLoading] = useState(false)

  const fetchData = async (tab: string) => {
    try {
      setLoading(true)
      if (tab === "stats") {
        const res = await fetch("/api/admin/stats")
        const data = await res.json()
        if (data.success && data.data) {
          setStats(data.data)
        }
      } else if (tab === "players") {
        const res = await fetch("/api/admin/players")
        const data = await res.json()
        if (data.success && data.data) {
          setPlayers(data.data)
        }
      } else if (tab === "world") {
        const res = await fetch("/api/admin/world/config")
        const data = await res.json()
        if (data.success && data.data) {
          setWorldConfig(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  const switchTab = async (tab: string) => {
    setActiveTab(tab)
    await fetchData(tab)
  }

  const handleViewUnitBalance = async () => {
    const res = await fetch('/api/admin/units/balance')
    const data = await res.json()
    if (data.success && data.data) {
      console.log('Unit balance:', data.data)
    }
  }

  useEffect(() => {
    switchTab("stats")
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back to Game
          </Link>
          <h1 className="text-xl font-bold">⚙️ Admin Dashboard</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex gap-2 border-b border-border">
            <Button
              onClick={() => switchTab('stats')}
              variant={activeTab === 'stats' ? 'default' : 'ghost'}
            >
              Statistics
            </Button>
            <Button
              onClick={() => switchTab('players')}
              variant={activeTab === 'players' ? 'default' : 'ghost'}
            >
              Players
            </Button>
            <Button
              onClick={() => switchTab('world')}
              variant={activeTab === 'world' ? 'default' : 'ghost'}
            >
              World Config
            </Button>
            <Button
              onClick={() => switchTab('units')}
              variant={activeTab === 'units' ? 'default' : 'ghost'}
            >
              Unit Balance
            </Button>
          </div>

          {loading && <div className="text-center py-8">Loading...</div>}
          {!loading && (
            <>
              {activeTab === 'stats' && stats && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">System Statistics</h2>
                  <TextTable
                    headers={["Metric", "Value"]}
                    rows={[
                      ["Online Users", stats.onlineUsers?.toString() || "0"],
                      ["Online Players", stats.onlinePlayers?.toString() || "0"],
                      ["Total Players", stats.totalPlayers?.toString() || "0"],
                      ["Total Villages", stats.totalVillages?.toString() || "0"],
                      ["Active Attacks", stats.activeAttacks?.toString() || "0"],
                      ["Game Status", stats.gameStatus || "Unknown"],
                      ["World Speed", stats.worldSpeed?.toString() || "1"],
                    ]}
                  />
                </div>
              )}

              {activeTab === 'players' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Player Management</h2>
                  <TextTable
                    headers={["Player", "Points", "Rank", "Villages", "Status", "Actions"]}
                    rows={players.map((player) => [
                      player.playerName,
                      player.totalPoints?.toLocaleString() || "0",
                      player.rank?.toString() || "-",
                      player.villages?.length?.toString() || "0",
                      player.isDeleted ? "Deleted" : player.banReason ? "Banned" : "Active",
                      <div key={player.id} className="flex gap-1">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          Ban
                        </Button>
                      </div>,
                    ])}
                  />
                </div>
              )}

              {activeTab === 'world' && worldConfig && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">World Configuration</h2>
                  <TextTable
                    headers={["Setting", "Value"]}
                    rows={[
                      ["World Name", worldConfig.worldName || "Medieval World"],
                      ["Max X", worldConfig.maxX?.toString() || "100"],
                      ["Max Y", worldConfig.maxY?.toString() || "100"],
                      ["Speed", worldConfig.speed?.toString() || "1"],
                      ["Unit Speed", worldConfig.unitSpeed?.toString() || "1.0"],
                      ["Resource Per Tick", worldConfig.resourcePerTick?.toString() || "10"],
                      ["Production Multiplier", worldConfig.productionMultiplier?.toString() || "1.0"],
                      ["Tick Interval (minutes)", worldConfig.tickIntervalMinutes?.toString() || "5"],
                      ["Night Bonus", worldConfig.nightBonusMultiplier?.toString() || "1.2"],
                      ["Beginner Protection (hours)", worldConfig.beginnerProtectionHours?.toString() || "72"],
                      ["Game Running", worldConfig.isRunning ? "Yes" : "No"],
                    ]}
                  />
                  <Button variant="outline">Edit Configuration</Button>
                </div>
              )}

              {activeTab === 'units' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Unit Balance</h2>
                  <p className="text-sm text-muted-foreground">
                    View and manage troop balance settings
                  </p>
                  <Button variant="outline" onClick={handleViewUnitBalance}>
                    View Unit Balance
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
