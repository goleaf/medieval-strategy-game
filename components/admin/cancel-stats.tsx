"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingDown, Building, Swords, Clock } from "lucide-react"

interface CancelStats {
  stats: {
    buildingCancels: { last24h: number; last7d: number }
    movementCancels: { last24h: number; last7d: number }
    totalCancels: { last24h: number; last7d: number }
  }
  recentCancels: Array<{
    type: "BUILDING_CANCEL" | "MOVEMENT_CANCEL"
    playerName: string
    villageName: string
    details: string
    timestamp: string
  }>
}

export function CancelStats() {
  const [stats, setStats] = useState<CancelStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/cancel-stats")
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
        setError(null)
      } else {
        setError(data.error || "Failed to fetch stats")
      }
    } catch (error) {
      console.error("Failed to fetch cancel stats:", error)
      setError("Failed to fetch cancel stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading cancel statistics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded bg-red-50">
        <p className="text-red-800">Error: {error}</p>
        <Button onClick={fetchStats} variant="outline" size="sm" className="mt-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cancel Actions Statistics</h2>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Building Cancels</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.buildingCancels.last24h}</div>
            <p className="text-xs text-muted-foreground">
              Last 24h ({stats.stats.buildingCancels.last7d} last 7d)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movement Cancels</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.movementCancels.last24h}</div>
            <p className="text-xs text-muted-foreground">
              Last 24h ({stats.stats.movementCancels.last7d} last 7d)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cancels</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.totalCancels.last24h}</div>
            <p className="text-xs text-muted-foreground">
              Last 24h ({stats.stats.totalCancels.last7d} last 7d)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cancels */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cancel Actions</CardTitle>
          <CardDescription>
            Latest cancel actions performed by players
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentCancels.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent cancels</p>
          ) : (
            <div className="space-y-3">
              {stats.recentCancels.map((cancel, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={cancel.type === "BUILDING_CANCEL" ? "default" : "secondary"}>
                        {cancel.type === "BUILDING_CANCEL" ? (
                          <Building className="w-3 h-3 mr-1" />
                        ) : (
                          <Swords className="w-3 h-3 mr-1" />
                        )}
                        {cancel.type === "BUILDING_CANCEL" ? "Building" : "Movement"}
                      </Badge>
                      <span className="font-medium">{cancel.playerName}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{cancel.villageName}</span>
                    </div>
                    <p className="text-sm">{cancel.details}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(cancel.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
