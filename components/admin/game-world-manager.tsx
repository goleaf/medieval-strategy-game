"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Play, Pause, Settings, Users, Globe, Clock, Zap, Trophy, Star, Target } from 'lucide-react'

interface GameWorld {
  id: string
  worldName: string
  worldCode: string
  description?: string
  version: 'REGULAR' | 'ANNUAL_SPECIAL' | 'NEW_YEAR_SPECIAL' | 'TOURNAMENT' | 'COMMUNITY_WEEK' | 'LOCAL_GAMEWORLD'
  region: 'INTERNATIONAL' | 'AMERICA' | 'ARABICS' | 'ASIA' | 'EUROPE'
  speed: number
  isActive: boolean
  isRegistrationOpen: boolean
  startedAt?: string
  createdAt: string
  availableTribes: Array<{ tribe: string }>
  players: Array<{
    id: string
    playerName: string
    totalPoints: number
  }>
  _count: {
    players: number
  }
}

const GAME_VERSIONS = [
  { value: 'REGULAR', label: 'Regular', description: 'Classic Travian experience', icon: Globe },
  { value: 'ANNUAL_SPECIAL', label: 'Annual Special', description: 'Seasonal themed server', icon: Star },
  { value: 'NEW_YEAR_SPECIAL', label: 'New Year Special', description: 'Yearly special event', icon: Trophy },
  { value: 'TOURNAMENT', label: 'Tournament', description: 'Competitive tournament server', icon: Target },
  { value: 'COMMUNITY_WEEK', label: 'Community Week', description: 'Community-voted features', icon: Users },
  { value: 'LOCAL_GAMEWORLD', label: 'Local Gameworld', description: 'Language-specific server', icon: Globe }
]

const REGIONS = [
  { value: 'INTERNATIONAL', label: 'International', description: 'Global player base' },
  { value: 'AMERICA', label: 'America', description: 'North & South America' },
  { value: 'ARABICS', label: 'Arabics', description: 'Middle East & Arabic countries' },
  { value: 'ASIA', label: 'Asia', description: 'Asian countries' },
  { value: 'EUROPE', label: 'Europe', description: 'European countries' }
]

const AVAILABLE_TRIBES = [
  { value: 'ROMANS', label: 'Romans', description: 'Balanced civilization' },
  { value: 'TEUTONS', label: 'Teutons', description: 'Offensive specialists' },
  { value: 'GAULS', label: 'Gauls', description: 'Defensive specialists' },
  { value: 'HUNS', label: 'Huns', description: 'Mobile warfare' },
  { value: 'EGYPTIANS', label: 'Egyptians', description: 'Economic focus' },
  { value: 'SPARTANS', label: 'Spartans', description: 'Military excellence' },
  { value: 'VIKINGS', label: 'Vikings', description: 'Naval & raiding' }
]

const SPEED_OPTIONS = [
  { value: 1, label: 'x1 Normal', description: 'Classic experience' },
  { value: 2, label: 'x2 Fast', description: 'Accelerated gameplay' },
  { value: 3, label: 'x3 Very Fast', description: 'Quick rounds' },
  { value: 5, label: 'x5 Tournament', description: 'Competitive speed' },
  { value: 10, label: 'x10 Extreme', description: 'Maximum speed' }
]

export function GameWorldManager() {
  const [gameWorlds, setGameWorlds] = useState<GameWorld[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWorld, setSelectedWorld] = useState<GameWorld | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showStartDialog, setShowStartDialog] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    worldName: '',
    worldCode: '',
    description: '',
    version: 'REGULAR' as const,
    region: 'INTERNATIONAL' as const,
    speed: 1,
    availableTribes: ['ROMANS', 'TEUTONS', 'GAULS'] as string[]
  })

  useEffect(() => {
    loadGameWorlds()
  }, [])

  const loadGameWorlds = async () => {
    try {
      const response = await fetch('/api/admin/game-worlds')
      const data = await response.json()
      if (data.success) {
        setGameWorlds(data.data)
      }
    } catch (error) {
      console.error('Failed to load game worlds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorld = async () => {
    try {
      const response = await fetch('/api/admin/game-worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })

      const data = await response.json()
      if (data.success) {
        setGameWorlds(prev => [...prev, data.data])
        setShowCreateDialog(false)
        setCreateForm({
          worldName: '',
          worldCode: '',
          description: '',
          version: 'REGULAR',
          region: 'INTERNATIONAL',
          speed: 1,
          availableTribes: ['ROMANS', 'TEUTONS', 'GAULS']
        })
      }
    } catch (error) {
      console.error('Failed to create game world:', error)
    }
  }

  const handleStartWorld = async (worldId: string) => {
    try {
      const response = await fetch(`/api/admin/game-worlds/${worldId}/start`, {
        method: 'POST'
      })

      const data = await response.json()
      if (data.success) {
        await loadGameWorlds()
        setShowStartDialog(false)
      }
    } catch (error) {
      console.error('Failed to start game world:', error)
    }
  }

  const getVersionIcon = (version: string) => {
    const versionData = GAME_VERSIONS.find(v => v.value === version)
    return versionData ? versionData.icon : Globe
  }

  const getStatusBadge = (world: GameWorld) => {
    if (world.startedAt) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>
    }
    if (world.isRegistrationOpen) {
      return <Badge variant="secondary">Registration Open</Badge>
    }
    return <Badge variant="outline">Inactive</Badge>
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading game worlds...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Game World Management</h2>
          <p className="text-muted-foreground">Create and manage Travian: Legends game worlds</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Globe className="w-4 h-4 mr-2" />
              Create Game World
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Game World</DialogTitle>
              <DialogDescription>
                Set up a new Travian game world with custom configuration
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="worldName">World Name</Label>
                  <Input
                    id="worldName"
                    value={createForm.worldName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, worldName: e.target.value }))}
                    placeholder="e.g., Medieval Legends"
                  />
                </div>
                <div>
                  <Label htmlFor="worldCode">World Code</Label>
                  <Input
                    id="worldCode"
                    value={createForm.worldCode}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, worldCode: e.target.value.toLowerCase() }))}
                    placeholder="e.g., en1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional world description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Game Version</Label>
                  <Select
                    value={createForm.version}
                    onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, version: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GAME_VERSIONS.map(version => (
                        <SelectItem key={version.value} value={version.value}>
                          {version.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Region</Label>
                  <Select
                    value={createForm.region}
                    onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, region: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(region => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Game Speed</Label>
                  <Select
                    value={createForm.speed.toString()}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, speed: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEED_OPTIONS.map(speed => (
                        <SelectItem key={speed.value} value={speed.value.toString()}>
                          {speed.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Available Tribes ({createForm.availableTribes.length} selected)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AVAILABLE_TRIBES.map(tribe => (
                    <div key={tribe.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={tribe.value}
                        checked={createForm.availableTribes.includes(tribe.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCreateForm(prev => ({
                              ...prev,
                              availableTribes: [...prev.availableTribes, tribe.value]
                            }))
                          } else {
                            setCreateForm(prev => ({
                              ...prev,
                              availableTribes: prev.availableTribes.filter(t => t !== tribe.value)
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={tribe.value} className="text-sm">
                        {tribe.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorld}>
                Create Game World
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {gameWorlds.map(world => {
          const VersionIcon = getVersionIcon(world.version)
          return (
            <Card key={world.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <VersionIcon className="w-5 h-5" />
                      {world.worldName} ({world.worldCode})
                    </CardTitle>
                    <CardDescription>{world.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(world)}
                    <Badge variant="outline">{world.speed}x Speed</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{world._count.players} players</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{world.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{world.version.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{world.availableTribes.length} tribes</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWorld(world)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>

                  {!world.startedAt && world._count.players > 0 && (
                    <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Start World
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start Game World</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to start "{world.worldName}"? This will close registration and begin the game for all {world._count.players} players.
                          </DialogDescription>
                        </DialogHeader>
                        <Alert>
                          <AlertDescription>
                            This action cannot be undone. The game world will become active and players will be able to start playing.
                          </AlertDescription>
                        </Alert>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowStartDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => handleStartWorld(world.id)}>
                            Start Game World
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {world.startedAt && (
                    <Button variant="outline" size="sm">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause World
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {gameWorlds.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Game Worlds</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first Travian game world to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Game World
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
