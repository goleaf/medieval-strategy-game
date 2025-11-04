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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await fetch("/api/villages?playerId=temp-player-id")
        const data = await res.json()
        if (data.success && data.data) {
          setVillages(data.data)
        } else {
          setVillages([])
        }
      } catch (error) {
        console.error("Failed to fetch villages:", error)
        setVillages([])
      } finally {
        setLoading(false)
      }
    }

    fetchVillages()
    const interval = setInterval(fetchVillages, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div
      x-data={`{
        selectedVillageId: ${villages.length > 0 ? `'${villages[0].id}'` : 'null'},
        villages: ${JSON.stringify(villages)},
        get currentVillage() {
          return this.villages.find(v => v.id === this.selectedVillageId);
        }
      }`}
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
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : villages.length === 0 ? (
            <section className="text-center py-8">
              <p className="mb-4">No villages yet. Create your first village!</p>
              <Button>Create Village</Button>
            </section>
          ) : (
            <>
              {villages.length > 1 && (
                <div className="p-3 border border-border rounded bg-secondary">
                  <label className="text-sm font-bold block mb-2">Select Village</label>
                  <select
                    x-model="selectedVillageId"
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
              <div x-show="currentVillage">
                <section className="space-y-2">
                  <h2 className="text-lg font-bold" x-text="currentVillage.name" />
                  <p className="text-sm text-muted-foreground" x-text="`Position: (${currentVillage.x}, ${currentVillage.y}) • Loyalty: ${currentVillage.loyalty}%`" />
                </section>

                <section>
                  <h3 className="text-md font-semibold mb-2">Resources</h3>
                  {villages.length > 0 && (
                    <ResourceDisplay
                      wood={villages.find(v => v.id === villages[0]?.id)?.wood || 0}
                      stone={villages.find(v => v.id === villages[0]?.id)?.stone || 0}
                      iron={villages.find(v => v.id === villages[0]?.id)?.iron || 0}
                      gold={villages.find(v => v.id === villages[0]?.id)?.gold || 0}
                      food={villages.find(v => v.id === villages[0]?.id)?.food || 0}
                      woodProduction={villages.find(v => v.id === villages[0]?.id)?.woodProduction || 0}
                      stoneProduction={villages.find(v => v.id === villages[0]?.id)?.stoneProduction || 0}
                      ironProduction={villages.find(v => v.id === villages[0]?.id)?.ironProduction || 0}
                      goldProduction={villages.find(v => v.id === villages[0]?.id)?.goldProduction || 0}
                      foodProduction={villages.find(v => v.id === villages[0]?.id)?.foodProduction || 0}
                      showProduction
                    />
                  )}
                </section>

                <section>
                  {villages.length > 0 && (
                    <BuildingQueue
                      buildings={villages.find(v => v.id === villages[0]?.id)?.buildings || []}
                      onCancel={async (buildingId) => {
                        try {
                          const res = await fetch("/api/buildings/cancel", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ buildingId }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            window.location.reload()
                          } else {
                            alert(data.error || "Failed to cancel building")
                          }
                        } catch (error) {
                          console.error("Failed to cancel building:", error)
                          alert("Failed to cancel building")
                        }
                      }}
                    />
                  )}
                </section>

                <section>
                  {villages.length > 0 && (
                    <VillageOverview
                      village={villages.find(v => v.id === villages[0]?.id) || villages[0]}
                      onUpgrade={async (buildingId) => {
                        try {
                          const res = await fetch("/api/buildings/upgrade", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ buildingId }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            window.location.reload()
                          }
                        } catch (error) {
                          console.error("Failed to upgrade building:", error)
                        }
                      }}
                    />
                  )}
                </section>

                <section className="flex gap-2">
                  {villages.length > 0 && (
                    <>
                      <Link href={`/village/${villages[0].id}`}>
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/village/${villages[0].id}/buildings`}>
                        <Button variant="outline" className="w-full">
                          Buildings
                        </Button>
                      </Link>
                      <Link href={`/village/${villages[0].id}/troops`}>
                        <Button variant="outline" className="w-full">
                          Troops
                        </Button>
                      </Link>
                    </>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
