"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AttackPlanner } from "@/components/game/attack-planner"
import { TextTable } from "@/components/game/text-table"
import { CountdownTimer } from "@/components/game/countdown-timer"
import { Button } from "@/components/ui/button"
// Types inferred from API responses
type VillageWithTroops = {
  id: string
  name: string
  troops: Array<{ id: string; type: string; quantity: number }>
}

interface Attack {
  id: string
  type: string
  status: string
  arrivalAt: string
  fromVillage: { name: string; x: number; y: number }
  toVillage: { name: string; x: number; y: number } | null
}

export default function AttacksPage() {
  const [villages, setVillages] = useState<VillageWithTroops[]>([])
  const [attacks, setAttacks] = useState<Attack[]>([])
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const villagesRes = await fetch("/api/villages?playerId=temp-player-id")
      const villagesData = await villagesRes.json()
      if (villagesData.success && villagesData.data) {
        setVillages(villagesData.data)
        if (villagesData.data.length > 0 && !selectedVillage) {
          setSelectedVillage(villagesData.data[0].id)
        }
      }

      // TODO: Fetch attacks from API
      setAttacks([])
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

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
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">⚔️ Attacks</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {currentVillage && (
            <section>
              <h2 className="text-lg font-bold mb-2">Plan Attack</h2>
              <AttackPlanner
                villageId={currentVillage.id}
                troops={currentVillage.troops}
                onLaunchAttack={fetchData}
              />
            </section>
          )}

          <section>
            <h2 className="text-lg font-bold mb-2">Active Attacks</h2>
            {attacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active attacks</p>
            ) : (
              <TextTable
                headers={["Type", "From", "To", "Status", "Arrival", "Actions"]}
                rows={attacks.map((attack) => [
                  attack.type,
                  `${attack.fromVillage.name} (${attack.fromVillage.x}, ${attack.fromVillage.y})`,
                  attack.toVillage
                    ? `${attack.toVillage.name} (${attack.toVillage.x}, ${attack.toVillage.y})`
                    : "Unknown",
                  attack.status,
                  <CountdownTimer key={attack.id} targetDate={attack.arrivalAt} />,
                  <Button key={attack.id} variant="outline" size="sm">
                    View
                  </Button>,
                ])}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

