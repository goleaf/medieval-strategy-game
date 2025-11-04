"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { TroopTrainer } from "@/components/game/troop-trainer"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"
// Types inferred from API responses
type VillageWithTroops = {
  id: string
  name: string
  troops: Array<{ id: string; type: string; quantity: number; attack: number; defense: number; speed: number }>
}

export default function TroopsPage() {
  const params = useParams()
  const villageId = params.id as string
  const [village, setVillage] = useState<VillageWithTroops | null>(null)
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
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
          <h1 className="text-xl font-bold">Troops - {village.name}</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <section>
            <h2 className="text-lg font-bold mb-2">Current Troops</h2>
            {village.troops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No troops stationed</p>
            ) : (
              <TextTable
                headers={["Type", "Quantity", "Attack", "Defense", "Speed"]}
                rows={village.troops.map((troop) => [
                  troop.type,
                  troop.quantity.toLocaleString(),
                  troop.attack.toString(),
                  troop.defense.toString(),
                  troop.speed.toString(),
                ])}
              />
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Train Troops</h2>
            <TroopTrainer
              villageId={villageId}
              onTrain={async () => {
                const res = await fetch("/api/villages?playerId=temp-player-id")
                const data = await res.json()
                if (data.success && data.data) {
                  const found = data.data.find((v: any) => v.id === villageId)
                  setVillage(found || null)
                }
              }}
            />
          </section>
        </div>
      </main>
    </div>
  )
}

