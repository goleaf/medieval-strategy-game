"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, AlertTriangle, Skull } from "lucide-react"
import type { Village, Building, Troop } from "@prisma/client"
import { useState } from "react"
import { CountdownTimer } from "./countdown-timer"
import { TextTable } from "./text-table"
import { TaskList } from "./task-list"

// Building costs (should match BuildingService.BUILDING_COSTS)
const BUILDING_COSTS: Record<string, Record<string, number>> = {
  HEADQUARTER: { wood: 100, stone: 100, iron: 50, gold: 20, food: 100 },
  MARKETPLACE: { wood: 150, stone: 150, iron: 100, gold: 50, food: 150 },
  BARRACKS: { wood: 200, stone: 100, iron: 150, gold: 0, food: 200 },
  STABLES: { wood: 250, stone: 150, iron: 200, gold: 50, food: 250 },
  WATCHTOWER: { wood: 100, stone: 200, iron: 100, gold: 0, food: 100 },
  WALL: { wood: 50, stone: 300, iron: 50, gold: 0, food: 50 },
  WAREHOUSE: { wood: 300, stone: 200, iron: 100, gold: 0, food: 300 },
  GRANARY: { wood: 200, stone: 150, iron: 50, gold: 0, food: 200 },
  SAWMILL: { wood: 100, stone: 100, iron: 50, gold: 0, food: 100 },
  QUARRY: { wood: 100, stone: 100, iron: 50, gold: 0, food: 100 },
  IRON_MINE: { wood: 100, stone: 100, iron: 100, gold: 0, food: 100 },
  TREASURY: { wood: 200, stone: 200, iron: 200, gold: 100, food: 200 },
  ACADEMY: { wood: 300, stone: 300, iron: 200, gold: 100, food: 300 },
  TEMPLE: { wood: 250, stone: 250, iron: 100, gold: 50, food: 250 },
  HOSPITAL: { wood: 200, stone: 200, iron: 150, gold: 0, food: 200 },
  FARM: { wood: 150, stone: 100, iron: 50, gold: 0, food: 150 },
  SNOB: { wood: 500, stone: 500, iron: 500, gold: 500, food: 500 },
}

interface VillageOverviewProps {
  village: Village & { buildings: Building[]; troops: Troop[] }
  onBuild?: (type: string) => void
  onUpgrade?: (buildingId: string) => void
  onNpcMerchantExchange?: (fromResource: string, toResource: string, amount: number) => void
}

export function VillageOverview({ village, onUpgrade, onNpcMerchantExchange }: VillageOverviewProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)

  const toggleBuilding = (buildingId: string) => {
    setSelectedBuildingId(selectedBuildingId === buildingId ? null : buildingId)
  }

  const handleUpgrade = async (buildingId: string) => {
    if (onUpgrade) {
      await onUpgrade(buildingId)
    }
  }

  const checkInsufficientResources = (buildingType: string) => {
    const costs = BUILDING_COSTS[buildingType]
    if (!costs) return null

    const insufficient: string[] = []
    if (village.wood < costs.wood) insufficient.push("wood")
    if (village.stone < costs.stone) insufficient.push("stone")
    if (village.iron < costs.iron) insufficient.push("iron")
    if (village.gold < costs.gold) insufficient.push("gold")
    if (village.food < costs.food) insufficient.push("food")

    return insufficient.length > 0 ? insufficient : null
  }

  const calculateRequiredExchange = (buildingType: string, insufficientResources: string[]) => {
    const costs = BUILDING_COSTS[buildingType]
    const exchanges: Array<{from: string, to: string, amount: number}> = []

    // Simple logic: try to exchange from available resources to needed ones
    const availableResources = ["wood", "stone", "iron", "gold", "food"].filter(
      resource => !insufficientResources.includes(resource)
    )

    insufficientResources.forEach(needed => {
      const neededAmount = costs[needed as keyof typeof costs]
      const currentAmount = village[needed as keyof typeof village] as number
      const requiredAmount = Math.max(0, neededAmount - currentAmount)

      if (requiredAmount > 0 && availableResources.length > 0) {
        // Use the first available resource as source
        const fromResource = availableResources[0]
        exchanges.push({
          from: fromResource.toUpperCase(),
          to: needed.toUpperCase(),
          amount: Math.min(requiredAmount, village[fromResource as keyof typeof village] as number)
        })
      }
    })

    return exchanges
  }

  const handleNpcMerchantExchange = (buildingType: string) => {
    const insufficient = checkInsufficientResources(buildingType)
    if (!insufficient || !onNpcMerchantExchange) return

    const exchanges = calculateRequiredExchange(buildingType, insufficient)
    if (exchanges.length > 0) {
      // Use the first exchange as an example
      const exchange = exchanges[0]
      onNpcMerchantExchange(exchange.from, exchange.to, exchange.amount)
    }
  }

  // Calculate max population based on farms
  const maxPopulation = village.buildings
    .filter(b => b.type === "FARM")
    .reduce((sum, farm) => sum + 100 + farm.level * 50, 100) // Base 100 + 50 per level

  return (
    <div className="w-full space-y-4">
      {/* Village Info */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">{village.name}</h2>
          <div className="flex gap-2">
            {village.isDestroyed && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Skull className="h-3 w-3" />
                Destroyed
              </Badge>
            )}
            {village.population <= 0 && !village.isDestroyed && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Zero Population
              </Badge>
            )}
            {village.loyalty < 25 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Low Loyalty
              </Badge>
            )}
          </div>
        </div>

        {village.isDestroyed && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-destructive">
              <Skull className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Village Destroyed</h3>
                <p className="text-sm">
                  This village has been destroyed and converted to an abandoned valley.
                  {village.destroyedAt && ` Destroyed on ${new Date(village.destroyedAt).toLocaleDateString()}.`}
                </p>
              </div>
            </div>
          </div>
        )}

        <TextTable
          headers={["Property", "Value"]}
          rows={[
            ["Position", `(${village.x}, ${village.y})`],
            [
              "Population",
              village.isDestroyed ? (
                <span className="text-destructive font-semibold">0 (Destroyed)</span>
              ) : (
                <span className={`font-semibold ${village.population <= 0 ? 'text-destructive' : ''}`}>
                  👨‍🌾 {village.population}/{maxPopulation}
                  {village.population <= 0 && " ⚠️"}
                </span>
              )
            ],
            ["Loyalty", `${village.loyalty}% ${village.loyalty < 25 ? '⚠️' : ''}`],
            ["Status", village.isCapital ? "🏰 Capital" : "🏘️ Village"],
          ]}
        />
      </section>

      {/* Resources Table */}
      <section>
        <h3 className="text-lg font-bold mb-2">Resources</h3>
        <TextTable
          headers={["Resource", "Amount", "Production"]}
          rows={[
            ["🪵 Wood", <span key="wood" className="font-mono text-right block">{village.wood.toLocaleString()}</span>, `+${village.woodProduction}/tick`],
            ["🧱 Stone", <span key="stone" className="font-mono text-right block">{village.stone.toLocaleString()}</span>, `+${village.stoneProduction}/tick`],
            ["⛓ Iron", <span key="iron" className="font-mono text-right block">{village.iron.toLocaleString()}</span>, `+${village.ironProduction}/tick`],
            ["🪙 Gold", <span key="gold" className="font-mono text-right block">{village.gold.toLocaleString()}</span>, `+${village.goldProduction}/tick`],
            ["🌾 Food", <span key="food" className="font-mono text-right block">{village.food.toLocaleString()}</span>, `+${village.foodProduction}/tick`],
          ]}
        />
      </section>

      {/* Buildings Table */}
      <section>
        <h3 className="text-lg font-bold mb-2">Buildings</h3>
        <TextTable
          headers={["Type", "Level", "Status", "Actions"]}
          rows={village.buildings.map((building) => [
            building.type,
            building.level.toString(),
            building.isBuilding && building.completionAt ? (
              <span key={`status-${building.id}`}>
                Building: <CountdownTimer targetDate={building.completionAt} />
              </span>
            ) : (
              "Ready"
            ),
            <button
              key={`action-${building.id}`}
              onClick={() => toggleBuilding(building.id)}
              className="px-2 py-1 border border-border rounded hover:bg-secondary text-sm"
            >
              {selectedBuildingId === building.id ? 'Hide' : 'Select'}
            </button>,
          ])}
        />
        
        {village.buildings.map((building) => (
          selectedBuildingId === building.id && (
            <div
              key={building.id}
              className="mt-2 p-3 border border-border rounded bg-secondary"
            >
            <div>
              <h4 className="font-bold mb-2">{building.type} (Level {building.level})</h4>
              {building.isBuilding && building.completionAt && (
                <div className="mb-2">
                  <p>
                    Completion: <CountdownTimer targetDate={building.completionAt} />
                  </p>
                </div>
              )}
              {(!building.isBuilding || !building.completionAt) && (
                <Button
                  onClick={() => handleUpgrade(building.id)}
                  className="w-full"
                >
                  Upgrade
                </Button>
              )}
            </div>
          </div>
          )
        ))}
      </section>

      {/* Troops Table */}
      <section>
        <h3 className="text-lg font-bold mb-2">Troops</h3>
        <TextTable
          headers={["Type", "Quantity"]}
          rows={village.troops.map((troop) => [
            troop.type,
            <span key={troop.id} className="font-mono text-right block">{troop.quantity.toLocaleString()}</span>,
          ])}
        />
      </section>

      {/* Tasks Section */}
      <section>
        <TaskList villageId={village.id} />
      </section>
    </div>
  )
}
