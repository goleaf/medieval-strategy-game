"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye, Settings, BarChart3, Users, RefreshCw, Save, AlertTriangle } from 'lucide-react'

interface CentralVillageOverviewSettings {
  id: string
  isEnabled: boolean
  refreshInterval: number // in seconds
  maxVillagesPerPlayer: number
  showProductionRates: boolean
  showMerchantCapacity: boolean
  showWarehouseCapacity: boolean
  showCulturePoints: boolean
  showTroopMovements: boolean
  showBuildingActivity: boolean
  showStarvationWarnings: boolean
  enableRealTimeUpdates: boolean
  cacheTimeout: number // in minutes
  createdAt: string
  updatedAt: string
}

interface PlayerUsageStats {
  totalPlayers: number
  activeUsers: number
  totalViews: number
  averageLoadTime: number
  errorRate: number
  topFeatures: Array<{
    feature: string
    usage: number
  }>
}

export function CentralVillageOverviewAdmin() {
  const [settings, setSettings] = useState<CentralVillageOverviewSettings | null>(null)
  const [stats, setStats] = useState<PlayerUsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
    fetchStats()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/central-village-overview/settings')
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      } else {
        setError('Failed to load settings')
      }
    } catch (err) {
      setError('Failed to fetch settings')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/central-village-overview/stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/central-village-overview/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (!settings) return

    setSettings({
      ...settings,
      isEnabled: true,
      refreshInterval: 30,
      maxVillagesPerPlayer: 50,
      showProductionRates: true,
      showMerchantCapacity: true,
      showWarehouseCapacity: true,
      showCulturePoints: true,
      showTroopMovements: true,
      showBuildingActivity: true,
      showStarvationWarnings: true,
      enableRealTimeUpdates: false,
      cacheTimeout: 5,
    })
  }

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading Central Village Overview settings...
      </div>
    )
  }

  if (!settings) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load settings. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="w-6 h-6" />
            Central Village Overview Admin
          </h2>
          <p className="text-muted-foreground">
            Manage settings for the Central Village Overview feature
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={resetToDefaults}
            variant="outline"
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="stats">Usage Statistics</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic functionality and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Feature</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow players to access the Central Village Overview
                  </p>
                </div>
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, isEnabled: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                  <Input
                    id="refresh-interval"
                    type="number"
                    min="10"
                    max="300"
                    value={settings.refreshInterval}
                    onChange={(e) =>
                      setSettings({ ...settings, refreshInterval: parseInt(e.target.value) || 30 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    How often data refreshes (10-300 seconds)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-villages">Max Villages per Player</Label>
                  <Input
                    id="max-villages"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxVillagesPerPlayer}
                    onChange={(e) =>
                      setSettings({ ...settings, maxVillagesPerPlayer: parseInt(e.target.value) || 50 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum villages shown per player (1-100)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cache-timeout">Cache Timeout (minutes)</Label>
                <Input
                  id="cache-timeout"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.cacheTimeout}
                  onChange={(e) =>
                    setSettings({ ...settings, cacheTimeout: parseInt(e.target.value) || 5 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  How long to cache overview data (1-60 minutes)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Visibility</CardTitle>
              <CardDescription>
                Control which information is displayed in the overview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Production Rates</Label>
                    <p className="text-sm text-muted-foreground">
                      Show resource production rates
                    </p>
                  </div>
                  <Switch
                    checked={settings.showProductionRates}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, showProductionRates: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Merchant Capacity</Label>
                    <p className="text-sm text-muted-foreground">
                      Show merchant availability
                    </p>
                  </div>
                  <Switch
                    checked={settings.showMerchantCapacity}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, showMerchantCapacity: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Warehouse Capacity</Label>
                    <p className="text-sm text-muted-foreground">
                      Show warehouse/granary capacities
                    </p>
                  </div>
                  <Switch
                    checked={settings.showWarehouseCapacity}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, showWarehouseCapacity: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Culture Points</Label>
                    <p className="text-sm text-muted-foreground">
                      Show culture point information
                    </p>
                  </div>
                  <Switch
                    checked={settings.showCulturePoints}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, showCulturePoints: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Troop Movements</Label>
                    <p className="text-sm text-muted-foreground">
                      Show incoming/outgoing troop movements
                    </p>
                  </div>
                  <Switch
                    checked={settings.showTroopMovements}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, showTroopMovements: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Building Activity</Label>
                    <p className="text-sm text-muted-foreground">
                      Show construction queues and activity
                    </p>
                  </div>
                  <Switch
                    checked={settings.showBuildingActivity}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, showBuildingActivity: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Starvation Warnings</Label>
                    <p className="text-sm text-muted-foreground">
                      Show warnings when troops might starve
                    </p>
                  </div>
                  <Switch
                    checked={settings.showStarvationWarnings}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, showStarvationWarnings: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Real-time Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable live data updates via WebSocket
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableRealTimeUpdates}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enableRealTimeUpdates: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalPlayers.toLocaleString() || 'N/A'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.activeUsers.toLocaleString() || 'N/A'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalViews.toLocaleString() || 'N/A'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.averageLoadTime ? `${stats.averageLoadTime.toFixed(2)}s` : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Feature Usage</CardTitle>
              <CardDescription>
                Most used features in the Central Village Overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Usage Count</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.topFeatures.map((feature, index) => (
                    <TableRow key={index}>
                      <TableCell>{feature.feature}</TableCell>
                      <TableCell>{feature.usage.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {stats.totalViews > 0
                            ? ((feature.usage / stats.totalViews) * 100).toFixed(1)
                            : 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No usage data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role-based Permissions</CardTitle>
              <CardDescription>
                Configure which admin roles can access Central Village Overview settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Moderator Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow moderators to view usage statistics
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Admin Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow admins to modify settings and view detailed stats
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Super Admin Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow super admins to reset settings and manage permissions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

