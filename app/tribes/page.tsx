"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Tribe {
  id: string
  name: string
  tag: string
  memberCount: number
  totalPoints: number
  leader: { playerName: string }
}

export default function TribesPage() {
  const [tribes, setTribes] = useState<Tribe[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null)

  useEffect(() => {
    const fetchTribes = async () => {
      try {
        const res = await fetch("/api/tribes")
        const data = await res.json()
        setTribes(data)
      } finally {
        setLoading(false)
      }
    }
    fetchTribes()
  }, [])

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Tribes & Alliances</h1>

        {loading ? (
          <Card className="p-6 text-center">Loading tribes...</Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              {tribes.map((tribe) => (
                <Card
                  key={tribe.id}
                  onClick={() => setSelectedTribe(tribe)}
                  className={`p-6 cursor-pointer transition border-2 ${
                    selectedTribe?.id === tribe.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{tribe.name}</h3>
                      <p className="text-sm text-muted-foreground">Tag: {tribe.tag}</p>
                      <p className="text-sm mt-2">Leader: {tribe.leader.playerName}</p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="font-bold">{tribe.memberCount} members</p>
                      <p className="text-xs text-muted-foreground">{tribe.totalPoints.toLocaleString()} points</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {selectedTribe && (
              <Card className="p-6 h-fit space-y-4">
                <h3 className="font-bold text-lg">{selectedTribe.name}</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-bold">Members:</span> {selectedTribe.memberCount}
                  </p>
                  <p>
                    <span className="font-bold">Points:</span> {selectedTribe.totalPoints.toLocaleString()}
                  </p>
                  <p>
                    <span className="font-bold">Leader:</span> {selectedTribe.leader.playerName}
                  </p>
                </div>
                <Button className="w-full">Request to Join</Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
