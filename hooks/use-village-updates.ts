"use client"

import { useState, useEffect, useCallback } from "react"
import { usePolling } from "./use-polling"

interface Village {
  id: string
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  woodProduction: number
  stoneProduction: number
  ironProduction: number
  goldProduction: number
  foodProduction: number
  buildings: Array<{
    id: string
    isBuilding: boolean
    completionAt: string | null
    queuePosition: number | null
  }>
  troops: Array<{
    id: string
    quantity: number
  }>
}

export function useVillageUpdates(villageId: string | null, playerId: string) {
  const [village, setVillage] = useState<Village | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchVillage = useCallback(async () => {
    if (!villageId) return

    try {
      const res = await fetch(`/api/villages?playerId=${playerId}`)
      const data = await res.json()
      if (data.success && data.data) {
        const found = data.data.find((v: any) => v.id === villageId)
        if (found) {
          setVillage(found)
        }
      }
    } catch (error) {
      console.error("Failed to fetch village:", error)
    } finally {
      setLoading(false)
    }
  }, [villageId, playerId])

  useEffect(() => {
    fetchVillage()
  }, [fetchVillage])

  // Poll for updates every 10 seconds
  usePolling(fetchVillage, {
    enabled: !!villageId,
    interval: 10000,
  })

  return { village, loading, refetch: fetchVillage }
}
