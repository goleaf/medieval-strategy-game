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

  const fetchTribes = async () => {
    try {
      const res = await fetch("/api/tribes")
      const result = await res.json()
      if (result.success && result.data) {
        setTribes(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch tribes:", error)
    }
  }

  useEffect(() => {
    fetchTribes()
    if (typeof window !== "undefined") {
      (window as any).__tribesFetchHandler = fetchTribes
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__tribesFetchHandler
      }
    }
  }, [])

  return (
    <div
      x-data={`{
        tribes: ${JSON.stringify(tribes)},
        loading: false,
        async init() {
          this.loading = true;
          if (window.__tribesFetchHandler) {
            await window.__tribesFetchHandler();
            this.tribes = ${JSON.stringify(tribes)};
          }
          this.loading = false;
        }
      }`}
      className="min-h-screen bg-background text-foreground"
    >
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
          <div x-show="loading" className="text-center py-8">Loading...</div>
          <div x-show="!loading">
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
          </div>
        </div>
      </main>
    </div>
  )
}
