"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, Building, FlaskConical, TrendingUp, Users, Calendar } from "lucide-react"

type InstantCompletionStats = {
  totalCompletions: number
  totalGoldSpent: number
  totalBuildingsCompleted: number
  totalResearchCompleted: number
  completionsByPlayer: Array<{
    playerName: string
    playerId: string
    completions: number
    totalGoldSpent: number
  }>
  recentCompletions: Array<{
    id: string
    playerName: string
    playerId: string
    villageId: string
    completedBuildings: number
    completedResearch: number
    totalGoldCost: number
    createdAt: string
  }>
}

export default function InstantCompletionAdminPage() {
  const [stats, setStats] = useState<InstantCompletionStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/instant-completion/stats")
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch instant completion stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading instant completion statistics...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load statistics</p>
          <Button onClick={fetchStats}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Instant Completion Administration</h1>
            <p className="text-muted-foreground mt-2">
              Monitor and manage instant completion of constructions and research orders
            </p>
          </div>
          <Button onClick={fetchStats} variant="outline">
            Refresh Stats
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Completions</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompletions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All instant completion actions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gold Spent</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGoldSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total gold consumed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buildings Completed</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBuildingsCompleted.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Construction orders finished
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Research Completed</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalResearchCompleted.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Research orders finished
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Players by Instant Completions
            </CardTitle>
            <CardDescription>
              Players who use instant completion most frequently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.completionsByPlayer.slice(0, 10).map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{player.playerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.completions} completions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{player.totalGoldSpent} Gold</p>
                    <p className="text-xs text-muted-foreground">spent</p>
                  </div>
                </div>
              ))}
              {stats.completionsByPlayer.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No instant completion data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Completions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Instant Completions
            </CardTitle>
            <CardDescription>
              Latest instant completion activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentCompletions.slice(0, 20).map((completion) => (
                <div key={completion.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="font-medium">{completion.playerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {completion.completedBuildings > 0 && `${completion.completedBuildings} buildings`}
                        {completion.completedBuildings > 0 && completion.completedResearch > 0 && ", "}
                        {completion.completedResearch > 0 && `${completion.completedResearch} research`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {completion.totalGoldCost} Gold
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(completion.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {stats.recentCompletions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No recent instant completions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
