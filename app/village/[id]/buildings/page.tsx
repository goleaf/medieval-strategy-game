"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { BuildingQueue } from "@/components/game/building-queue"
import { TextTable } from "@/components/game/text-table"
import { CountdownTimer } from "@/components/game/countdown-timer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { SuccessMessage } from "@/components/ui/success-message"
import { Button } from "@/components/ui/button"
// Types inferred from API responses
type VillageWithBuildings = {
  id: string
  name: string
  buildings: Array<{ id: string; type: string; level: number; isBuilding: boolean; completionAt: string | null; queuePosition: number | null }>
}

export default function BuildingsPage() {
  const params = useParams()
  const villageId = params.id as string
  const [village, setVillage] = useState<VillageWithBuildings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      } finally {
        setLoading(false)
      }
    }

    fetchVillage()
    const interval = setInterval(fetchVillage, 10000)
    return () => clearInterval(interval)
  }, [villageId])

  const handleUpgrade = async (buildingId: string) => {
    try {
      const res = await fetch("/api/buildings/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      })
      const data = await res.json()
      if (data.success) {
        // Refresh
        const villagesRes = await fetch("/api/villages?playerId=temp-player-id")
        const villagesData = await villagesRes.json()
        if (villagesData.success && villagesData.data) {
          const found = villagesData.data.find((v: any) => v.id === villageId)
          setVillage(found || null)
        }
        return { success: true, message: "Building upgrade started!" }
      } else {
        return { success: false, error: data.error || "Failed to upgrade building" }
      }
    } catch (error) {
      console.error("Failed to upgrade building:", error)
      return { success: false, error: "Failed to upgrade building. Please try again." }
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__buildingsUpgradeHandler = handleUpgrade
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__buildingsUpgradeHandler
      }
    }
  }, [villageId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

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

      <main
        x-data={`{
          error: null,
          success: null,
          async handleUpgrade(buildingId) {
            this.error = null;
            this.success = null;
            if (window.__buildingsUpgradeHandler) {
              const result = await window.__buildingsUpgradeHandler(buildingId);
              if (result.success) {
                this.success = result.message;
                setTimeout(() => this.success = null, 5000);
              } else {
                this.error = result.error;
                setTimeout(() => this.error = null, 5000);
              }
            }
          }
        }`}
        className="w-full p-4"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          <div x-show="error" className="bg-destructive/10 border border-destructive rounded p-3 flex items-center justify-between">
            <span className="text-destructive text-sm" x-text="`❌ ${error}`" />
            <button x-on:click="error = null" className="text-destructive hover:text-destructive/80 text-sm">✕</button>
          </div>
          <div x-show="success" className="bg-green-500/10 border border-green-500 rounded p-3 flex items-center justify-between">
            <span className="text-green-600 text-sm" x-text="`✅ ${success}`" />
            <button x-on:click="success = null" className="text-green-600 hover:text-green-600/80 text-sm">✕</button>
          </div>
          <BuildingQueue buildings={village.buildings} />

          <section>
            <h2 className="text-lg font-bold mb-2">All Buildings</h2>
            <TextTable
              headers={["Type", "Level", "Status", "Actions"]}
              rows={village.buildings.map((building) => [
                building.type,
                building.level.toString(),
                building.isBuilding && building.completionAt ? (
                  <span className="text-sm">
                    Building: <CountdownTimer targetDate={building.completionAt} />
                  </span>
                ) : (
                  "Ready"
                ),
                <Button
                  key={building.id}
                  variant="outline"
                  size="sm"
                  x-on:click={`handleUpgrade('${building.id}')`}
                  x-bind:disabled={`${building.isBuilding}`}
                >
                  <span x-show={`${building.isBuilding}`}>Building...</span>
                  <span x-show={`${!building.isBuilding}`}>Upgrade</span>
                </Button>,
              ])}
            />
          </section>
        </div>
      </main>
    </div>
  )
}

