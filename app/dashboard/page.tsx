"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Map, Swords, ShoppingCart, MessageCircle, Users, Trophy, Eye, Hammer, Shield } from "lucide-react"
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
  const [loading, setLoading] = useState(false)

  const fetchVillages = useCallback(async () => {
      try {
        setLoading(true)
        const authToken = localStorage.getItem("authToken")
        const playerId = localStorage.getItem("playerId")

        if (!authToken || !playerId) {
          console.error("No auth token or player ID found")
          setVillages([])
          setLoading(false)
          return
        }

        const res = await fetch(`/api/villages?playerId=${playerId}`, {
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        })
        const data = await res.json()
        if (data.success && data.data) {
          setVillages(data.data)
          setSelectedVillageId((prev) => {
            if (!prev && data.data.length > 0) {
              return data.data[0].id
            }
            return prev
          })
        } else {
          setVillages([])
        }
      } catch (error) {
        console.error("Failed to fetch villages:", error)
        setVillages([])
      } finally {
        setLoading(false)
      }
  }, [])

  useEffect(() => {
    fetchVillages()
    const interval = setInterval(fetchVillages, 30000) // Refresh every 30 seconds
    return () => {
      clearInterval(interval)
    }
  }, [fetchVillages])


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">🏰 Medieval Strategy</h1>
          <nav className="flex gap-2 text-sm">
            <Link href="/map" className="flex items-center gap-1 px-2 py-1 hover:bg-secondary rounded">
              <Map className="w-4 h-4" />
              Map
            </Link>
            <Link href="/attacks" className="flex items-center gap-1 px-2 py-1 hover:bg-secondary rounded">
              <Swords className="w-4 h-4" />
              Attacks
            </Link>
            <Link href="/market" className="flex items-center gap-1 px-2 py-1 hover:bg-secondary rounded">
              <ShoppingCart className="w-4 h-4" />
              Market
            </Link>
            <Link href="/messages" className="flex items-center gap-1 px-2 py-1 hover:bg-secondary rounded">
              <MessageCircle className="w-4 h-4" />
              Messages
            </Link>
            <Link href="/tribes" className="flex items-center gap-1 px-2 py-1 hover:bg-secondary rounded">
              <Users className="w-4 h-4" />
              Tribes
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-1 px-2 py-1 hover:bg-secondary rounded">
              <Trophy className="w-4 h-4" />
              Rankings
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading && (
            <div className="text-center py-8">Loading...</div>
          )}
          {!loading && villages.length === 0 && (
            <div className="text-center py-8">
              <p className="mb-4">Setting up your kingdom...</p>
              <p className="text-sm text-muted-foreground">Your first village is being created.</p>
            </div>
          )}
          {!loading && villages.length > 0 && (
            <>
              {villages.length > 1 && (
                <div className="p-3 border border-border rounded bg-secondary">
                  <label className="text-sm font-bold block mb-2">Select Village</label>
                  <select
                    value={selectedVillageId || ''}
                    onChange={(e) => setSelectedVillageId(e.target.value)}
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
                          const authToken = localStorage.getItem("authToken")
                          const res = await fetch("/api/buildings/cancel", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${authToken}`,
                            },
                            body: JSON.stringify({ buildingId }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            await fetchVillages()
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
                          const authToken = localStorage.getItem("authToken")
                          const res = await fetch("/api/buildings/upgrade", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${authToken}`,
                            },
                            body: JSON.stringify({ buildingId }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            await fetchVillages()
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
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/village/${currentVillage.id}/buildings`}>
                      <Button variant="outline" className="w-full">
                        <Hammer className="w-4 h-4" />
                        Buildings
                      </Button>
                    </Link>
                    <Link href={`/village/${currentVillage.id}/troops`}>
                      <Button variant="outline" className="w-full">
                        <Shield className="w-4 h-4" />
                        Troops
                      </Button>
                    </Link>
                  </section>
                </div>
              ) : null
            })()}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
