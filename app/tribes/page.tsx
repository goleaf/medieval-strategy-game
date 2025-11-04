"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/game/navbar"

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
  const [villages] = useState<any[]>([])

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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        villages={villages}
        currentVillageId={null}
        onVillageChange={() => {}}
        notificationCount={0}
      />
      
      <main className="flex-1 w-full p-4">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Tribes & Alliances</h1>

          {loading ? (
            <section>
              <p>Loading tribes...</p>
            </section>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-bold mb-2">All Tribes</h2>
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr>
                      <th className="border border-border p-2 text-left bg-secondary">Name</th>
                      <th className="border border-border p-2 text-left bg-secondary">Tag</th>
                      <th className="border border-border p-2 text-right bg-secondary">Members</th>
                      <th className="border border-border p-2 text-right bg-secondary">Points</th>
                      <th className="border border-border p-2 text-left bg-secondary">Leader</th>
                      <th className="border border-border p-2 text-left bg-secondary">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tribes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="border border-border p-4 text-center text-muted-foreground">
                          No tribes found
                        </td>
                      </tr>
                    ) : (
                      tribes.map((tribe) => (
                        <tr
                          key={tribe.id}
                          className={selectedTribe?.id === tribe.id ? "bg-primary/10" : ""}
                        >
                          <td className="border border-border p-2 font-bold">{tribe.name}</td>
                          <td className="border border-border p-2 font-mono text-sm">{tribe.tag}</td>
                          <td className="border border-border p-2 text-right">{tribe.memberCount}</td>
                          <td className="border border-border p-2 text-right font-mono">
                            {tribe.totalPoints.toLocaleString()}
                          </td>
                          <td className="border border-border p-2">{tribe.leader.playerName}</td>
                          <td className="border border-border p-2">
                            <button
                              onClick={() =>
                                setSelectedTribe(selectedTribe?.id === tribe.id ? null : tribe)
                              }
                              className="px-2 py-1 border border-border rounded hover:bg-secondary"
                            >
                              {selectedTribe?.id === tribe.id ? "Hide" : "Select"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>

              {selectedTribe && (
                <section>
                  <h2 className="text-lg font-bold mb-2">Tribe Details: {selectedTribe.name}</h2>
                  <table className="w-full border-collapse border border-border">
                    <tbody>
                      <tr>
                        <th className="border border-border p-2 text-left bg-secondary">Name</th>
                        <td className="border border-border p-2">{selectedTribe.name}</td>
                      </tr>
                      <tr>
                        <th className="border border-border p-2 text-left bg-secondary">Tag</th>
                        <td className="border border-border p-2 font-mono">{selectedTribe.tag}</td>
                      </tr>
                      <tr>
                        <th className="border border-border p-2 text-left bg-secondary">Members</th>
                        <td className="border border-border p-2">{selectedTribe.memberCount}</td>
                      </tr>
                      <tr>
                        <th className="border border-border p-2 text-left bg-secondary">Points</th>
                        <td className="border border-border p-2 font-mono">
                          {selectedTribe.totalPoints.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-border p-2 text-left bg-secondary">Leader</th>
                        <td className="border border-border p-2">{selectedTribe.leader.playerName}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-2">
                    <Button className="w-full">Request to Join</Button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
