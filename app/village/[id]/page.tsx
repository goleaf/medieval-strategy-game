"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Home, Hammer, Shield, Eye } from "lucide-react"
import { ResourceDisplay, type ResourceLedgerSnapshot } from "@/components/game/resource-display"
import { BuildingQueue } from "@/components/game/building-queue"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"
// Types inferred from API responses
type VillageWithRelations = {
  id: string
  name: string
  x: number
  y: number
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
  resourceLedgers: ResourceLedgerSnapshot[]
  buildings: Array<{
    id: string
    type: string
    level: number
    isBuilding: boolean
    completionAt: string | null
    queuePosition: number | null
    research?: { isResearching: boolean } | null
  }>
  buildQueueTasks: Array<{
    id: string
    buildingId: string | null
    entityKey: string
    fromLevel: number
    toLevel: number
    status: string
    position: number
    startedAt: string | null
    finishesAt: string | null
  }>
  troops: Array<{ id: string; type: string; quantity: number }>
  population: number
  loyalty: number
}

function legacyResourceLedgers(village: VillageWithRelations): ResourceLedgerSnapshot[] {
  const timestamp = new Date().toISOString()
  return [
    {
      resourceType: "WOOD",
      currentAmount: village.wood,
      productionPerHour: village.woodProduction,
      netProductionPerHour: village.woodProduction,
      storageCapacity: 0,
      lastTickAt: timestamp,
    },
    {
      resourceType: "CLAY",
      currentAmount: village.stone,
      productionPerHour: village.stoneProduction,
      netProductionPerHour: village.stoneProduction,
      storageCapacity: 0,
      lastTickAt: timestamp,
    },
    {
      resourceType: "IRON",
      currentAmount: village.iron,
      productionPerHour: village.ironProduction,
      netProductionPerHour: village.ironProduction,
      storageCapacity: 0,
      lastTickAt: timestamp,
    },
  ]
}

export default function VillageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const villageId = params.id as string
  const [village, setVillage] = useState<VillageWithRelations | null>(null)

  const fetchVillage = useCallback(async () => {
    try {
      const res = await fetch("/api/villages?playerId=temp-player-id")
      const data = await res.json()
      if (data.success && data.data) {
        const found = data.data.find((v: any) => v.id === villageId)
        setVillage(found || null)
      }
    } catch (error) {
      console.error("Failed to fetch village:", error)
    }
  }, [villageId])

  useEffect(() => {
    fetchVillage()
    const interval = setInterval(fetchVillage, 30000)
    if (typeof window !== "undefined") {
      (window as any).__villageDetailFetchHandler = fetchVillage
    }
    return () => {
      clearInterval(interval)
      if (typeof window !== "undefined") {
        delete (window as any).__villageDetailFetchHandler
      }
    }
  }, [fetchVillage])

  if (!village) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Village not found</p>
          <Link href="/dashboard">
            <Button>
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const ledgersToShow =
    village.resourceLedgers && village.resourceLedgers.length > 0
      ? village.resourceLedgers
      : legacyResourceLedgers(village)

  return (
    <div
      x-data={`{
        loading: false,
        async init() {
          this.loading = true;
          if (window.__villageDetailFetchHandler) {
            await window.__villageDetailFetchHandler();
          }
          this.loading = false;
        }
      }`}
      className="min-h-screen bg-background text-foreground"
    >
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">{village.name}</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div x-show="loading" className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
        <div x-show="!loading" className="max-w-4xl mx-auto space-y-4">
          <section>
            <h2 className="text-lg font-bold mb-2">Village Information</h2>
            <div className="space-y-1 text-sm">
              <div>Position: ({village.x}, {village.y})</div>
              <div>Population: {village.population}</div>
              <div>Loyalty: {village.loyalty}%</div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Resources</h2>
            <ResourceDisplay
              ledgers={ledgersToShow}
              showCrop={false}
            />
          </section>

          <section>
            <BuildingQueue
              tasks={village.buildQueueTasks}
              activeResearchCount={village.buildings.filter((b) => (b as any).research?.isResearching).length}
              villageId={villageId}
              onInstantComplete={fetchVillage}
            />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Buildings</h2>
            <TextTable
              headers={["Type", "Level", "Status", "Actions"]}
              rows={village.buildings.map((building) => [
                building.type,
                building.level.toString(),
                building.isBuilding ? "Building..." : "Ready",
                <Link key={building.id} href={`/village/${villageId}/buildings`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </Link>,
              ])}
            />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Troops</h2>
            <TextTable
              headers={["Type", "Quantity"]}
              rows={village.troops.map((troop) => [
                troop.type,
                troop.quantity.toLocaleString(),
              ])}
            />
          </section>

          <section className="flex gap-2">
            <Link href={`/village/${villageId}/buildings`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Hammer className="w-4 h-4" />
                Manage Buildings
              </Button>
            </Link>
            <Link href={`/village/${villageId}/troops`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Shield className="w-4 h-4" />
                Manage Troops
              </Button>
            </Link>
          </section>
        </div>
      </main>
    </div>
  )
}
