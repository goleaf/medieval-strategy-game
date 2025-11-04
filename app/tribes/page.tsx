"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"

interface Tribe {
  id: string
  name: string
  tag: string
  description: string | null
  totalPoints: number
  memberCount: number
  leader: { playerName: string }
}

export default function TribesPage() {
  const [tribes, setTribes] = useState<Tribe[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTribes = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tribes")
      const result = await res.json()
      if (result.success && result.data) {
        setTribes(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch tribes:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTribes()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">👥 Tribes</h1>
          <Button variant="outline" size="sm">
            Create Tribe
          </Button>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading && <div className="text-center py-8">Loading...</div>}
          {!loading && (
            <TextTable
              headers={["Rank", "Name", "Tag", "Points", "Members", "Leader", "Actions"]}
              rows={tribes.map((tribe, idx) => [
                (idx + 1).toString(),
                tribe.name,
                tribe.tag,
                tribe.totalPoints?.toLocaleString() || "0",
                tribe.memberCount?.toString() || "0",
                tribe.leader?.playerName || "-",
                <Button key={tribe.id} variant="outline" size="sm">
                  View
                </Button>,
              ])}
            />
          )}
        </div>
      </main>
    </div>
  )
}
