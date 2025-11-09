"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"
import { TroopTrainer } from "@/components/game/troop-trainer"
import { RallyPoint } from "@/components/game/rally-point"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrainingQueuePanel } from "@/components/game/training-queue-panel"
import { useToast } from "@/components/ui/use-toast"
import type { TrainingBuilding, TrainingStatus } from "@prisma/client"
// Types inferred from API responses
type VillageWithTroops = {
  id: string
  name: string
  isCapital: boolean
  troopEvasionEnabled: boolean
  troops: Array<{ id: string; type: string; quantity: number; attack: number; defense: number; speed: number }>
  trainingQueueItems: TrainingQueueItem[]
}

function formatUnitLabel(job: TrainingQueueItem): string {
  if (job.unitType?.displayName) {
    return job.unitType.displayName
  }
  return job.unitTypeId
}

type TrainingQueueItem = {
  id: string
  building: TrainingBuilding
  count: number
  startAt: string
  finishAt: string
  status: TrainingStatus
  unitTypeId: string
  unitType: { id: string; displayName?: string | null } | null
}

export default function TroopsPage() {
  const params = useParams()
  const villageId = params.id as string
  const [village, setVillage] = useState<VillageWithTroops | null>(null)
  const [playerTribe, setPlayerTribe] = useState<string>("TEUTONS")
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [hasGoldClub, setHasGoldClub] = useState(false)
  const previousQueueRef = useRef<Map<string, TrainingQueueItem>>(new Map())
  const cancelledJobIdsRef = useRef<Set<string>>(new Set())
  const { toast } = useToast()

  const fetchVillage = useCallback(async () => {
    try {
      // Get player data to determine tribe
      const authToken = localStorage.getItem("authToken")
      if (authToken) {
        const playerRes = await fetch("/api/auth/player-data", {
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        })
        const playerData = await playerRes.json()
        if (playerData.success && playerData.data.player) {
          if (playerData.data.player.tribe) {
            setPlayerTribe(playerData.data.player.tribe)
          }
          setHasGoldClub(Boolean(playerData.data.player.hasGoldClubMembership))
          setPlayerId(playerData.data.player.id ?? null)
        }
      }

      const res = await fetch("/api/villages?playerId=temp-player-id")
      const data = await res.json()
      if (data.success && data.data) {
        const found = data.data.find((v: any) => v.id === villageId)
        if (found) {
          found.trainingQueueItems = found.trainingQueueItems ?? []
        }
        setVillage(found || null)
      }
    } catch (error) {
      console.error("Failed to fetch village:", error)
    }
  }, [villageId])

  useEffect(() => {
    fetchVillage()
    const interval = setInterval(fetchVillage, 10000)
    if (typeof window !== "undefined") {
      (window as any).__troopsPageFetchHandler = fetchVillage
    }
    return () => {
      clearInterval(interval)
      if (typeof window !== "undefined") {
        delete (window as any).__troopsPageFetchHandler
      }
    }
  }, [fetchVillage])

  useEffect(() => {
    if (!village?.trainingQueueItems) {
      previousQueueRef.current = new Map()
      return
    }

    const nextMap = new Map(village.trainingQueueItems.map((job) => [job.id, job]))
    for (const [jobId, job] of previousQueueRef.current) {
      if (!nextMap.has(jobId)) {
        if (cancelledJobIdsRef.current.has(jobId)) {
          cancelledJobIdsRef.current.delete(jobId)
          continue
        }
        toast({
          title: "Training complete",
          description: `${job.count.toLocaleString()} ${formatUnitLabel(job)} ready for deployment.`,
        })
      }
    }
    previousQueueRef.current = nextMap
  }, [village?.trainingQueueItems, toast])

  const handleCancelTraining = useCallback(
    async (queueItemId: string) => {
      cancelledJobIdsRef.current.add(queueItemId)
      try {
        const response = await fetch(`/api/troops/training/${queueItemId}/cancel`, { method: "POST" })
        const payload = await response.json()
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to cancel training")
        }
        toast({
          title: "Training cancelled",
          description: "Batch removed from the queue.",
        })
        await fetchVillage()
      } catch (error) {
        cancelledJobIdsRef.current.delete(queueItemId)
        toast({
          title: "Unable to cancel training",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        })
      }
    },
    [fetchVillage, toast],
  )

  if (!village) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Village not found</p>
          <Link href="/dashboard">
            <Button>
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      x-data={`{
        loading: false,
        async init() {
          this.loading = true;
          if (window.__troopsPageFetchHandler) {
            await window.__troopsPageFetchHandler();
          }
          this.loading = false;
        }
      }`}
      className="min-h-screen bg-background text-foreground"
    >
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/village/${villageId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Troops - {village.name}</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div x-show="loading" className="min-h-screen flex items-center justify-center">Loading...</div>
        <div x-show="!loading" className="max-w-4xl mx-auto">
          <Tabs defaultValue="troops" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="troops">Troop Management</TabsTrigger>
              <TabsTrigger value="rally">Rally Point</TabsTrigger>
            </TabsList>

            <TabsContent value="troops" className="space-y-4 mt-4">
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
                <h2 className="text-lg font-bold mb-2">Training Queue</h2>
                <TrainingQueuePanel queue={village.trainingQueueItems ?? []} onCancel={handleCancelTraining} />
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2">Queue New Batches</h2>
                <TroopTrainer
                  villageId={villageId}
                  tribe={playerTribe as any}
                  onTrain={async () => {
                    await fetchVillage()
                  }}
                />
              </section>
            </TabsContent>

            <TabsContent value="rally" className="mt-4">
              <RallyPoint
                villageId={villageId}
                ownerAccountId={playerId ?? undefined}
                isCapital={village.isCapital}
                troopEvasionEnabled={village.troopEvasionEnabled}
                hasGoldClub={hasGoldClub}
                availableTroops={village.troops}
                onEvasionToggle={async (enabled: boolean) => {
                  const res = await fetch(`/api/villages/${villageId}/evasion`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled }),
                  })

                  if (res.ok) {
                    // Refresh village data
                    const villageRes = await fetch("/api/villages?playerId=temp-player-id")
                    const data = await villageRes.json()
                    if (data.success && data.data) {
                      const found = data.data.find((v: any) => v.id === villageId)
                      setVillage(found || null)
                    }
                  } else {
                    throw new Error('Failed to update evasion settings')
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
