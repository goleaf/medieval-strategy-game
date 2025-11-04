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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    tag: "",
    description: "",
    joinPolicy: "INVITE_ONLY" as "INVITE_ONLY" | "OPEN" | "APPLICATION",
  })
  const [creating, setCreating] = useState(false)

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

  const createTribe = async () => {
    if (!createForm.name.trim() || !createForm.tag.trim()) {
      alert("Name and tag are required")
      return
    }

    try {
      setCreating(true)
      const authToken = localStorage.getItem("authToken")
      const playerId = localStorage.getItem("playerId")

      if (!authToken || !playerId) {
        alert("Please log in to create a tribe")
        return
      }

      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: "create",
          leaderId: playerId,
          name: createForm.name.trim(),
          tag: createForm.tag.trim().toUpperCase(),
          description: createForm.description.trim() || null,
          joinPolicy: createForm.joinPolicy,
        }),
      })

      const result = await res.json()

      if (result.success) {
        setShowCreateForm(false)
        setCreateForm({
          name: "",
          tag: "",
          description: "",
          joinPolicy: "INVITE_ONLY",
        })
        await fetchTribes() // Refresh the tribes list
        alert("Tribe created successfully!")
      } else {
        alert(result.error || "Failed to create tribe")
      }
    } catch (error) {
      console.error("Failed to create tribe:", error)
      alert("Failed to create tribe")
    } finally {
      setCreating(false)
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
          <Button variant="outline" size="sm" onClick={() => setShowCreateForm(true)}>
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

      {/* Create Tribe Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-lg font-bold mb-4">Create New Tribe</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tribe Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tribe name"
                  maxLength={50}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tag (1-4 characters)</label>
                <input
                  type="text"
                  value={createForm.tag}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, tag: e.target.value.toUpperCase() }))}
                  placeholder="TAG"
                  maxLength={4}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your tribe..."
                  maxLength={500}
                  rows={3}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Join Policy</label>
                <select
                  value={createForm.joinPolicy}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, joinPolicy: e.target.value as any }))}
                  className="w-full p-2 border border-border rounded bg-background"
                >
                  <option value="INVITE_ONLY">Invite Only</option>
                  <option value="OPEN">Open</option>
                  <option value="APPLICATION">Application</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={createTribe} disabled={creating}>
                  {creating ? "Creating..." : "Create Tribe"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
