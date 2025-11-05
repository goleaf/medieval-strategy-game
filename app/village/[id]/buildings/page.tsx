"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Zap } from "lucide-react"
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

function getBuildingImage(type: string): string {
  const imageMap: Record<string, string> = {
    HEADQUARTER: "/buildings/headquarter.svg",
    MARKETPLACE: "/buildings/marketplace.svg",
    BARRACKS: "/buildings/barracks.svg",
    STABLES: "/buildings/stables.svg",
    WATCHTOWER: "/buildings/watchtower.svg",
    WALL: "/buildings/wall.svg",
    WAREHOUSE: "/buildings/warehouse.svg",
    GRANARY: "/buildings/granary.svg",
    SAWMILL: "/buildings/sawmill.svg",
    QUARRY: "/buildings/quarry.svg",
    IRON_MINE: "/buildings/iron_mine.svg",
    TREASURY: "/buildings/treasury.svg",
    ACADEMY: "/buildings/academy.svg",
    TEMPLE: "/buildings/temple.svg",
    HOSPITAL: "/buildings/hospital.svg",
    FARM: "/buildings/farm.svg",
    SNOB: "/buildings/snob.svg",
    // Huns-specific buildings
    COMMAND_CENTER: "/buildings/command_center.svg",
    MAKESHIFT_WALL: "/buildings/makeshift_wall.svg",
  }
  return imageMap[type] || "/placeholder.svg"
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
          <Link href={`/village/${villageId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
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

          {/* Instant Completion Section */}
          <section className="bg-secondary/50 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Instant Completion
                </h3>
                <p className="text-sm text-muted-foreground">
                  Instantly complete all ongoing constructions and research in this village
                </p>
              </div>
              <Button
                onClick={handleInstantComplete}
                disabled={loading || !village.buildings.some(b => b.isBuilding)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Complete All
              </Button>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">All Buildings</h2>
            <TextTable
              headers={["Building", "Type", "Level", "Status", "Actions"]}
              rows={village.buildings.map((building) => [
                <div key={`image-${building.id}`} className="flex items-center justify-center">
                  <Image
                    src={getBuildingImage(building.type)}
                    alt={building.type}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>,
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
                  <Zap className="w-4 h-4" />
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
