"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export type TechNode = {
  id: string
  key: string
  name: string
  description?: string | null
  category: "UNIT" | "BUILDING" | "SYSTEM"
  costs: { wood: number; stone: number; iron: number; gold: number; food: number }
  baseTimeSeconds: number
  academyLevelRequired: number
  prerequisites: { tech: string[]; buildings: Array<{ type: string; level: number }> }
  status: "COMPLETED" | "IN_PROGRESS" | "AVAILABLE" | "LOCKED"
  lockedReasons?: string[]
  progress?: { startedAt: string; completionAt: string }
}

export function TechTree({
  nodes,
  onStart,
  busyKey,
}: {
  nodes: TechNode[]
  onStart?: (key: string) => void | Promise<void>
  busyKey?: string | null
}) {
  const sorted = useMemo(() => {
    const order = { COMPLETED: 3, IN_PROGRESS: 2, AVAILABLE: 1, LOCKED: 0 } as const
    return [...nodes].sort((a, b) => {
      const d = order[a.status] - order[b.status]
      if (d !== 0) return -d
      return a.key.localeCompare(b.key)
    })
  }, [nodes])

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {sorted.map((n) => (
        <TechCard key={n.id} node={n} onStart={onStart} busy={busyKey === n.key} />
      ))}
    </div>
  )
}

function TechCard({
  node,
  onStart,
  busy,
}: {
  node: TechNode
  onStart?: (key: string) => void | Promise<void>
  busy?: boolean
}) {
  const startedAt = node.progress ? new Date(node.progress.startedAt) : null
  const completionAt = node.progress ? new Date(node.progress.completionAt) : null
  const now = Date.now()
  const pct = useMemo(() => {
    if (!startedAt || !completionAt) return 0
    const total = completionAt.getTime() - startedAt.getTime()
    const passed = Math.min(Math.max(0, now - startedAt.getTime()), total)
    return total > 0 ? Math.round((passed / total) * 100) : 0
  }, [startedAt, completionAt, now])

  const badge = (
    status: TechNode["status"],
  ) => {
    switch (status) {
      case "COMPLETED":
        return <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-200">Completed ✓</span>
      case "IN_PROGRESS":
        return <span className="rounded bg-yellow-700 px-2 py-0.5 text-xs text-yellow-100">Researching…</span>
      case "AVAILABLE":
        return <span className="rounded bg-green-700 px-2 py-0.5 text-xs text-green-100">Available</span>
      default:
        return <span className="rounded bg-red-800 px-2 py-0.5 text-xs text-red-100">Locked</span>
    }
  }

  return (
    <div className="rounded-md border border-amber-700/40 bg-amber-950/40 p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-semibold text-amber-100">{node.name}</div>
        {badge(node.status)}
      </div>
      <div className="mb-1 text-xs text-amber-300/80">{node.description}</div>
      <div className="mb-2 text-xs text-amber-200/70">
        Cost: {node.costs.wood}W, {node.costs.stone}S, {node.costs.iron}I, {node.costs.gold}G, {node.costs.food}F •
        Academy L{node.academyLevelRequired}
      </div>
      {node.status === "LOCKED" && node.lockedReasons && (
        <ul className="mb-2 list-disc pl-4 text-xs text-red-200/80">
          {node.lockedReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {node.status === "IN_PROGRESS" && (
        <div className="space-y-1">
          <Progress value={pct} />
          <div className="text-right text-[11px] text-amber-200/70">{pct}%</div>
        </div>
      )}
      {node.status === "AVAILABLE" && onStart && (
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={busy} onClick={() => onStart(node.key)}>
            {busy ? "Starting…" : "Research"}
          </Button>
        </div>
      )}
    </div>
  )
}

