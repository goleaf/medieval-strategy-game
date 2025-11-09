"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { TechTree, type TechNode } from "@/components/game/tech-tree"
import { Button } from "@/components/ui/button"

export default function AcademyPage() {
  const params = useParams()
  const search = useSearchParams()
  const villageId = params.id as string
  const playerId = search.get("playerId") || ""
  const [nodes, setNodes] = useState<TechNode[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!playerId) return
    try {
      setError(null)
      const res = await fetch(`/api/villages/${villageId}/tech-tree?playerId=${playerId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load tech tree")
      setNodes(data.data)
    } catch (e: any) {
      setError(e.message)
    }
  }, [playerId, villageId])

  useEffect(() => {
    load()
  }, [load])

  const start = useCallback(
    async (key: string) => {
      if (!playerId) return
      try {
        setBusy(key)
        setError(null)
        const res = await fetch(`/api/villages/${villageId}/tech-tree`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, techKey: key }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to start research")
        await load()
      } catch (e: any) {
        setError(e.message)
      } finally {
        setBusy(null)
      }
    },
    [playerId, villageId, load],
  )

  if (!playerId) {
    return (
      <div className="p-6 text-amber-100">
        <h1 className="mb-2 text-xl font-semibold">Academy</h1>
        <p className="text-sm opacity-80">Provide a playerId parameter to view the tech tree.</p>
      </div>
    )
  }

  return (
    <div className="p-6 text-amber-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Academy Technology Tree</h1>
        <Button size="sm" variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>
      {error && <div className="mb-3 text-sm text-red-300">{error}</div>}
      {!nodes ? (
        <div className="text-sm opacity-80">Loading…</div>
      ) : (
        <TechTree nodes={nodes} onStart={start} busyKey={busy} />
      )}
    </div>
  )
}

