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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const villagesRes = await fetch("/api/villages?playerId=temp-player-id")
      const villagesData = await villagesRes.json()
      if (villagesData.success && villagesData.data) {
        setVillages(villagesData.data)
      }

      // TODO: Fetch attacks from API
      setAttacks([])
    } catch (error) {
      console.error("Failed to fetch data:", error)
    }
  }

  return (
    <div
      x-data={`{
        selectedVillageId: ${villages.length > 0 ? `'${villages[0].id}'` : 'null'},
        villages: ${JSON.stringify(villages)},
        attacks: ${JSON.stringify(attacks)},
        get currentVillage() {
          return this.villages.find(v => v.id === this.selectedVillageId);
        }
      }`}
      className="min-h-screen bg-background text-foreground"
    >
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
          {villages.length > 1 && (
            <div className="p-3 border border-border rounded bg-secondary">
              <label className="text-sm font-bold block mb-2">Select Village</label>
              <select
                x-model="selectedVillageId"
                className="w-full p-2 border border-border rounded bg-background"
              >
                {villages.map((village) => (
                  <option key={village.id} value={village.id}>
                    {village.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div x-show="currentVillage">
            <section>
              <h2 className="text-lg font-bold mb-2">Plan Attack</h2>
              {villages.length > 0 && (
                <AttackPlanner
                  villageId={villages[0].id}
                  troops={villages[0].troops}
                  onLaunchAttack={fetchData}
                />
              )}
            </section>
          </div>

          <section>
            <h2 className="text-lg font-bold mb-2">Active Attacks</h2>
            <div x-show="attacks.length === 0" className="text-sm text-muted-foreground">No active attacks</div>
            <div x-show="attacks.length > 0">
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
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

