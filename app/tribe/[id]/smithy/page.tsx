"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

type MemberRow = { playerId: string; playerName: string; unitTech: Record<string, { attack: number; defense: number }> }
type AverageRow = { unitTypeId: string; avgAttack: number; avgDefense: number; samples: number }

export default function TribeSmithyPage() {
  const params = useParams()
  const search = useSearchParams()
  const tribeId = params.id as string
  const requesterId = search.get("requesterId") || ""
  const [members, setMembers] = useState<MemberRow[]>([])
  const [averages, setAverages] = useState<AverageRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const unitOrder = useMemo(() => {
    const ids = new Set<string>()
    members.forEach((m) => Object.keys(m.unitTech).forEach((u) => ids.add(u)))
    averages.forEach((a) => ids.add(a.unitTypeId))
    return Array.from(ids).sort()
  }, [members, averages])

  const load = async () => {
    if (!requesterId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tribes/${tribeId}/smithy?requesterId=${requesterId}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data?.error || "Failed to load tribe smithy data")
      setMembers(data.data.members)
      setAverages(data.data.averages)
      setError(null)
    } catch (e: any) {
      setError(e.message)
      setMembers([])
      setAverages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tribeId, requesterId])

  if (!requesterId) {
    return (
      <div className="p-6 text-amber-100">
        <h1 className="mb-2 text-xl font-semibold">Tribe Smithy Tracking</h1>
        <p className="text-sm opacity-80">Provide a requesterId (officer) to view member upgrades.</p>
      </div>
    )
  }

  return (
    <div className="p-6 text-amber-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tribe Smithy Tracking</h1>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>
      {error && <div className="mb-3 text-sm text-red-300">{error}</div>}

      {members.length === 0 ? (
        <div className="text-sm opacity-80">No data available.</div>
      ) : (
        <div className="overflow-auto rounded-md border border-amber-700/40">
          <table className="min-w-full text-sm">
            <thead className="bg-amber-950/50">
              <tr>
                <th className="px-2 py-2 text-left">Member</th>
                {unitOrder.map((u) => (
                  <th key={u} className="px-2 py-2 text-left whitespace-nowrap font-normal text-amber-200/90">{u}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.playerId} className="border-t border-amber-700/30">
                  <td className="px-2 py-1 whitespace-nowrap font-medium">{m.playerName}</td>
                  {unitOrder.map((u) => {
                    const t = m.unitTech[u]
                    const a = t?.attack ?? 0
                    const d = t?.defense ?? 0
                    const total = a + d
                    const intensity = Math.min(1, total / 40) // max around 20+20
                    const bg = `rgba(34,197,94,${0.1 + intensity * 0.35})` // emerald tint
                    return (
                      <td key={`${m.playerId}-${u}`} className="px-2 py-1 text-center" style={{ backgroundColor: bg }}>
                        <span className="font-mono text-xs">{a}/{d}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="border-t border-amber-700/40 bg-amber-900/30">
                <td className="px-2 py-1 font-semibold">Avg</td>
                {unitOrder.map((u) => {
                  const avg = averages.find((x) => x.unitTypeId === u)
                  const a = Math.round((avg?.avgAttack ?? 0) * 10) / 10
                  const d = Math.round((avg?.avgDefense ?? 0) * 10) / 10
                  const total = (avg?.avgAttack ?? 0) + (avg?.avgDefense ?? 0)
                  const intensity = Math.min(1, total / 40)
                  const bg = `rgba(234,179,8,${0.08 + intensity * 0.25})` // amber tint
                  return (
                    <td key={`avg-${u}`} className="px-2 py-1 text-center" style={{ backgroundColor: bg }}>
                      <span className="font-mono text-xs">{a}/{d}</span>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

