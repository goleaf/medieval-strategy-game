"use client"

import { useCallback, useEffect, useState } from "react"
import { WorldMapView, type PlayerVillageMeta } from "@/components/game/world-map/world-map-view"
import { useAuth } from "@/hooks/use-auth"
import type { PlayerMapContext } from "@/hooks/use-world-map-filters"

export default function WorldMapPage() {
  const { auth, initialized } = useAuth({ redirectOnMissing: true, redirectTo: "/login" })
  const [playerVillages, setPlayerVillages] = useState<PlayerVillageMeta[]>([])
  const [playerContext, setPlayerContext] = useState<PlayerMapContext>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadVillages = useCallback(async () => {
    if (!auth?.playerId) return
    const res = await fetch(`/api/villages?playerId=${auth.playerId}`, {
      headers: {
        Authorization: auth.token ? `Bearer ${auth.token}` : "",
      },
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load villages")
    }
    const villages: PlayerVillageMeta[] = (json.data || []).map((village: any) => ({
      id: village.id,
      name: village.name,
      x: village.x,
      y: village.y,
      population: village.population,
    }))
    setPlayerVillages(villages)
  }, [auth])

  const loadPlayerContext = useCallback(async () => {
    if (!auth?.token) return
    const res = await fetch("/api/auth/player-data", {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load player context")
    }
    const tribeId = json.data?.player?.gameTribe?.id ?? null
    setPlayerContext({
      playerId: auth.playerId,
      tribeId,
    })
  }, [auth])

  useEffect(() => {
    if (!auth?.token || !auth.playerId) return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        await Promise.all([loadVillages(), loadPlayerContext()])
        if (!cancelled) {
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load map data")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [auth, loadPlayerContext, loadVillages])

  if (!initialized) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (!auth) {
    return <div className="flex min-h-screen items-center justify-center">Redirecting...</div>
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading world map…</div>
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-destructive">
        Failed to load map data: {error}
      </div>
    )
  }

  if (!auth.token) {
    return <div className="flex min-h-screen items-center justify-center">Missing auth token</div>
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4">
      <WorldMapView authToken={auth.token} playerVillages={playerVillages} playerContext={playerContext} />
    </main>
  )
}
