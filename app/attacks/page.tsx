"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Eye, X, Clock } from "lucide-react"
import { AttackPlanner } from "@/components/game/attack-planner"
import { ReinforcementPlanner } from "@/components/game/reinforcement-planner"
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
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [hasGoldClub, setHasGoldClub] = useState(false)
  const searchParams = useSearchParams()

  const prefillTarget = useMemo(() => {
    if (!searchParams) return undefined
    const x = searchParams.get("targetX")
    const y = searchParams.get("targetY")
    if (!x && !y) return undefined
    return {
      x: x ? Number(x) : undefined,
      y: y ? Number(y) : undefined,
    }
  }, [searchParams])

  const fetchData = useCallback(async (playerRef: string) => {
    try {
      const villagesRes = await fetch(`/api/villages?playerId=${playerRef}`)
      const villagesData = await villagesRes.json()
      if (villagesData.success && villagesData.data) {
        setVillages(villagesData.data)
        if (villagesData.data.length > 0) {
          setSelectedVillageId(prev => prev ?? villagesData.data[0].id)
        }
      }

      // Fetch attacks from API
      const attacksRes = await fetch(`/api/attacks?playerId=${playerRef}`)
      const attacksData = await attacksRes.json()
      if (attacksData.success) {
        setAttacks(attacksData.data)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    }
  }, [])

  const fetchPlayer = useCallback(async () => {
    try {
      const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      if (authToken) {
        const res = await fetch("/api/auth/player-data", {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        const json = await res.json()
        if (json.success && json.data?.player) {
          setPlayerId(json.data.player.id)
          setHasGoldClub(Boolean(json.data.player.hasGoldClubMembership))
          return
        }
      }
    } catch (error) {
      console.error("Failed to load player data:", error)
    }
    setPlayerId("temp-player-id")
    setHasGoldClub(false)
  }, [])

  const handleLaunchAttack = useCallback(
    async (
      toX: number,
      toY: number,
      selection: Record<string, number>,
      type: string,
      options?: { catapultTargets?: string[]; arriveAt?: string | null },
    ) => {
      if (!selectedVillageId) throw new Error("Select a village first")
      async function submit(confirmProtectionDrop?: boolean) {
        const response = await fetch("/api/attacks/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromVillageId: selectedVillageId,
            toX,
            toY,
            attackType: type,
            troopSelection: selection,
            catapultTargets: options?.catapultTargets,
            arriveAt: options?.arriveAt ?? undefined,
            ...(confirmProtectionDrop ? { confirmProtectionDrop: true } : {}),
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          // Handle early-protection drop confirmation
          if (
            response.status === 409 &&
            typeof data.error === "string" &&
            data.error.toLowerCase().includes("end your beginner protection")
          ) {
            const ok = window.confirm(
              "Attacking this target will end your beginner protection immediately. Proceed?",
            )
            if (ok) {
              return submit(true)
            }
            return
          }
          throw new Error(data.error || "Failed to launch attack")
        }
        await fetchData(playerId ?? "temp-player-id")
        alert("Attack launched!")
      }
      await submit()
    },
    [fetchData, playerId, selectedVillageId],
  )

  const handleSendReinforcements = useCallback(
    async (toX: number, toY: number, selection: Record<string, number>) => {
      if (!selectedVillageId) throw new Error("Select a village first")
      const units = Object.entries(selection).map(([troopId, quantity]) => ({
        troopId,
        quantity,
      }))
      const response = await fetch("/api/reinforcements/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromVillageId: selectedVillageId,
          toX,
          toY,
          units,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to send reinforcements")
      }
      alert("Reinforcements en route!")
    },
    [selectedVillageId],
  )

  const handleCancelAttack = async (attackId: string) => {
    if (!confirm("Are you sure you want to cancel this attack?")) return

    try {
      const response = await fetch(`/api/attacks/${attackId}`, {
        method: "DELETE"
      })
      const data = await response.json()

      if (data.success) {
        alert("Attack cancelled successfully!")
        await fetchData(playerId ?? "temp-player-id") // Refresh the data
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
    fetchPlayer()
  }, [fetchPlayer])

  useEffect(() => {
    if (playerId) {
      fetchData(playerId)
    }
  }, [fetchData, playerId])

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
          <div className="w-16 text-right">
            <Link href="/tutorial">
              <Button size="sm" variant="outline">Help</Button>
            </Link>
          </div>
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
                <>
                  <section>
                    <h2 className="text-lg font-bold mb-2">Plan Attack</h2>
                    <AttackPlanner
                      villageId={currentVillage.id}
                      troops={currentVillage.troops as any}
                      playerId={playerId}
                      playerHasGoldClub={hasGoldClub}
                      onLaunchAttack={handleLaunchAttack}
                      prefillTarget={prefillTarget}
                    />
                  </section>

                  <section>
                    <h2 className="text-lg font-bold mb-2">Send Reinforcements</h2>
                    <ReinforcementPlanner
                      villageId={currentVillage.id}
                      troops={currentVillage.troops as any}
                      playerId={playerId}
                      playerHasGoldClub={hasGoldClub}
                      onSendReinforcements={handleSendReinforcements}
                    />
                  </section>
                </>
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
