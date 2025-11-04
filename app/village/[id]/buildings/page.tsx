"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { BuildingQueue } from "@/components/game/building-queue"
import { TextTable } from "@/components/game/text-table"
import { CountdownTimer } from "@/components/game/countdown-timer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"

type VillageWithBuildings = {
  id: string
  name: string
  buildings: Array<{ id: string; type: string; level: number; isBuilding: boolean; completionAt: string | null; queuePosition: number | null }>
}

export default function BuildingsPage() {
  const params = useParams()
  const villageId = params.id as string
  const [village, setVillage] = useState<VillageWithBuildings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchVillage = async () => {
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
  }

  const handleUpgrade = async (buildingId: string) => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch("/api/buildings/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess("Building upgrade started!")
        setTimeout(() => setSuccess(null), 5000)
        await fetchVillage()
      } else {
        setError(data.error || "Failed to upgrade building")
        setTimeout(() => setError(null), 5000)
      }
    } catch (error) {
      console.error("Failed to upgrade building:", error)
      setError("Failed to upgrade building. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVillage()
    const interval = setInterval(fetchVillage, 10000)
    return () => {
      clearInterval(interval)
    }
  }, [villageId])

  if (!village) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Village not found</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/village/${villageId}`} className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">Buildings - {village.name}</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive rounded p-3 flex items-center justify-between">
              <span className="text-destructive text-sm">❌ {error}</span>
              <button onClick={() => setError(null)} className="text-destructive hover:text-destructive/80 text-sm">✕</button>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500 rounded p-3 flex items-center justify-between">
              <span className="text-green-600 text-sm">✅ {success}</span>
              <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-600/80 text-sm">✕</button>
            </div>
          )}
          {loading && <div className="text-center py-4">Processing...</div>}
          <BuildingQueue buildings={village.buildings} />

          <section>
            <h2 className="text-lg font-bold mb-2">All Buildings</h2>
            <TextTable
              headers={["Type", "Level", "Status", "Actions"]}
              rows={village.buildings.map((building) => [
                building.type,
                building.level.toString(),
                building.isBuilding && building.completionAt ? (
                  <span key={`status-${building.id}`} className="text-sm">
                    Building: <CountdownTimer targetDate={building.completionAt} />
                  </span>
                ) : (
                  "Ready"
                ),
                <Button
                  key={building.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpgrade(building.id)}
                  disabled={building.isBuilding}
                >
                  {building.isBuilding ? "Building..." : "Upgrade"}
                </Button>,
              ])}
            />
          </section>
        </div>
      </main>
    </div>
  )
}
