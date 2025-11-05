"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextTable } from "@/components/game/text-table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calculator, Settings, BarChart3, AlertCircle, RefreshCw, Download } from "lucide-react"

interface SimulationLog {
  id: string
  timestamp: string
  attackType: string
  attackerOffense: number
  defenderDefense: number
  attackerWon: boolean
  totalTroops: number
  wallLevel: number
  heroBonus: number
  userId?: string
}

interface SimulatorStats {
  totalSimulations: number
  raidSimulations: number
  conquestSimulations: number
  averageWinRate: number
  totalWallDamage: number
  averageTroopCount: number
}

interface SimulatorSettings {
  maxSimulationsPerHour: number
  enableLogging: boolean
  requireAuthentication: boolean
  defaultWallLevel: number
  defaultHeroBonus: number
}

export default function CombatSimulatorAdmin() {
  const [stats, setStats] = useState<SimulatorStats | null>(null)
  const [logs, setLogs] = useState<SimulationLog[]>([])
  const [settings, setSettings] = useState<SimulatorSettings>({
    maxSimulationsPerHour: 100,
    enableLogging: true,
    requireAuthentication: false,
    defaultWallLevel: 0,
    defaultHeroBonus: 0,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/combat-simulator/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/admin/combat-simulator/logs?limit=50")
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/combat-simulator/settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }

  const updateSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/combat-simulator/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage("Settings updated successfully")
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage("Failed to update settings")
      }
    } catch (error) {
      setMessage("Error updating settings")
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    if (!confirm("Are you sure you want to clear all simulation logs?")) return

    try {
      const response = await fetch("/api/admin/combat-simulator/logs", {
        method: "DELETE",
      })

      if (response.ok) {
        setMessage("Logs cleared successfully")
        fetchLogs()
        fetchStats()
      } else {
        setMessage("Failed to clear logs")
      }
    } catch (error) {
      setMessage("Error clearing logs")
    }
  }

  const exportLogs = async () => {
    try {
      const response = await fetch("/api/admin/combat-simulator/logs/export")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `combat-simulator-logs-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      setMessage("Failed to export logs")
    }
  }

  useEffect(() => {
    fetchStats()
    fetchLogs()
    fetchSettings()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Combat Simulator Admin
          </h1>
          <p className="text-muted-foreground">Manage combat simulator settings and analytics</p>
        </div>
        <Button onClick={() => { fetchStats(); fetchLogs(); }} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {message && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Simulation Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Simulations</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSimulations.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats.averageWinRate * 100).toFixed(1)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Raid vs Conquest</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div>Raids: {stats.raidSimulations}</div>
                    <div>Conquests: {stats.conquestSimulations}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Troop Count</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageTroopCount.toFixed(0)}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest simulation logs</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <TextTable
                  headers={["Time", "Type", "Result", "Offense", "Defense", "Troops"]}
                  rows={logs.slice(0, 10).map((log) => [
                    new Date(log.timestamp).toLocaleString(),
                    <Badge key={`type-${log.id}`} variant={log.attackType === 'RAID' ? 'secondary' : 'default'}>
                      {log.attackType}
                    </Badge>,
                    <Badge key={`result-${log.id}`} variant={log.attackerWon ? 'default' : 'destructive'}>
                      {log.attackerWon ? 'Win' : 'Loss'}
                    </Badge>,
                    log.attackerOffense.toLocaleString(),
                    log.defenderDefense.toLocaleString(),
                    log.totalTroops,
                  ])}
                />
              ) : (
                <p className="text-muted-foreground">No simulation logs available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Simulation Logs</h3>
            <div className="flex gap-2">
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={clearLogs} variant="destructive" size="sm">
                Clear Logs
              </Button>
            </div>
          </div>

          {logs.length > 0 ? (
            <TextTable
              headers={["ID", "Timestamp", "Type", "Wall", "Hero", "Offense", "Defense", "Result", "Troops"]}
              rows={logs.map((log) => [
                log.id.slice(-8),
                new Date(log.timestamp).toLocaleString(),
                <Badge key={`type-${log.id}`} variant={log.attackType === 'RAID' ? 'secondary' : 'default'}>
                  {log.attackType}
                </Badge>,
                log.wallLevel,
                `${log.heroBonus}%`,
                log.attackerOffense.toLocaleString(),
                log.defenderDefense.toLocaleString(),
                <Badge key={`result-${log.id}`} variant={log.attackerWon ? 'default' : 'destructive'}>
                  {log.attackerWon ? 'Win' : 'Loss'}
                </Badge>,
                log.totalTroops,
              ])}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No simulation logs available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Combat Simulator Settings</CardTitle>
              <CardDescription>Configure simulator behavior and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxSimulations">Max Simulations per Hour</Label>
                  <Input
                    id="maxSimulations"
                    type="number"
                    value={settings.maxSimulationsPerHour}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxSimulationsPerHour: parseInt(e.target.value) || 100
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="defaultWallLevel">Default Wall Level</Label>
                  <Input
                    id="defaultWallLevel"
                    type="number"
                    min="0"
                    max="20"
                    value={settings.defaultWallLevel}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      defaultWallLevel: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="defaultHeroBonus">Default Hero Bonus (%)</Label>
                  <Input
                    id="defaultHeroBonus"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.defaultHeroBonus}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      defaultHeroBonus: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableLogging"
                  checked={settings.enableLogging}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    enableLogging: e.target.checked
                  }))}
                />
                <Label htmlFor="enableLogging">Enable simulation logging</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireAuth"
                  checked={settings.requireAuthentication}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    requireAuthentication: e.target.checked
                  }))}
                />
                <Label htmlFor="requireAuth">Require authentication for simulator access</Label>
              </div>

              <Button onClick={updateSettings} disabled={loading}>
                {loading ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

