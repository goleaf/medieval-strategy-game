"use client"

import { useState, useEffect } from "react"
import { VillageOverview } from "@/components/game/village-overview"
import { TroopTrainer } from "@/components/game/troop-trainer"
import { AttackPlanner } from "@/components/game/attack-planner"
import { Navbar } from "@/components/game/navbar"
import { Button } from "@/components/ui/button"
import type { Village, Building, Troop } from "@prisma/client"

export default function Dashboard() {
  const [villages, setVillages] = useState<(Village & { buildings: Building[]; troops: Troop[] })[]>([])
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const res = await fetch("/api/villages?playerId=temp-player-id")
        const data = await res.json()
        setVillages(data)
        if (data.length > 0) {
          setSelectedVillage(data[0].id)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchVillages()
  }, [])

  const currentVillage = villages.find((v) => v.id === selectedVillage)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        villages={villages}
        currentVillageId={selectedVillage}
        onVillageChange={setSelectedVillage}
        notificationCount={0}
      />
      
      <main className="flex-1 w-full p-4">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>

          {villages.length === 0 ? (
            <section>
              <p className="mb-4">No villages yet. Create your first village!</p>
              <Button>Create Village</Button>
            </section>
          ) : (
            <>
              {currentVillage && (
                <>
                  <VillageOverview
                    village={currentVillage}
                    onUpgrade={async (buildingId) => {
                      // TODO: Implement upgrade
                      console.log("Upgrade building:", buildingId)
                    }}
                  />
                  
                  <section>
                    <h2 className="text-xl font-bold mb-2">Train Troops</h2>
                    <TroopTrainer
                      villageId={currentVillage.id}
                      onTrain={async () => {
                        // Refresh villages
                        const res = await fetch("/api/villages?playerId=temp-player-id")
                        const data = await res.json()
                        setVillages(data)
                      }}
                    />
                  </section>
                  
                  <section>
                    <h2 className="text-xl font-bold mb-2">Plan Attack</h2>
                    <AttackPlanner
                      villageId={currentVillage.id}
                      troops={currentVillage.troops}
                      onLaunchAttack={async () => {
                        // Refresh villages
                        const res = await fetch("/api/villages?playerId=temp-player-id")
                        const data = await res.json()
                        setVillages(data)
                      }}
                    />
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
