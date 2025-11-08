import { useCallback, useEffect, useMemo, useState } from "react"
import type { AttackPresetMission, AttackType, TroopType } from "@prisma/client"

export interface AttackPresetUnit {
  troopType: TroopType
  quantity: number
}

export interface AttackPresetRecord {
  id: string
  name: string
  type: AttackType
  mission: AttackPresetMission
  requiresGoldClub: boolean
  targetX: number | null
  targetY: number | null
  preferredArrival: string | null
  waveWindowMs: number | null
  units: AttackPresetUnit[]
}

interface UseAttackPresetsOptions {
  playerId?: string | null
  villageId?: string | null
  mission: AttackPresetMission
}

interface CreatePresetInput {
  name: string
  type: AttackType
  requiresGoldClub: boolean
  targetX: number | null
  targetY: number | null
  preferredArrival?: string | null
  waveWindowMs?: number | null
  units: AttackPresetUnit[]
}

export function useAttackPresets({ playerId, villageId, mission }: UseAttackPresetsOptions) {
  const [presets, setPresets] = useState<AttackPresetRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    if (!playerId) return null
    const params = new URLSearchParams({ playerId, mission })
    if (villageId) params.set("villageId", villageId)
    return params.toString()
  }, [playerId, villageId, mission])

  const fetchPresets = useCallback(async () => {
    if (!query) {
      setPresets([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/attack-presets?${query}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load presets")
      setPresets(json.data?.presets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load presets")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchPresets()
  }, [fetchPresets])

  const createPreset = useCallback(
    async (input: CreatePresetInput) => {
      if (!playerId) throw new Error("Player ID required")
      const res = await fetch("/api/attack-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          villageId,
          mission,
          ...input,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create preset")
      await fetchPresets()
      return json.data?.preset as AttackPresetRecord
    },
    [fetchPresets, mission, playerId, villageId],
  )

  const deletePreset = useCallback(
    async (presetId: string) => {
      if (!playerId) throw new Error("Player ID required")
      const params = new URLSearchParams({ playerId })
      const res = await fetch(`/api/attack-presets/${presetId}?${params.toString()}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete preset")
      setPresets((prev) => prev.filter((preset) => preset.id !== presetId))
      return json.data
    },
    [playerId],
  )

  return {
    presets,
    loading,
    error,
    refresh: fetchPresets,
    createPreset,
    deletePreset,
  }
}
