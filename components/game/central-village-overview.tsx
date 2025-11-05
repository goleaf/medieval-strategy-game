"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TextTable } from "./text-table"
import { CountdownTimer } from "./countdown-timer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface VillageOverviewData {
  id: string
  name: string
  x: number
  y: number
  isCapital: boolean
  loyalty: number
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  woodProduction: number
  stoneProduction: number
  ironProduction: number
  goldProduction: number
  foodProduction: number
  warehouseCapacity: number
  granaryCapacity: number
  buildingQueueCount: number
  activeConstructions: number
  outgoingAttacks: number
  incomingAttacks: number
  outgoingReinforcements: number
  incomingReinforcements: number
  totalTroops: number
  troops: { type: string; quantity: number }[]
  culturePoints: number
  dailyCpProduction: number
  activeCelebrations: number
  celebrationEndTime?: Date
  settlers: number
  administrators: number
  expansionSlots: number
  merchants: { free: number; total: number }
}

interface OverviewResponse {
  villages: VillageOverviewData[]
  totals: {
    villages: number
    totalWood: number
    totalStone: number
    totalIron: number
    totalGold: number
    totalFood: number
    totalCulturePoints: number
    totalTroops: number
    totalWarehouseCapacity: number
    totalGranaryCapacity: number
    totalFreeMerchants: number
    totalMerchants: number
  }
  playerName: string
}

interface TroopOverviewData {
  allTroops: { [key: string]: number }
  villages: {
    id: string
    name: string
    troops: { type: string; quantity: number; cropUpkeep: number }[]
    totalCropUpkeep: number
  }[]
  smithyResearch: {
    villageId: string
    villageName: string
    research: { troopType: string; level: number }[]
  }[]
  hospitalData: {
    villageId: string
    villageName: string
    woundedTroops: { type: string; quantity: number; healingProgress: number }[]
    totalWounded: number
    hospitalLevel: number
  }[]
}

interface WarehouseData {
  villages: {
    id: string
    name: string
    warehouseCapacity: number
    granaryCapacity: number
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
    woodProduction: number
    stoneProduction: number
    ironProduction: number
    goldProduction: number
    foodProduction: number
    warehouseTimeToFull: number | null
    warehouseTimeToEmpty: number | null
    granaryTimeToFull: number | null
    granaryTimeToEmpty: number | null
    warehouseFull: boolean
    granaryEmpty: boolean
  }[]
}

interface CentralVillageOverviewProps {
  playerId: string
  onVillageSelect?: (villageId: string) => void
}

export function CentralVillageOverview({ playerId, onVillageSelect }: CentralVillageOverviewProps) {
  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(null)
  const [troopData, setTroopData] = useState<TroopOverviewData | null>(null)
  const [warehouseData, setWarehouseData] = useState<WarehouseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchOverviewData()
  }, [playerId])

  const fetchOverviewData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [overviewRes, troopRes, warehouseRes] = await Promise.all([
        fetch(`/api/villages/central-overview?playerId=${playerId}`),
        fetch(`/api/villages/central-overview/troops?playerId=${playerId}`),
        fetch(`/api/villages/central-overview/warehouse?playerId=${playerId}`),
      ])

      if (!overviewRes.ok || !troopRes.ok || !warehouseRes.ok) {
        throw new Error("Failed to fetch overview data")
      }

      const [overviewJson, troopJson, warehouseJson] = await Promise.all([
        overviewRes.json(),
        troopRes.json(),
        warehouseRes.json(),
      ])

      setOverviewData(overviewJson.data)
      setTroopData(troopJson.data)
      setWarehouseData(warehouseJson.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes: number | null): string => {
    if (!minutes) return "N/A"
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading village overview...</span>
      </div>
    )
  }

  if (error || !overviewData) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-2">Error loading village overview</div>
        <div className="text-sm text-gray-600">{error}</div>
        <Button onClick={fetchOverviewData} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Central Village Overview - {overviewData.playerName}
        </h1>
        <Button onClick={fetchOverviewData} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
          <TabsTrigger value="culture">Culture Points</TabsTrigger>
          <TabsTrigger value="troops">Troops</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Village Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <TextTable
                headers={["Village", "Building Activity", "Troop Movements", "Total Troops", "Actions"]}
                rows={overviewData.villages.map((village) => [
                  <button
                    key={`village-${village.id}`}
                    onClick={() => onVillageSelect?.(village.id)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {village.name} {village.isCapital ? "🏛️" : ""} ({village.x}, {village.y})
                  </button>,
                  <div key={`building-${village.id}`} className="text-sm">
                    <div>Active: {village.activeConstructions}</div>
                    <div>Queued: {village.buildingQueueCount}</div>
                  </div>,
                  <div key={`movements-${village.id}`} className="text-sm">
                    <div className="text-red-600">
                      ⚔️ {village.outgoingAttacks} out / {village.incomingAttacks} in
                    </div>
                    <div className="text-blue-600">
                      🛡️ {village.outgoingReinforcements} out / {village.incomingReinforcements} in
                    </div>
                  </div>,
                  formatNumber(village.totalTroops),
                  <Button
                    key={`actions-${village.id}`}
                    onClick={() => onVillageSelect?.(village.id)}
                    size="sm"
                  >
                    View
                  </Button>,
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    🪵 {formatNumber(overviewData.totals.totalWood)}
                  </div>
                  <div className="text-sm text-gray-600">Wood</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    🧱 {formatNumber(overviewData.totals.totalStone)}
                  </div>
                  <div className="text-sm text-gray-600">Stone</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-500">
                    ⛓ {formatNumber(overviewData.totals.totalIron)}
                  </div>
                  <div className="text-sm text-gray-600">Iron</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    🪙 {formatNumber(overviewData.totals.totalGold)}
                  </div>
                  <div className="text-sm text-gray-600">Gold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    🌾 {formatNumber(overviewData.totals.totalFood)}
                  </div>
                  <div className="text-sm text-gray-600">Food</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Per-Village Resources & Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <TextTable
                headers={["Village", "Wood", "Stone", "Iron", "Gold", "Food", "Merchants"]}
                rows={overviewData.villages.map((village) => [
                  <button
                    key={`village-${village.id}`}
                    onClick={() => onVillageSelect?.(village.id)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {village.name}
                  </button>,
                  <span key="wood" className="font-mono">{formatNumber(village.wood)}</span>,
                  <span key="stone" className="font-mono">{formatNumber(village.stone)}</span>,
                  <span key="iron" className="font-mono">{formatNumber(village.iron)}</span>,
                  <span key="gold" className="font-mono">{formatNumber(village.gold)}</span>,
                  <span key="food" className="font-mono">{formatNumber(village.food)}</span>,
                  <span key="merchants" className="font-mono">
                    {village.merchants.free}/{village.merchants.total}
                  </span>,
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouse Tab */}
        <TabsContent value="warehouse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse & Granary Capacities</CardTitle>
            </CardHeader>
            <CardContent>
              <TextTable
                headers={["Village", "Warehouse", "Time to Full", "Granary", "Time to Empty", "Status"]}
                rows={warehouseData?.villages.map((village) => [
                  <button
                    key={`village-${village.id}`}
                    onClick={() => onVillageSelect?.(village.id)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {village.name}
                  </button>,
                  <div key="warehouse" className="text-sm">
                    <div>{formatNumber(village.wood + village.stone + village.iron + village.gold)}/{formatNumber(village.warehouseCapacity)}</div>
                    <div className="text-xs text-gray-600">
                      +{village.woodProduction + village.stoneProduction + village.ironProduction + village.goldProduction}/tick
                    </div>
                  </div>,
                  <span key="warehouse-time" className={village.warehouseTimeToFull ? "text-orange-600" : "text-gray-500"}>
                    {formatTime(village.warehouseTimeToFull)}
                  </span>,
                  <div key="granary" className="text-sm">
                    <div>{formatNumber(village.food)}/{formatNumber(village.granaryCapacity)}</div>
                    <div className="text-xs text-gray-600">
                      {village.foodProduction >= 0 ? '+' : ''}{village.foodProduction}/tick
                    </div>
                  </div>,
                  <span key="granary-time" className={village.granaryTimeToEmpty ? "text-red-600 font-bold" : "text-gray-500"}>
                    {formatTime(village.granaryTimeToEmpty)}
                  </span>,
                  <div key="status" className="text-xs">
                    {village.warehouseFull && <div className="text-orange-600">📦 Full</div>}
                    {village.granaryEmpty && <div className="text-red-600">⚠️ Starving!</div>}
                  </div>,
                ]) || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Culture Points Tab */}
        <TabsContent value="culture" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Culture Points Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-purple-600">
                  🎭 {formatNumber(overviewData.totals.totalCulturePoints)}
                </div>
                <div className="text-sm text-gray-600">Total Culture Points</div>
              </div>

              <TextTable
                headers={["Village", "CP", "Daily Production", "Celebrations", "Settlers", "Expansion Slots"]}
                rows={overviewData.villages.map((village) => [
                  <button
                    key={`village-${village.id}`}
                    onClick={() => onVillageSelect?.(village.id)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {village.name}
                  </button>,
                  formatNumber(village.culturePoints),
                  `+${village.dailyCpProduction}`,
                  village.activeCelebrations > 0 ? (
                    <span key="celebrations" className="text-yellow-600">
                      🎉 {village.activeCelebrations}
                      {village.celebrationEndTime && (
                        <div className="text-xs">
                          <CountdownTimer targetDate={village.celebrationEndTime} />
                        </div>
                      )}
                    </span>
                  ) : (
                    "0"
                  ),
                  village.settlers,
                  `${village.expansionSlots}/1`,
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Troops Tab */}
        <TabsContent value="troops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Troops Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {Object.entries(troopData?.allTroops || {}).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <div className="text-2xl font-bold">{formatNumber(count)}</div>
                    <div className="text-sm text-gray-600">{type.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Troops in Villages</CardTitle>
            </CardHeader>
            <CardContent>
              <TextTable
                headers={["Village", "Troops", "Crop Upkeep"]}
                rows={troopData?.villages.map((village) => [
                  <button
                    key={`village-${village.id}`}
                    onClick={() => onVillageSelect?.(village.id)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {village.name}
                  </button>,
                  <div key="troops" className="text-sm">
                    {village.troops.map((troop) => (
                      <div key={troop.type}>
                        {troop.type}: {formatNumber(troop.quantity)}
                      </div>
                    ))}
                  </div>,
                  <span key="upkeep" className="font-mono text-red-600">
                    -{formatNumber(village.totalCropUpkeep)}/tick
                  </span>,
                ]) || []}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Smithy Research</CardTitle>
            </CardHeader>
            <CardContent>
              <TextTable
                headers={["Village", "Research Levels"]}
                rows={troopData?.smithyResearch.map((village) => [
                  village.villageName,
                  <div key="research" className="text-sm">
                    {village.research.length > 0 ? (
                      village.research.map((research) => (
                        <div key={research.troopType}>
                          {research.troopType}: Level {research.level}
                        </div>
                      ))
                    ) : (
                      "No research"
                    )}
                  </div>,
                ]) || []}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hospital Status</CardTitle>
            </CardHeader>
            <CardContent>
              <TextTable
                headers={["Village", "Hospital Level", "Wounded Troops", "Healing"]}
                rows={troopData?.hospitalData.map((village) => [
                  village.villageName,
                  village.hospitalLevel,
                  village.totalWounded > 0 ? (
                    <div key="wounded" className="text-sm">
                      {village.woundedTroops.map((troop) => (
                        <div key={troop.type}>
                          {troop.type}: {troop.quantity} ({troop.healingProgress}%)
                        </div>
                      ))}
                    </div>
                  ) : (
                    "None"
                  ),
                  village.totalWounded > 0 ? "In progress" : "N/A",
                ]) || []}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

