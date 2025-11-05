"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Zap, Users, Building, Sword, Coins, Star, Target, Info } from 'lucide-react'

interface SpeedTemplate {
  name: string
  description: string
  speed: number
  unitSpeed: number
  productionMultiplier: number
  resourcePerTick: number
  tickIntervalMinutes: number
  constructionTimeDivisor: number
  troopTrainingTimeDivisor: number
  troopSpeedMultiplier: number
  resourceProductionMultiplier: number
  beginnerProtectionDays: number
  travianPlusDurationDays: number
  resourceBonusDurationDays: number
  culturePoints: {
    starting: number
    celebrationTimeDivisor: number
    smallCelebrationLimit: number
    largeCelebrationLimit: number
    secondVillageRequirement: number
    artworkProductionDivisor: number
    artworkLimit: number
    artworkCooldownHours: number
  }
  items: {
    tier2AfterDays: number
    tier3AfterDays: number
    auctionDurationHours: number
    smeltingTimeHours: number
  }
  events: {
    registrationClosesAfterDays: number
    artefactsIntroducedAfterDays: number
    constructionPlansAfterDays: number
    natarWonderFinishesAfterDays: number
    annualSpecialDurationDays: number
  }
  misc: {
    availableVacationDays: number
    upgradingToCityCooldownHours: number
    natarAttackDelayHours: number
  }
}

const SPEED_CATEGORIES = [
  {
    id: 'general',
    name: 'General Mechanics',
    icon: Zap,
    description: 'Core game speed multipliers'
  },
  {
    id: 'culture',
    name: 'Culture Points',
    icon: Star,
    description: 'Expansion and celebration mechanics'
  },
  {
    id: 'items',
    name: 'Items & Auctions',
    icon: Coins,
    description: 'Hero item availability and trading'
  },
  {
    id: 'events',
    name: 'Game Events',
    icon: Clock,
    description: 'Timeline for game progression'
  },
  {
    id: 'misc',
    name: 'Miscellaneous',
    icon: Info,
    description: 'Additional game mechanics'
  }
]

export function SpeedConfiguration() {
  const [templates, setTemplates] = useState<Record<string, SpeedTemplate>>({})
  const [loading, setLoading] = useState(true)
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/speed-templates')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Failed to load speed templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = async (templateId: string) => {
    setApplyingTemplate(templateId)
    try {
      const response = await fetch('/api/admin/speed-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      })

      const data = await response.json()
      if (data.success) {
        // Show success message
        console.log('Template applied successfully:', data.message)
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
    } finally {
      setApplyingTemplate(null)
    }
  }

  const formatDuration = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)} hours`
    return `${days} days`
  }

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`
    return `${hours} hours`
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading speed templates...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Speed Configuration</h2>
        <p className="text-muted-foreground">
          Configure game speed settings based on Travian: Legends mechanics
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These templates implement the exact scaling mechanics used in Travian: Legends,
          affecting everything from construction times to culture point requirements.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {Object.entries(templates).map(([key, template]) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{template.speed}x Speed</Badge>
                  <Button
                    onClick={() => applyTemplate(key)}
                    disabled={applyingTemplate === key}
                    size="sm"
                  >
                    {applyingTemplate === key ? 'Applying...' : 'Apply Template'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  {SPEED_CATEGORIES.map(category => {
                    const Icon = category.icon
                    return (
                      <TabsTrigger key={category.id} value={category.id} className="text-xs">
                        <Icon className="w-3 h-3 mr-1" />
                        {category.name}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">Construction</span>
                        </div>
                        <p className="text-2xl font-bold">/{template.constructionTimeDivisor}</p>
                        <p className="text-xs text-muted-foreground">Time divisor</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sword className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium">Troop Training</span>
                        </div>
                        <p className="text-2xl font-bold">/{template.troopTrainingTimeDivisor}</p>
                        <p className="text-xs text-muted-foreground">Time divisor</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">Unit Speed</span>
                        </div>
                        <p className="text-2xl font-bold">{template.troopSpeedMultiplier}x</p>
                        <p className="text-xs text-muted-foreground">Movement multiplier</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">Production</span>
                        </div>
                        <p className="text-2xl font-bold">{template.resourceProductionMultiplier}x</p>
                        <p className="text-xs text-muted-foreground">Resource multiplier</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mechanic</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Beginner Protection</TableCell>
                        <TableCell>{template.beginnerProtectionDays} days</TableCell>
                        <TableCell>Protection period for new players</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Travian Plus Duration</TableCell>
                        <TableCell>{template.travianPlusDurationDays} days</TableCell>
                        <TableCell>Premium subscription duration</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Resource Bonus Duration</TableCell>
                        <TableCell>{template.resourceBonusDurationDays} days</TableCell>
                        <TableCell>Bonus resource period</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Available Vacation Days</TableCell>
                        <TableCell>{template.misc.availableVacationDays} days</TableCell>
                        <TableCell>Maximum vacation time</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="culture" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Culture Point Mechanic</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Starting Culture Points</TableCell>
                        <TableCell>{template.culturePoints.starting} CP</TableCell>
                        <TableCell>Initial CP for new players</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Townhall Celebration Time</TableCell>
                        <TableCell>/{template.culturePoints.celebrationTimeDivisor}</TableCell>
                        <TableCell>Celebration duration divisor</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Small Celebration Limit</TableCell>
                        <TableCell>{template.culturePoints.smallCelebrationLimit} CP</TableCell>
                        <TableCell>Maximum CP for small celebrations</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Large Celebration Limit</TableCell>
                        <TableCell>{template.culturePoints.largeCelebrationLimit} CP</TableCell>
                        <TableCell>Maximum CP for large celebrations</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Second Village Requirement</TableCell>
                        <TableCell>{template.culturePoints.secondVillageRequirement} CP</TableCell>
                        <TableCell>CP needed for expansion</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Artwork Production</TableCell>
                        <TableCell>{template.culturePoints.artworkProductionDivisor}x</TableCell>
                        <TableCell>CP production multiplier</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Artwork Limit</TableCell>
                        <TableCell>{template.culturePoints.artworkLimit} CP</TableCell>
                        <TableCell>Maximum CP from artworks</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Artwork Cooldown</TableCell>
                        <TableCell>{template.culturePoints.artworkCooldownHours} hours</TableCell>
                        <TableCell>Time between artwork uses</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="items" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Mechanic</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Tier 2 Items Available</TableCell>
                        <TableCell>{formatDuration(template.items.tier2AfterDays)}</TableCell>
                        <TableCell>When better items become available</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Tier 3 Items Available</TableCell>
                        <TableCell>{formatDuration(template.items.tier3AfterDays)}</TableCell>
                        <TableCell>When best items become available</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Auction Duration</TableCell>
                        <TableCell>{formatHours(template.items.auctionDurationHours)}</TableCell>
                        <TableCell>How long auctions last</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Smelting Time</TableCell>
                        <TableCell>{template.items.smeltingTimeHours} hours</TableCell>
                        <TableCell>Time to smelt items</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Game Event</TableHead>
                        <TableHead>Timing</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Registration Closes</TableCell>
                        <TableCell>{formatDuration(template.events.registrationClosesAfterDays)}</TableCell>
                        <TableCell>When new player registration ends</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Artefacts Introduced</TableCell>
                        <TableCell>{formatDuration(template.events.artefactsIntroducedAfterDays)}</TableCell>
                        <TableCell>When artefacts become available</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Construction Plans</TableCell>
                        <TableCell>{formatDuration(template.events.constructionPlansAfterDays)}</TableCell>
                        <TableCell>When Wonder construction begins</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Natar Wonder Finished</TableCell>
                        <TableCell>{formatDuration(template.events.natarWonderFinishesAfterDays)}</TableCell>
                        <TableCell>Game end date</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Annual Special Duration</TableCell>
                        <TableCell>{formatDuration(template.events.annualSpecialDurationDays)}</TableCell>
                        <TableCell>Special server duration</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="misc" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Miscellaneous Mechanic</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>City Upgrade Cooldown</TableCell>
                        <TableCell>{template.misc.upgradingToCityCooldownHours} hours</TableCell>
                        <TableCell>Time between city upgrades</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Natar Attack Delay</TableCell>
                        <TableCell>{template.misc.natarAttackDelayHours} hours</TableCell>
                        <TableCell>Delay before Natars attack gray areas</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Game Tick Interval</TableCell>
                        <TableCell>{template.tickIntervalMinutes} minutes</TableCell>
                        <TableCell>How often the game updates</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Resource Per Tick</TableCell>
                        <TableCell>{template.resourcePerTick} base</TableCell>
                        <TableCell>Base resources added per tick</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
