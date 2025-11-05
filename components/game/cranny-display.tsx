"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Shield, Plus, ArrowUp, Clock, Users } from "lucide-react"
import { CrannyService } from "@/lib/game-services/cranny-service"

interface Cranny {
  id: string
  level: number
  isBuilding: boolean
  completionAt?: string
  queuePosition?: number
}

interface CrannyDisplayProps {
  villageId: string
  crannies: Cranny[]
  playerTribe?: string
  onUpgrade?: (buildingId: string) => void
  resources: {
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  }
}

export function CrannyDisplay({
  villageId,
  crannies,
  playerTribe,
  onUpgrade,
  resources
}: CrannyDisplayProps) {
  const [protection, setProtection] = useState<{
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const calculateProtection = async () => {
      try {
        const protectionData = await CrannyService.calculateTotalProtection(villageId)
        setProtection(protectionData)
      } catch (error) {
        console.error("Failed to calculate cranny protection:", error)
      }
    }

    if (villageId) {
      calculateProtection()
    }
  }, [villageId, crannies])

  const handleUpgrade = async (buildingId: string) => {
    if (!onUpgrade) return

    setLoading(true)
    try {
      await onUpgrade(buildingId)
      toast({
        title: "Upgrade Started",
        description: "Cranny upgrade has been added to the construction queue.",
      })
    } catch (error) {
      toast({
        title: "Upgrade Failed",
        description: "Failed to start cranny upgrade. Please check your resources.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getNextLevelCost = (currentLevel: number) => {
    // Calculate cost for next level (same logic as BuildingService)
    const baseCosts = { wood: 40, stone: 50, iron: 30, gold: 0, food: 40 }
    const levelScaling = Math.pow(1.2, currentLevel)
    return {
      wood: Math.floor(baseCosts.wood * levelScaling),
      stone: Math.floor(baseCosts.stone * levelScaling),
      iron: Math.floor(baseCosts.iron * levelScaling),
      gold: Math.floor(baseCosts.gold * levelScaling),
      food: Math.floor(baseCosts.food * levelScaling),
    }
  }

  const canAffordUpgrade = (costs: ReturnType<typeof getNextLevelCost>) => {
    return resources.wood >= costs.wood &&
           resources.stone >= costs.stone &&
           resources.iron >= costs.iron &&
           resources.gold >= costs.gold &&
           resources.food >= costs.food
  }

  const getTribeBonus = () => {
    if (playerTribe === "GAULS") {
      return { multiplier: 1.5, description: "Gaul bonus: 1.5x capacity" }
    }
    return null
  }

  const tribeBonus = getTribeBonus()
  const totalCrannies = crannies.length
  const buildingCrannies = crannies.filter(c => c.isBuilding).length
  const activeCrannies = totalCrannies - buildingCrannies

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Cranny Protection
        </CardTitle>
        <CardDescription>
          Crannies hide your resources from being looted during attacks. Each cranny protects resources based on its level.
          {tribeBonus && (
            <span className="block mt-1 text-green-600 font-medium">
              {tribeBonus.description}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Protection Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalCrannies}
            </div>
            <div className="text-sm text-muted-foreground">Total Crannies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {activeCrannies}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {buildingCrannies}
            </div>
            <div className="text-sm text-muted-foreground">Building</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {protection ? protection.wood.toLocaleString() : "..."}
            </div>
            <div className="text-sm text-muted-foreground">Protection</div>
          </div>
        </div>

        {/* Individual Crannies */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cranny Details
          </h4>

          {crannies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No crannies built yet</p>
              <p className="text-sm">Build your first cranny to protect your resources!</p>
            </div>
          ) : (
            crannies.map((cranny, index) => {
              const capacity = CrannyService.calculateCrannyCapacity(cranny.level)
              const effectiveCapacity = tribeBonus ? Math.floor(capacity * tribeBonus.multiplier) : capacity
              const nextLevelCosts = getNextLevelCost(cranny.level)
              const canAfford = canAffordUpgrade(nextLevelCosts)

              return (
                <div key={cranny.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Cranny #{index + 1}
                      </Badge>
                      <Badge variant={cranny.level > 5 ? "default" : "secondary"}>
                        Level {cranny.level}
                      </Badge>
                      {cranny.isBuilding && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Building
                        </Badge>
                      )}
                    </div>

                    {!cranny.isBuilding && onUpgrade && (
                      <Button
                        size="sm"
                        onClick={() => handleUpgrade(cranny.id)}
                        disabled={loading || !canAfford}
                        className="flex items-center gap-1"
                      >
                        <ArrowUp className="h-3 w-3" />
                        Upgrade
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="ml-2 font-medium">
                        {capacity.toLocaleString()}
                        {tribeBonus && (
                          <span className="text-green-600 ml-1">
                            → {effectiveCapacity.toLocaleString()}
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next Level:</span>
                      <span className="ml-2 font-medium">
                        {(capacity + 200).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Construction Progress */}
                  {cranny.isBuilding && cranny.completionAt && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Construction Progress</span>
                        <span>Queue Position: {cranny.queuePosition}</span>
                      </div>
                      <Progress value={50} className="h-2" />
                      <div className="text-xs text-muted-foreground text-center">
                        Completion: {new Date(cranny.completionAt).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Upgrade Costs */}
                  {!cranny.isBuilding && (
                    <div className="text-xs space-y-1">
                      <div className="text-muted-foreground">Upgrade Cost (Level {cranny.level + 1}):</div>
                      <div className="grid grid-cols-5 gap-1">
                        <div className={`text-center p-1 rounded ${resources.wood >= nextLevelCosts.wood ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          🪵 {nextLevelCosts.wood}
                        </div>
                        <div className={`text-center p-1 rounded ${resources.stone >= nextLevelCosts.stone ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          🧱 {nextLevelCosts.stone}
                        </div>
                        <div className={`text-center p-1 rounded ${resources.iron >= nextLevelCosts.iron ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          ⛓ {nextLevelCosts.iron}
                        </div>
                        <div className={`text-center p-1 rounded ${resources.gold >= nextLevelCosts.gold ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          🪙 {nextLevelCosts.gold}
                        </div>
                        <div className={`text-center p-1 rounded ${resources.food >= nextLevelCosts.food ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          🌾 {nextLevelCosts.food}
                        </div>
                      </div>
                      {!canAfford && (
                        <div className="text-red-600 text-center">
                          Insufficient resources for upgrade
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Build New Cranny */}
        {totalCrannies < 10 && (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
            <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Build Additional Cranny</p>
            <p className="text-xs text-muted-foreground mb-3">
              Add another cranny to increase your resource protection. Each cranny works independently.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // This would need to be implemented in the parent component
                toast({
                  title: "Feature Coming Soon",
                  description: "Building additional crannies will be available soon!",
                })
              }}
            >
              Build New Cranny
            </Button>
          </div>
        )}

        {/* Protection Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <h5 className="font-medium mb-2">How Cranny Protection Works:</h5>
          <ul className="space-y-1 list-disc list-inside">
            <li>Each cranny level provides protection equal to its capacity for each resource type</li>
            <li>Protection is applied before calculating loot during attacks</li>
            <li>You can build multiple crannies for increased protection</li>
            <li>Gauls receive 1.5x protection from all crannies</li>
            <li>Teutons can reduce enemy cranny effectiveness when their hero joins raids</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
