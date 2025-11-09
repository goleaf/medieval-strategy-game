"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MapCoordinateService } from "@/lib/map-vision/coordinate-service"
import type { CoordinateRange } from "@/lib/map-vision/types"

export type MapVillageSummary = {
  id: string
  name: string
  x: number
  y: number
  population: number
  loyalty: number
  playerId: string
  playerName: string
  tribeId: string | null
  tribeTag: string | null
  tribeName: string | null
  isBarbarian: boolean
  blockId: string
}

export type MapBlockCacheEntry = {
  id: string
  range: CoordinateRange
  villageCount: number
  fetchedAt: number
  requested: boolean
  villages: MapVillageSummary[]
}

interface MapWorldResponse {
  gameWorldId: string
  extent: CoordinateRange
  blockSize: number
  fetchedAt: string
  villages: MapVillageSummary[]
  blocks: Array<{
    id: string
    range: CoordinateRange
    villageCount: number
    requested: boolean
  }>
}

export interface UseWorldMapDataOptions {
  token?: string | null
  chunkTtlMs?: number
}

const DEFAULT_EXTENT: CoordinateRange = { minX: 0, maxX: 999, minY: 0, maxY: 999 }
const DEFAULT_BLOCK_SIZE = 100
const DEFAULT_TTL = 2 * 60 * 1000

export function useWorldMapData(options: UseWorldMapDataOptions = {}) {
  const { token, chunkTtlMs = DEFAULT_TTL } = options
  const [extent, setExtent] = useState<CoordinateRange>(DEFAULT_EXTENT)
  const [blockSize, setBlockSize] = useState(DEFAULT_BLOCK_SIZE)
  const [gameWorldId, setGameWorldId] = useState<string | null>(null)
  const [blockCache, setBlockCache] = useState<Map<string, MapBlockCacheEntry>>(() => new Map())
  const [loadingBlocks, setLoadingBlocks] = useState<Set<string>>(new Set())
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const coordinatorRef = useRef(new MapCoordinateService())
  const pendingBlocksRef = useRef(new Set<string>())

  useEffect(() => {
    coordinatorRef.current = new MapCoordinateService({
      minX: extent.minX,
      maxX: extent.maxX,
      minY: extent.minY,
      maxY: extent.maxY,
      blockSize,
    })
  }, [extent, blockSize])

  const markLoading = useCallback((blocks: string[], loading: boolean) => {
    setLoadingBlocks((prev) => {
      const next = new Set(prev)
      blocks.forEach((blockId) => {
        if (loading) {
          next.add(blockId)
        } else {
          next.delete(blockId)
        }
      })
      return next
    })
  }, [])

  const applyResponse = useCallback(
    (payload: MapWorldResponse) => {
      setGameWorldId(payload.gameWorldId)
      setExtent(payload.extent)
      setBlockSize(payload.blockSize)
      setLastFetchedAt(payload.fetchedAt)

      const villagesByBlock = payload.villages.reduce<Map<string, MapVillageSummary[]>>((acc, village) => {
        if (!acc.has(village.blockId)) {
          acc.set(village.blockId, [])
        }
        acc.get(village.blockId)!.push(village)
        return acc
      }, new Map())

      setBlockCache((prev) => {
        const next = new Map(prev)
        payload.blocks.forEach((block) => {
          next.set(block.id, {
            id: block.id,
            range: block.range,
            villageCount: block.villageCount,
            requested: block.requested,
            fetchedAt: Date.now(),
            villages: villagesByBlock.get(block.id) ?? [],
          })
        })

        villagesByBlock.forEach((villages, blockId) => {
          if (next.has(blockId)) return
          next.set(blockId, {
            id: blockId,
            range: coordinatorRef.current.blockIdToRange(blockId),
            villageCount: villages.length,
            requested: false,
            fetchedAt: Date.now(),
            villages,
          })
        })

        return next
      })
    },
    [],
  )

  const fetchBlocks = useCallback(
    async (blockIds: string[]) => {
      if (!token || blockIds.length === 0) return
      const deduped = blockIds.filter((blockId) => {
        if (pendingBlocksRef.current.has(blockId)) {
          return false
        }
        pendingBlocksRef.current.add(blockId)
        return true
      })

      if (deduped.length === 0) {
        return
      }

      markLoading(deduped, true)
      setError(null)

      try {
        const params = new URLSearchParams()
        deduped.forEach((blockId) => params.append("block", blockId))
        const res = await fetch(`/api/map/world?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load map data")
        }
        applyResponse(json.data as MapWorldResponse)
      } catch (err) {
        console.error("Failed to fetch map blocks:", err)
        setError(err instanceof Error ? err.message : "Failed to load map data")
      } finally {
        deduped.forEach((blockId) => pendingBlocksRef.current.delete(blockId))
        markLoading(deduped, false)
      }
    },
    [applyResponse, markLoading, token],
  )

  const ensureRange = useCallback(
    (range: CoordinateRange, options?: { force?: boolean }) => {
      if (!token) {
        setError("Missing auth token")
        return
      }
      const blockIds = coordinatorRef.current.getBlocksForRange(range)
      const now = Date.now()
      const toFetch = blockIds.filter((blockId) => {
        if (options?.force) return true
        const cacheEntry = blockCache.get(blockId)
        if (!cacheEntry) return true
        return now - cacheEntry.fetchedAt > chunkTtlMs
      })
      if (toFetch.length > 0) {
        void fetchBlocks(toFetch)
      }
    },
    [blockCache, chunkTtlMs, fetchBlocks, token],
  )

  const refreshBlocks = useCallback(
    (blockIds?: string[]) => {
      const targets = blockIds && blockIds.length > 0 ? blockIds : Array.from(blockCache.keys())
      if (targets.length === 0) return
      void fetchBlocks(targets)
    },
    [blockCache, fetchBlocks],
  )

  const blocks = useMemo(() => Array.from(blockCache.values()), [blockCache])
  const villages = useMemo(() => blocks.flatMap((block) => block.villages), [blocks])

  const getVillagesWithinRange = useCallback(
    (range: CoordinateRange) => {
      return blocks.flatMap((block) => {
        const intersects =
          block.range.maxX >= range.minX &&
          block.range.minX <= range.maxX &&
          block.range.maxY >= range.minY &&
          block.range.minY <= range.maxY
        if (!intersects) return []
        return block.villages.filter(
          (village) =>
            village.x >= range.minX &&
            village.x <= range.maxX &&
            village.y >= range.minY &&
            village.y <= range.maxY,
        )
      })
    },
    [blocks],
  )

  return {
    extent,
    blockSize,
    gameWorldId,
    lastFetchedAt,
    error,
    loadingBlocks: Array.from(loadingBlocks),
    isLoading: loadingBlocks.size > 0,
    blocks,
    villages,
    ensureRange,
    refreshBlocks,
    getVillagesWithinRange,
  }
}
