"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Eye, X, Clock } from "lucide-react"
import { AttackPlanner } from "@/components/game/attack-planner"
import { CombatSimulator } from "@/components/game/combat-simulator"
import { TextTable } from "@/components/game/text-table"
import { CountdownTimer } from "@/components/game/countdown-timer"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  createdAt: string
  fromVillage: { name: string; x: number; y: number }
  toVillage: { name: string; x: number; y: number } | null
  movement: { startedAt: string }
  attackUnits: Array<{ troop: { type: string }; quantity: number }>
}

export default function AttacksPage() {
  const [villages, setVillages] = useState<VillageWithTroops[]>([])
  const [attacks, setAttacks] = useState<Attack[]>([])
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const villagesRes = await fetch("/api/villages?playerId=temp-player-id")
      const villagesData = await villagesRes.json()
      if (villagesData.success && villagesData.data) {
        setVillages(villagesData.data)
        if (villagesData.data.length > 0) {
          setSelectedVillageId(prev => prev ?? villagesData.data[0].id)
        }
      }

      // Fetch attacks from API
      const attacksRes = await fetch("/api/attacks?playerId=temp-player-id")
      const attacksData = await attacksRes.json()
      if (attacksData.success) {
        setAttacks(attacksData.data)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    }
  }, [])

  const handleCancelAttack = async (attackId: string) => {
    if (!confirm("Are you sure you want to cancel this attack?")) return

    try {
      const response = await fetch(`/api/attacks/${attackId}`, {
        method: "DELETE"
      })
      const data = await response.json()

      if (data.success) {
        alert("Attack cancelled successfully!")
        await fetchData() // Refresh the data
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Failed to cancel attack:", error)
      alert("Failed to cancel attack")
    }
  }

  const canCancelAttack = (attack: Attack) => {
    // Can only cancel if attack is in progress and within 90 seconds
    if (attack.status !== "IN_PROGRESS") return false

    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000)
    const createdAt = new Date(attack.createdAt)
    return createdAt > ninetySecondsAgo
  }

  const getTroopSummary = (attack: Attack) => {
    const totalTroops = attack.attackUnits.reduce((sum, unit) => sum + unit.quantity, 0)
    const troopTypes = attack.attackUnits.map(unit => `${unit.quantity}x ${unit.troop.type}`).join(", ")
    return `${totalTroops} troops (${troopTypes})`
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const currentVillage = villages.find(v => v.id === selectedVillageId)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">⚔️ Attacks</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <Tabs defaultValue="attacks" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attacks">⚔️ Attacks</TabsTrigger>
              <TabsTrigger value="simulator">🎯 Combat Simulator</TabsTrigger>
              <TabsTrigger value="rallies">🏰 Rallies</TabsTrigger>
            </TabsList>

            <TabsContent value="attacks" className="space-y-4">
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
                        {village.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {currentVillage && (
                <section>
                  <h2 className="text-lg font-bold mb-2">Plan Attack</h2>
                  <AttackPlanner
                    villageId={currentVillage.id}
                    troops={currentVillage.troops as any}
                    onLaunchAttack={async () => {
                      await fetchData()
                    }}
                  />
                </section>
              )}

              <section>
                <h2 className="text-lg font-bold mb-2">Active Attacks</h2>
                {attacks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No active attacks</div>
                ) : (
                  <TextTable
                    headers={["Type", "Troops", "From", "To", "Status", "Arrival", "Actions"]}
                    rows={attacks.map((attack) => [
                      attack.type,
                      getTroopSummary(attack),
                      `${attack.fromVillage.name} (${attack.fromVillage.x}, ${attack.fromVillage.y})`,
                      attack.toVillage
                        ? `${attack.toVillage.name} (${attack.toVillage.x}, ${attack.toVillage.y})`
                        : "Unknown",
                      <span key={`status-${attack.id}`} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        attack.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                        attack.status === "ARRIVED" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {attack.status === "IN_PROGRESS" && <Clock className="w-3 h-3" />}
                        {attack.status}
                      </span>,
                      <CountdownTimer key={attack.id} targetDate={attack.arrivalAt} />,
                      <div key={`actions-${attack.id}`} className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        {canCancelAttack(attack) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelAttack(attack.id)}
                            title="Cancel attack (within 90 seconds)"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </Button>
                        )}
                      </div>,
                    ])}
                  />
                )}
              </section>
            </TabsContent>

            <TabsContent value="simulator">
              <CombatSimulator />
            </TabsContent>

            <TabsContent value="rallies">
              <div className="text-center py-8 text-muted-foreground">
                Rally point management coming soon...
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
