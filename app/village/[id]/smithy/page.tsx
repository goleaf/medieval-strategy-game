"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { SmithyUpgrades, type SmithyUnitStatus } from "@/components/game/smithy-upgrades"
import { Button } from "@/components/ui/button"

type GridResponse = {
  smithyLevel: number
  speed: number
  units: SmithyUnitStatus[]
  activeJob?: { id: string; unitTypeId: string; kind: "ATTACK" | "DEFENSE"; startedAt: string; completionAt: string }
  recommendations?: Array<{ unitTypeId: string; kind: "ATTACK" | "DEFENSE"; score: number; reason: string }>
}

export default function SmithyPage() {
  const params = useParams()
  const search = useSearchParams()
  const villageId = params.id as string
  const playerId = search.get("playerId") || ""
  const [grid, setGrid] = useState<GridResponse | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<"offense" | "defense" | "balanced">("balanced")

  const load = useCallback(async () => {
    if (!playerId) return
    try {
      setError(null)
      const res = await fetch(`/api/villages/${villageId}/smithy?playerId=${playerId}&preset=${preset}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load smithy data")
      setGrid(data.data)
    } catch (e: any) {
      setError(e.message)
    }
  }, [playerId, villageId, preset])

  useEffect(() => {
    load()
  }, [load])

  const start = useCallback(
    async (unitTypeId: string, kind: "ATTACK" | "DEFENSE") => {
      if (!playerId) return
      try {
        setBusy(`${unitTypeId}:${kind}`)
        setError(null)
        const res = await fetch(`/api/villages/${villageId}/smithy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, unitTypeId, kind }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to start upgrade")
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
        <h1 className="mb-2 text-xl font-semibold">Smithy</h1>
        <p className="text-sm opacity-80">Provide a playerId parameter to view smithy upgrades.</p>
      </div>
    )
  }

  return (
    <div className="p-6 text-amber-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Smithy Upgrades</h1>
        <div className="flex items-center gap-2">
          <div className="text-sm text-amber-200/80">Preset:</div>
          <Button size="sm" variant={preset === "offense" ? "default" : "outline"} onClick={() => setPreset("offense")}>Offense</Button>
          <Button size="sm" variant={preset === "balanced" ? "default" : "outline"} onClick={() => setPreset("balanced")}>Balanced</Button>
          <Button size="sm" variant={preset === "defense" ? "default" : "outline"} onClick={() => setPreset("defense")}>Defense</Button>
          <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
        </div>
      </div>
      {error && <div className="mb-3 text-sm text-red-300">{error}</div>}
      {!grid ? (
        <div className="text-sm opacity-80">Loading…</div>
      ) : (
        <SmithyUpgrades
          units={grid.units}
          onUpgrade={start}
          busyKey={busy}
          activeJob={grid.activeJob ? { ...grid.activeJob } : null}
          recommendations={grid.recommendations}
        />
      )}
    </div>
  )
}
