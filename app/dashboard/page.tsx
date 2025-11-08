"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Swords, ShoppingCart, MessageCircle, Users, Trophy, Eye, Hammer, Shield, LogOut, Settings } from "lucide-react"
import { VillageOverview } from "@/components/game/village-overview"
import { ResourceDisplay } from "@/components/game/resource-display"
import { BuildingQueue } from "@/components/game/building-queue"
import { Navbar } from "@/components/game/navbar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
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
  const router = useRouter()
  const [villages, setVillages] = useState<VillageWithRelations[]>([])
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { auth, initialized, clearAuth } = useAuth({ redirectOnMissing: true, redirectTo: "/login" })

  const fetchVillages = useCallback(async () => {
    if (!auth) return
    try {
      setLoading(true)
      const res = await fetch(`/api/villages?playerId=${auth.playerId}`, {
        headers: {
          "Authorization": `Bearer ${auth.token}`,
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
  }, [auth])

  const handleLogout = useCallback(async () => {
    try {
      if (auth?.token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${auth.token}`,
          },
        })
      }
    } catch (error) {
      console.error("Logout API call failed:", error)
      // Continue with logout even if API call fails
    }

    clearAuth()

    // Redirect to login page
    router.push("/login")
  }, [auth, clearAuth, router])

  useEffect(() => {
    if (!auth) return
    fetchVillages()
    const interval = setInterval(fetchVillages, 30000) // Refresh every 30 seconds
    if (typeof window !== "undefined") {
      (window as any).__dashboardFetchHandler = fetchVillages
      ;(window as any).__dashboardSetSelectedVillage = (id: string | null) => {
        setSelectedVillageId(id)
      }
      ;(window as any).__dashboardLogoutHandler = handleLogout
    }
    return () => {
      clearInterval(interval)
      if (typeof window !== "undefined") {
        delete (window as any).__dashboardFetchHandler
        delete (window as any).__dashboardSetSelectedVillage
        delete (window as any).__dashboardLogoutHandler
      }
    }
  }, [auth, fetchVillages, handleLogout])

  useEffect(() => {
    // Sync Alpine.js state when React state changes
    if (typeof window !== "undefined" && (window as any).Alpine) {
      const alpineElement = document.querySelector('[x-data]')
      if (alpineElement && (alpineElement as any)._x_dataStack) {
        const alpineData = (alpineElement as any)._x_dataStack[0]
        if (alpineData && alpineData.selectedVillageId !== selectedVillageId) {
          alpineData.selectedVillageId = selectedVillageId || ''
        }
        if (alpineData && alpineData.loading !== loading) {
          alpineData.loading = loading
        }
        if (alpineData && alpineData.villagesCount !== villages.length) {
          alpineData.villagesCount = villages.length
        }
      }
    }
  }, [selectedVillageId, loading, villages.length])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Loading dashboard...
      </div>
    )
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Redirecting to login...
      </div>
    )
  }

  return (
    <div
      x-data={`{
        selectedVillageId: '${selectedVillageId || ''}',
        loading: ${loading},
        villagesCount: ${villages.length},
        handleChange() {
          if (window.__dashboardSetSelectedVillage) {
            window.__dashboardSetSelectedVillage(this.selectedVillageId);
          }
        },
        async handleLogout() {
          if (window.__dashboardLogoutHandler) {
            await window.__dashboardLogoutHandler();
          }
        }
      }`}
      className="min-h-screen bg-background text-foreground flex flex-col"
    >
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">🏰 Medieval Strategy</h1>
          <nav className="flex gap-2 text-sm">
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
            <Link href="/settings" className="flex items-center gap-1 px-2 py-1 hover:bg-secondary rounded">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1 hover:bg-secondary rounded text-red-400 hover:text-red-300"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full p-4">
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
              <Navbar
                villages={villages}
                currentVillageId={selectedVillageId}
                onVillageChange={setSelectedVillageId}
                playerId={auth.playerId}
                notificationCount={0}
              />
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
                      tasks={currentVillage.buildQueueTasks}
                      activeResearchCount={currentVillage.buildings.filter((b: any) => b.research?.isResearching).length}
                      villageId={currentVillage.id}
                      onCancel={async (buildingId) => {
                        try {
                          const res = await fetch("/api/buildings/cancel", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${auth.token}`,
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
                      onInstantComplete={async () => {
                        await fetchVillages()
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
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${auth.token}`,
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
