"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { VillageOverview } from "@/components/game/village-overview"
import { ResourceDisplay } from "@/components/game/resource-display"
import { BuildingQueue } from "@/components/game/building-queue"
import { Button } from "@/components/ui/button"
import type { Village, Building, Troop } from "@prisma/client"

export default function Dashboard() {
  const [villages, setVillages] = useState<(Village & { buildings: Building[]; troops: Troop[] })[]>([])
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await fetch("/api/villages?playerId=temp-player-id")
        const data = await res.json()
        if (data.success && data.data) {
          setVillages(data.data)
          if (data.data.length > 0) {
            setSelectedVillage(data.data[0].id)
          }
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

  const currentVillage = villages.find((v) => v.id === selectedVillage)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          {villages.length === 0 ? (
            <section className="text-center py-8">
              <p className="mb-4">No villages yet. Create your first village!</p>
              <Button>Create Village</Button>
            </section>
          ) : (
            <>
              {currentVillage && (
                <>
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
                          // TODO: Implement cancel API call
                          console.log("Cancel building:", buildingId)
                        } catch (error) {
                          console.error("Failed to cancel building:", error)
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
                          if (data.success) {
                            // Refresh villages
                            const villagesRes = await fetch("/api/villages?playerId=temp-player-id")
                            const villagesData = await villagesRes.json()
                            if (villagesData.success && villagesData.data) {
                              setVillages(villagesData.data)
                            }
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
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
