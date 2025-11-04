"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface Player {
  id: string
  playerName: string
  totalPoints: number
  rank: number
  isDeleted: boolean
  villages?: Array<{ id: string; name: string; x: number; y: number }>
}

interface WorldConfig {
  id: string
  worldName: string
  speed: number
  unitSpeed: number
  isRunning: boolean
  resourcePerTick: number
  productionMultiplier: number
  tickIntervalMinutes: number
  constructionQueueLimit: number
  nightBonusMultiplier: number
  beginnerProtectionHours: number
  beginnerProtectionEnabled: boolean
}

interface TroopBalance {
  type: string
  cost: { wood: number; stone: number; iron: number; gold: number; food: number }
  stats: { attack: number; defense: number; speed: number; health: number }
}

interface Stats {
  onlineUsers: number
  onlinePlayers: number
  actionsPerMinute: number
  avgActionsPerMinute: number
  queuedJobsDepth: number
  totalPlayers: number
  totalVillages: number
  activeAttacks: number
  worldSpeed: number
  gameRunning: boolean
}

export default function AdminDashboard() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [worldConfig, setWorldConfig] = useState<WorldConfig | null>(null)
  const [troopBalances, setTroopBalances] = useState<TroopBalance[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [errorLogs, setErrorLogs] = useState<Array<{ timestamp: string; message: string; error: string }>>([])

  // Player moderation states
  const [renameName, setRenameName] = useState("")
  const [moveVillageId, setMoveVillageId] = useState("")
  const [moveX, setMoveX] = useState("")
  const [moveY, setMoveY] = useState("")

  // World config states
  const [configForm, setConfigForm] = useState<Partial<WorldConfig>>({})

  // Map tools states
  const [spawnX, setSpawnX] = useState("")
  const [spawnY, setSpawnY] = useState("")
  const [spawnWarriors, setSpawnWarriors] = useState("100")
  const [spawnSpearmen, setSpawnSpearmen] = useState("50")
  const [spawnBowmen, setSpawnBowmen] = useState("30")
  const [spawnHorsemen, setSpawnHorsemen] = useState("10")
  const [relocateVillageId, setRelocateVillageId] = useState("")
  const [relocateX, setRelocateX] = useState("")
  const [relocateY, setRelocateY] = useState("")

  useEffect(() => {
    fetchPlayers()
    fetchWorldConfig()
    fetchTroopBalances()
    fetchStats()
    const statsInterval = setInterval(fetchStats, 30000) // Update stats every 30 seconds
    return () => clearInterval(statsInterval)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== "") {
        fetchPlayers()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`/api/admin/players?search=${search}`)
      const data = await res.json()
      setPlayers(data.players || [])
    } catch (error) {
      console.error("Failed to fetch players:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorldConfig = async () => {
    try {
      const res = await fetch("/api/admin/world/config")
      const data = await res.json()
      setWorldConfig(data)
      setConfigForm(data)
    } catch (error) {
      console.error("Failed to fetch world config:", error)
    }
  }

  const fetchTroopBalances = async () => {
    try {
      const res = await fetch("/api/admin/units/balance")
      const data = await res.json()
      setTroopBalances(data.balances || [])
    } catch (error) {
      console.error("Failed to fetch troop balances:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats")
      const data = await res.json()
      setStats(data.stats)
      setErrorLogs(data.errorLogs || [])
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const handleBanPlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to ban this player?")) return

    try {
      await fetch(`/api/admin/players/${playerId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin ban", duration: "permanent" }),
      })
      fetchPlayers()
    } catch (error) {
      console.error("Ban failed:", error)
      alert("Failed to ban player")
    }
  }

  const handleUnbanPlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to unban this player?")) return

    try {
      await fetch(`/api/admin/players/${playerId}/unban`, {
        method: "POST",
      })
      fetchPlayers()
    } catch (error) {
      console.error("Unban failed:", error)
      alert("Failed to unban player")
    }
  }

  const handleRenamePlayer = async (playerId: string) => {
    if (!renameName.trim()) {
      alert("Please enter a new name")
      return
    }

    try {
      const res = await fetch(`/api/admin/players/${playerId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: renameName }),
      })
      const data = await res.json()
      if (res.ok) {
        alert("Player renamed successfully")
        setRenameName("")
        setSelectedPlayer(null)
        fetchPlayers()
      } else {
        alert(data.error || "Failed to rename player")
      }
    } catch (error) {
      console.error("Rename failed:", error)
      alert("Failed to rename player")
    }
  }

  const handleMoveVillage = async (playerId: string) => {
    if (!moveVillageId || !moveX || !moveY) {
      alert("Please fill all fields")
      return
    }

    try {
      const res = await fetch(`/api/admin/players/${playerId}/move-village`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: moveVillageId,
          newX: parseInt(moveX),
          newY: parseInt(moveY),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert("Village moved successfully")
        setMoveVillageId("")
        setMoveX("")
        setMoveY("")
        setSelectedPlayer(null)
        fetchPlayers()
      } else {
        alert(data.error || "Failed to move village")
      }
    } catch (error) {
      console.error("Move village failed:", error)
      alert("Failed to move village")
    }
  }

  const handleUpdateWorldConfig = async () => {
    try {
      const res = await fetch("/api/admin/world/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      })
      if (res.ok) {
        alert("World config updated successfully")
        fetchWorldConfig()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update world config")
      }
    } catch (error) {
      console.error("Update world config failed:", error)
      alert("Failed to update world config")
    }
  }

  const handleSpawnBarbarian = async () => {
    if (!spawnX || !spawnY) {
      alert("Please enter coordinates")
      return
    }

    try {
      const res = await fetch("/api/admin/map/spawn-barbarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x: parseInt(spawnX),
          y: parseInt(spawnY),
          warriors: parseInt(spawnWarriors) || 0,
          spearmen: parseInt(spawnSpearmen) || 0,
          bowmen: parseInt(spawnBowmen) || 0,
          horsemen: parseInt(spawnHorsemen) || 0,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert("Barbarian spawned successfully")
        setSpawnX("")
        setSpawnY("")
      } else {
        alert(data.error || "Failed to spawn barbarian")
      }
    } catch (error) {
      console.error("Spawn barbarian failed:", error)
      alert("Failed to spawn barbarian")
    }
  }

  const handleRelocateTile = async () => {
    if (!relocateVillageId || !relocateX || !relocateY) {
      alert("Please fill all fields")
      return
    }

    try {
      const res = await fetch("/api/admin/map/relocate-tile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: relocateVillageId,
          newX: parseInt(relocateX),
          newY: parseInt(relocateY),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert("Tile relocated successfully")
        setRelocateVillageId("")
        setRelocateX("")
        setRelocateY("")
      } else {
        alert(data.error || "Failed to relocate tile")
      }
    } catch (error) {
      console.error("Relocate tile failed:", error)
      alert("Failed to relocate tile")
    }
  }

  const handleWipeEmpty = async () => {
    if (!confirm("Are you sure you want to wipe all empty villages? This cannot be undone.")) return

    try {
      const res = await fetch("/api/admin/map/wipe-empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Wiped ${data.count || 0} empty villages`)
      } else {
        alert(data.error || "Failed to wipe empty villages")
      }
    } catch (error) {
      console.error("Wipe empty failed:", error)
      alert("Failed to wipe empty villages")
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="world">World</TabsTrigger>
            <TabsTrigger value="units">Units</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4">
            {stats && (
              <section>
                <h2 className="text-lg font-bold mb-2">System Statistics</h2>
                <table className="w-full border-collapse border border-border">
                  <tbody>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Online Users</th>
                      <td className="border border-border p-2 text-right font-mono font-bold">{stats.onlineUsers}</td>
                    </tr>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Online Players</th>
                      <td className="border border-border p-2 text-right font-mono font-bold">{stats.onlinePlayers}</td>
                    </tr>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Actions/Min</th>
                      <td className="border border-border p-2 text-right font-mono font-bold">
                        {stats.actionsPerMinute} (avg: {stats.avgActionsPerMinute})
                      </td>
                    </tr>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Queued Jobs</th>
                      <td className="border border-border p-2 text-right font-mono font-bold">{stats.queuedJobsDepth}</td>
                    </tr>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Total Players</th>
                      <td className="border border-border p-2 text-right font-mono font-bold">{stats.totalPlayers}</td>
                    </tr>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Total Villages</th>
                      <td className="border border-border p-2 text-right font-mono font-bold">{stats.totalVillages}</td>
                    </tr>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Active Attacks</th>
                      <td className="border border-border p-2 text-right font-mono font-bold">{stats.activeAttacks}</td>
                    </tr>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Game Status</th>
                      <td className={`border border-border p-2 text-right font-bold ${stats.gameRunning ? "text-green-600" : "text-red-600"}`}>
                        {stats.gameRunning ? "Running" : "Paused"} ({stats.worldSpeed}x)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}
          </TabsContent>

          <TabsContent value="world" className="space-y-4">
            {worldConfig && (
              <Card className="p-6 space-y-4">
                <h2 className="font-bold text-lg">World Configuration</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">World Name</label>
                    <input
                      type="text"
                      value={configForm.worldName || ""}
                      onChange={(e) => setConfigForm({ ...configForm, worldName: e.target.value })}
                      className="w-full p-2 border border-border rounded bg-background mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Speed</label>
                    <input
                      type="number"
                      value={configForm.speed || 1}
                      onChange={(e) => setConfigForm({ ...configForm, speed: parseInt(e.target.value) })}
                      className="w-full p-2 border border-border rounded bg-background mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Night Bonus Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.nightBonusMultiplier || 1.2}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, nightBonusMultiplier: parseFloat(e.target.value) })
                      }
                      className="w-full p-2 border border-border rounded bg-background mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Beginner Protection Hours</label>
                    <input
                      type="number"
                      value={configForm.beginnerProtectionHours || 72}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, beginnerProtectionHours: parseInt(e.target.value) })
                      }
                      className="w-full p-2 border border-border rounded bg-background mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Resource Per Tick</label>
                    <input
                      type="number"
                      value={configForm.resourcePerTick || 10}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, resourcePerTick: parseInt(e.target.value) })
                      }
                      className="w-full p-2 border border-border rounded bg-background mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Production Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.productionMultiplier || 1.0}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, productionMultiplier: parseFloat(e.target.value) })
                      }
                      className="w-full p-2 border border-border rounded bg-background mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={configForm.isRunning || false}
                      onChange={(e) => setConfigForm({ ...configForm, isRunning: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Game Running</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={configForm.beginnerProtectionEnabled ?? true}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, beginnerProtectionEnabled: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Beginner Protection Enabled</label>
                  </div>
                </div>
                <Button onClick={handleUpdateWorldConfig} className="w-full">
                  Update World Config
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="units" className="space-y-4">
            <section>
              <h2 className="text-lg font-bold mb-2">Unit Balancing</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {troopBalances.map((troop) => (
                  <div key={troop.type} className="border border-border rounded p-3">
                    <h3 className="font-bold mb-2">{troop.type}</h3>
                    <table className="w-full border-collapse border border-border text-sm">
                      <thead>
                        <tr>
                          <th className="border border-border p-1 text-left bg-secondary">Costs</th>
                          <th className="border border-border p-1 text-left bg-secondary">Amount</th>
                          <th className="border border-border p-1 text-left bg-secondary">Stats</th>
                          <th className="border border-border p-1 text-left bg-secondary">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-border p-1">Wood</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.cost.wood}</td>
                          <td className="border border-border p-1">Attack</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.stats.attack}</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-1">Stone</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.cost.stone}</td>
                          <td className="border border-border p-1">Defense</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.stats.defense}</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-1">Iron</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.cost.iron}</td>
                          <td className="border border-border p-1">Speed</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.stats.speed}</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-1">Gold</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.cost.gold}</td>
                          <td className="border border-border p-1">Health</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.stats.health}</td>
                        </tr>
                        <tr>
                          <td className="border border-border p-1">Food</td>
                          <td className="border border-border p-1 text-right font-mono">{troop.cost.food}</td>
                          <td className="border border-border p-1">Stat Sum</td>
                          <td className="border border-border p-1 text-right font-mono">
                            {troop.stats.attack + troop.stats.defense + troop.stats.speed + troop.stats.health / 10}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Unit balancing is read-only. To modify, update troop-service.ts or implement database-backed balance.
              </p>
            </section>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <section>
              <h2 className="text-lg font-bold mb-2">Player Management</h2>

              <input
                type="text"
                placeholder="Search players..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background mb-2"
              />

              {loading ? (
                <p>Loading...</p>
              ) : (
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Player</th>
                      <th className="border border-border p-2 text-right bg-secondary">Points</th>
                      <th className="border border-border p-2 text-right bg-secondary">Rank</th>
                      <th className="border border-border p-2 text-left bg-secondary">Status</th>
                      <th className="border border-border p-2 text-left bg-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border border-border p-4 text-center text-muted-foreground">
                          No players found
                        </td>
                      </tr>
                    ) : (
                      players.map((player) => (
                        <tr key={player.id}>
                          <td className="border border-border p-2 font-bold">{player.playerName}</td>
                          <td className="border border-border p-2 text-right font-mono">{player.totalPoints.toLocaleString()}</td>
                          <td className="border border-border p-2 text-right">#{player.rank}</td>
                          <td className="border border-border p-2">{player.isDeleted ? "BANNED" : "Active"}</td>
                          <td className="border border-border p-2">
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => setSelectedPlayer(player)}
                                className="px-2 py-1 border border-border rounded hover:bg-secondary text-sm"
                              >
                                Details
                              </button>
                              {player.isDeleted ? (
                                <button
                                  onClick={() => handleUnbanPlayer(player.id)}
                                  className="px-2 py-1 border border-border rounded hover:bg-secondary text-sm"
                                >
                                  Unban
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBanPlayer(player.id)}
                                  className="px-2 py-1 border border-destructive rounded hover:bg-destructive/10 text-sm text-destructive"
                                >
                                  Ban
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </section>

            {selectedPlayer && (
              <section className="border border-primary rounded p-4 bg-primary/5">
                <h2 className="text-lg font-bold mb-2">{selectedPlayer.playerName} - Actions</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="rename" className="text-sm font-bold block mb-1">Rename Player</label>
                    <div className="flex gap-2">
                      <input
                        id="rename"
                        type="text"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        placeholder="New name"
                        className="flex-1 p-2 border border-border rounded bg-background"
                      />
                      <Button onClick={() => handleRenamePlayer(selectedPlayer.id)}>Rename</Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-1">Move Village</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={moveVillageId}
                        onChange={(e) => setMoveVillageId(e.target.value)}
                        placeholder="Village ID"
                        className="p-2 border border-border rounded bg-background"
                      />
                      <input
                        type="number"
                        value={moveX}
                        onChange={(e) => setMoveX(e.target.value)}
                        placeholder="X"
                        className="p-2 border border-border rounded bg-background"
                      />
                      <input
                        type="number"
                        value={moveY}
                        onChange={(e) => setMoveY(e.target.value)}
                        placeholder="Y"
                        className="p-2 border border-border rounded bg-background"
                      />
                      <Button onClick={() => handleMoveVillage(selectedPlayer.id)} className="w-full">Move</Button>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setSelectedPlayer(null)} className="w-full mt-2">
                  Close
                </Button>
              </section>
            )}
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6 space-y-4">
                <h2 className="font-bold text-lg">Spawn Barbarian</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Coordinates</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={spawnX}
                        onChange={(e) => setSpawnX(e.target.value)}
                        placeholder="X"
                        className="flex-1 p-2 border border-border rounded bg-background"
                      />
                      <input
                        type="number"
                        value={spawnY}
                        onChange={(e) => setSpawnY(e.target.value)}
                        placeholder="Y"
                        className="flex-1 p-2 border border-border rounded bg-background"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Troops</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <input
                        type="number"
                        value={spawnWarriors}
                        onChange={(e) => setSpawnWarriors(e.target.value)}
                        placeholder="Warriors"
                        className="p-2 border border-border rounded bg-background"
                      />
                      <input
                        type="number"
                        value={spawnSpearmen}
                        onChange={(e) => setSpawnSpearmen(e.target.value)}
                        placeholder="Spearmen"
                        className="p-2 border border-border rounded bg-background"
                      />
                      <input
                        type="number"
                        value={spawnBowmen}
                        onChange={(e) => setSpawnBowmen(e.target.value)}
                        placeholder="Bowmen"
                        className="p-2 border border-border rounded bg-background"
                      />
                      <input
                        type="number"
                        value={spawnHorsemen}
                        onChange={(e) => setSpawnHorsemen(e.target.value)}
                        placeholder="Horsemen"
                        className="p-2 border border-border rounded bg-background"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSpawnBarbarian} className="w-full">
                    Spawn Barbarian
                  </Button>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h2 className="font-bold text-lg">Relocate Tile</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Village ID</label>
                    <input
                      type="text"
                      value={relocateVillageId}
                      onChange={(e) => setRelocateVillageId(e.target.value)}
                      placeholder="Village ID"
                      className="w-full p-2 border border-border rounded bg-background mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">New Coordinates</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={relocateX}
                        onChange={(e) => setRelocateX(e.target.value)}
                        placeholder="X"
                        className="flex-1 p-2 border border-border rounded bg-background"
                      />
                      <input
                        type="number"
                        value={relocateY}
                        onChange={(e) => setRelocateY(e.target.value)}
                        placeholder="Y"
                        className="flex-1 p-2 border border-border rounded bg-background"
                      />
                    </div>
                  </div>
                  <Button onClick={handleRelocateTile} className="w-full">
                    Relocate Tile
                  </Button>
                </div>
              </Card>

              <Card className="p-6 space-y-4 md:col-span-2">
                <h2 className="font-bold text-lg">Wipe Empty Villages</h2>
                <p className="text-sm text-muted-foreground">
                  This will delete all villages with no buildings above level 1, no troops, and minimal
                  resources.
                </p>
                <Button onClick={handleWipeEmpty} variant="destructive" className="w-full">
                  Wipe Empty Villages
                </Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <section>
              <h2 className="text-lg font-bold mb-2">Error Logs</h2>
              {errorLogs.length === 0 ? (
                <p className="text-muted-foreground">No errors logged</p>
              ) : (
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Timestamp</th>
                      <th className="border border-border p-2 text-left bg-secondary">Message</th>
                      <th className="border border-border p-2 text-left bg-secondary">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorLogs.map((error, index) => (
                      <tr key={index}>
                        <td className="border border-border p-2 text-sm text-muted-foreground">{error.timestamp}</td>
                        <td className="border border-border p-2">{error.message}</td>
                        <td className="border border-border p-2 text-sm text-red-600">{error.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
