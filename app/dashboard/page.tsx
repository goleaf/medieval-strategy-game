"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { VillageOverview } from "@/components/game/village-overview"
import { ResourceDisplay } from "@/components/game/resource-display"
import { BuildingQueue } from "@/components/game/building-queue"
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
  population: number
  loyalty: number
  buildings: Array<{
    id: string
    type: string
    level: number
    isBuilding: boolean
    completionAt: string | null
    queuePosition: number | null
  }>
  troops: Array<{
    id: string
    type: string
    quantity: number
    attack: number
    defense: number
    speed: number
  }>
}

export default function Dashboard() {
  const [villages, setVillages] = useState<VillageWithRelations[]>([])
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null)

  const fetchVillages = async () => {
    try {
      const res = await fetch("/api/villages?playerId=temp-player-id")
      const data = await res.json()
      if (data.success && data.data) {
        setVillages(data.data)
        if (data.data.length > 0 && !selectedVillageId) {
          setSelectedVillageId(data.data[0].id)
        }
      } else {
        setVillages([])
      }
    } catch (error) {
      console.error("Failed to fetch villages:", error)
      setVillages([])
    }
  }

  useEffect(() => {
    fetchVillages()
    const interval = setInterval(fetchVillages, 30000) // Refresh every 30 seconds
    if (typeof window !== "undefined") {
      (window as any).__dashboardFetchHandler = fetchVillages
      (window as any).__dashboardSetSelectedVillage = setSelectedVillageId
    }
    return () => {
      clearInterval(interval)
      if (typeof window !== "undefined") {
        delete (window as any).__dashboardFetchHandler
        delete (window as any).__dashboardSetSelectedVillage
      }
    }
  }, [selectedVillageId])

  return (
    <div
      x-data={`{
        selectedVillageId: ${villages.length > 0 ? `'${villages[0].id}'` : 'null'},
        loading: false,
        handleChange() {
          // Trigger React re-render by updating state via global handler
          if (window.__dashboardSetSelectedVillage) {
            window.__dashboardSetSelectedVillage(this.selectedVillageId);
          }
        },
        async refresh() {
          this.loading = true;
          if (window.__dashboardFetchHandler) {
            await window.__dashboardFetchHandler();
          }
          this.loading = false;
        }
      }`}
      x-init="refresh()"
      className="min-h-screen bg-background text-foreground"
    >
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">🏰 Medieval Strategy</h1>
          <nav className="flex gap-2 text-sm">
            <Link href="/map" className="px-2 py-1 hover:bg-secondary rounded">
              🗺️ Map
            </Link>
            <Link href="/attacks" className="px-2 py-1 hover:bg-secondary rounded">
              ⚔️ Attacks
            </Link>
            <Link href="/market" className="px-2 py-1 hover:bg-secondary rounded">
              🏪 Market
            </Link>
            <Link href="/messages" className="px-2 py-1 hover:bg-secondary rounded">
              💬 Messages
            </Link>
            <Link href="/tribes" className="px-2 py-1 hover:bg-secondary rounded">
              👥 Tribes
            </Link>
            <Link href="/leaderboard" className="px-2 py-1 hover:bg-secondary rounded">
              📊 Rankings
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div x-show="loading" className="text-center py-8">Loading...</div>
          <div x-show="!loading && villages.length === 0" className="text-center py-8">
            <p className="mb-4">No villages yet. Create your first village!</p>
            <Button>Create Village</Button>
          </div>
          <div x-show="!loading && villages.length > 0">
            {villages.length > 1 && (
              <div className="p-3 border border-border rounded bg-secondary">
                <label className="text-sm font-bold block mb-2">Select Village</label>
                <select
                  x-model="selectedVillageId"
                  x-on:change="handleChange()"
                  className="w-full p-2 border border-border rounded bg-background"
                >
                  {villages.map((village) => (
                    <option key={village.id} value={village.id}>
                      {village.name} ({village.x}, {village.y})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(() => {
              const currentVillage = villages.find(v => v.id === selectedVillageId)
              return currentVillage ? (
                <div>
                  <section className="space-y-2">
                    <h2 className="text-lg font-bold">{currentVillage.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Position: ({currentVillage.x}, {currentVillage.y}) • Loyalty: {currentVillage.loyalty}%
                    </p>
                  </section>

                  <section>
                    <h3 className="text-md font-semibold mb-2">Resources</h3>
                    <ResourceDisplay
                      wood={currentVillage.wood}
                      stone={currentVillage.stone}
                      iron={currentVillage.iron}
                      gold={currentVillage.gold}
                      food={currentVillage.food}
                      woodProduction={currentVillage.woodProduction}
                      stoneProduction={currentVillage.stoneProduction}
                      ironProduction={currentVillage.ironProduction}
                      goldProduction={currentVillage.goldProduction}
                      foodProduction={currentVillage.foodProduction}
                      showProduction
                    />
                  </section>

                  <section>
                    <BuildingQueue
                      buildings={currentVillage.buildings}
                      onCancel={async (buildingId) => {
                        try {
                          const res = await fetch("/api/buildings/cancel", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ buildingId }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            if (typeof window !== "undefined" && (window as any).__dashboardFetchHandler) {
                              await (window as any).__dashboardFetchHandler()
                            }
                          } else {
                            alert(data.error || "Failed to cancel building")
                          }
                        } catch (error) {
                          console.error("Failed to cancel building:", error)
                          alert("Failed to cancel building")
                        }
                      }}
                    />
                  </section>

                  <section>
                    <VillageOverview
                      village={currentVillage}
                      onUpgrade={async (buildingId) => {
                        try {
                          const res = await fetch("/api/buildings/upgrade", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ buildingId }),
                          })
                          const data = await res.json()
                          if (data.success && typeof window !== "undefined" && (window as any).__dashboardFetchHandler) {
                            await (window as any).__dashboardFetchHandler()
                          }
                        } catch (error) {
                          console.error("Failed to upgrade building:", error)
                        }
                      }}
                    />
                  </section>

                  <section className="flex gap-2">
                    <Link href={`/village/${currentVillage.id}`}>
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/village/${currentVillage.id}/buildings`}>
                      <Button variant="outline" className="w-full">
                        Buildings
                      </Button>
                    </Link>
                    <Link href={`/village/${currentVillage.id}/troops`}>
                      <Button variant="outline" className="w-full">
                        Troops
                      </Button>
                    </Link>
                  </section>
                </div>
              ) : null
            })()}
          </div>
        </div>
      </main>
    </div>
  )
}
