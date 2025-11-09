"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { MapVillageSummary } from "./use-world-map-data"

export type MapViewMode = "STANDARD" | "TRIBE" | "CONTINENT" | "PLAYER" | "BARBARIAN"

export type RelationshipFilter = "ALLY" | "ENEMY" | "NEUTRAL"

export interface DistanceFilterConfig {
  origin?: {
    x: number
    y: number
    label?: string
    villageId?: string
  }
  radius: number
}

export interface CustomFilterConfig {
  relationship?: RelationshipFilter
  tribeTag?: string
  maxDistance?: number
  origin?: { x: number; y: number; label?: string }
  targetPlayerId?: string
}

export interface MapFiltersSnapshot {
  viewMode: MapViewMode
  colorScheme: string
  playerQuery: string
  selectedContinents: string[]
  tribeHighlight: string | null
  pointRange: { min: number; max: number }
  distanceFilter: DistanceFilterConfig | null
  customFilter: CustomFilterConfig | null
}

export interface MapFilterPreset {
  id: string
  name: string
  createdAt: number
  state: MapFiltersSnapshot
}

export interface PlayerMapContext {
  playerId?: string
  tribeId?: string | null
}

export interface UseWorldMapFiltersOptions {
  initialViewMode?: MapViewMode
  initialColorScheme?: string
}

export interface UseWorldMapFiltersResult {
  viewMode: MapViewMode
  setViewMode: (mode: MapViewMode) => void
  colorScheme: string
  setColorScheme: (scheme: string) => void
  playerQuery: string
  setPlayerQuery: (value: string) => void
  selectedContinents: string[]
  toggleContinent: (blockId: string) => void
  clearContinents: () => void
  tribeHighlight: string | null
  setTribeHighlight: (value: string | null) => void
  pointRange: { min: number; max: number }
  setPointRange: (range: { min: number; max: number }) => void
  distanceFilter: DistanceFilterConfig | null
  setDistanceFilter: (filter: DistanceFilterConfig | null) => void
  customFilter: CustomFilterConfig | null
  setCustomFilter: (filter: CustomFilterConfig | null) => void
  savedPresets: MapFilterPreset[]
  savePreset: (name: string) => void
  applyPreset: (presetId: string) => void
  deletePreset: (presetId: string) => void
  activeFilters: Array<{ key: string; label: string }>
  applyFilters: (villages: MapVillageSummary[], context?: PlayerMapContext) => MapVillageSummary[]
}

const PRESET_STORAGE_KEY = "world-map-filter-presets"
const DEFAULT_POINT_RANGE = { min: 0, max: 50000 }

export function useWorldMapFilters(options: UseWorldMapFiltersOptions = {}): UseWorldMapFiltersResult {
  const [viewMode, setViewMode] = useState<MapViewMode>(options.initialViewMode ?? "STANDARD")
  const [colorScheme, setColorScheme] = useState(options.initialColorScheme ?? "CLASSIC")
  const [playerQuery, setPlayerQuery] = useState("")
  const [selectedContinents, setSelectedContinents] = useState<string[]>([])
  const [tribeHighlight, setTribeHighlight] = useState<string | null>(null)
  const [pointRange, setPointRange] = useState(() => ({ ...DEFAULT_POINT_RANGE }))
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilterConfig | null>(null)
  const [customFilter, setCustomFilter] = useState<CustomFilterConfig | null>(null)
  const [savedPresets, setSavedPresets] = useState<MapFilterPreset[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as MapFilterPreset[]
      setSavedPresets(parsed)
    } catch (error) {
      console.warn("Failed to load map filter presets", error)
    }
  }, [])

  const persistPresets = useCallback((next: MapFilterPreset[]) => {
    setSavedPresets(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next))
    }
  }, [])

  const serializeState = useCallback((): MapFiltersSnapshot => {
    return {
      viewMode,
      colorScheme,
      playerQuery,
      selectedContinents,
      tribeHighlight,
      pointRange,
      distanceFilter,
      customFilter,
    }
  }, [colorScheme, customFilter, distanceFilter, playerQuery, pointRange, selectedContinents, tribeHighlight, viewMode])

  const restoreState = useCallback((snapshot: MapFiltersSnapshot) => {
    setViewMode(snapshot.viewMode)
    setColorScheme(snapshot.colorScheme)
    setPlayerQuery(snapshot.playerQuery)
    setSelectedContinents(snapshot.selectedContinents)
    setTribeHighlight(snapshot.tribeHighlight)
    setPointRange(snapshot.pointRange)
    setDistanceFilter(snapshot.distanceFilter)
    setCustomFilter(snapshot.customFilter)
  }, [])

  const savePreset = useCallback(
    (name: string) => {
      if (!name.trim()) return
      const preset: MapFilterPreset = {
        id: (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `preset-${Date.now()}`),
        name: name.trim(),
        createdAt: Date.now(),
        state: serializeState(),
      }
      persistPresets([preset, ...savedPresets])
    },
    [persistPresets, savedPresets, serializeState],
  )

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = savedPresets.find((entry) => entry.id === presetId)
      if (!preset) return
      restoreState(preset.state)
    },
    [restoreState, savedPresets],
  )

  const deletePreset = useCallback(
    (presetId: string) => {
      persistPresets(savedPresets.filter((entry) => entry.id !== presetId))
    },
    [persistPresets, savedPresets],
  )

  const toggleContinent = useCallback(
    (blockId: string) => {
      setSelectedContinents((prev) => {
        if (prev.includes(blockId)) {
          return prev.filter((entry) => entry !== blockId)
        }
        return [...prev, blockId]
      })
    },
    [],
  )

  const clearContinents = useCallback(() => setSelectedContinents([]), [])

  const applyFilters = useCallback(
    (villages: MapVillageSummary[], context?: PlayerMapContext) => {
      return villages.filter((village) => {
        if (pointRange.min && village.population < pointRange.min) {
          return false
        }
        if (pointRange.max && village.population > pointRange.max) {
          return false
        }
        if (viewMode === "PLAYER" && playerQuery.trim()) {
          const normalized = playerQuery.trim().toLowerCase()
          if (!village.playerName.toLowerCase().includes(normalized)) {
            return false
          }
        }
        if (viewMode === "BARBARIAN" && !village.isBarbarian) {
          return false
        }
        if (distanceFilter?.origin && distanceFilter.radius > 0) {
          const dx = village.x - distanceFilter.origin.x
          const dy = village.y - distanceFilter.origin.y
          const distance = Math.hypot(dx, dy)
          if (distance > distanceFilter.radius) {
            return false
          }
        }
        if (customFilter) {
          if (customFilter.tribeTag) {
            if (!village.tribeTag || village.tribeTag.toLowerCase() !== customFilter.tribeTag.toLowerCase()) {
              return false
            }
          }
          if (customFilter.relationship && context?.tribeId) {
            if (customFilter.relationship === "ALLY" && village.tribeId !== context.tribeId) {
              return false
            }
            if (customFilter.relationship === "ENEMY" && village.tribeId === context.tribeId) {
              return false
            }
            if (customFilter.relationship === "NEUTRAL" && village.tribeId) {
              return false
            }
          }
          if (customFilter.maxDistance && customFilter.origin) {
            const dx = village.x - customFilter.origin.x
            const dy = village.y - customFilter.origin.y
            const distance = Math.hypot(dx, dy)
            if (distance > customFilter.maxDistance) {
              return false
            }
          }
          if (customFilter.targetPlayerId && village.playerId !== customFilter.targetPlayerId) {
            return false
          }
        }
        return true
      })
    },
    [customFilter, distanceFilter, playerQuery, pointRange.max, pointRange.min, viewMode],
  )

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = []
    if (viewMode === "PLAYER" && playerQuery.trim()) {
      chips.push({ key: "player", label: `Player: ${playerQuery.trim()}` })
    }
    if (viewMode === "BARBARIAN") {
      chips.push({ key: "barbarian", label: "Barbarian villages" })
    }
    if (selectedContinents.length > 0) {
      chips.push({ key: "continents", label: `Continent focus: ${selectedContinents.join(", ")}` })
    }
    if (pointRange.min > DEFAULT_POINT_RANGE.min || pointRange.max < DEFAULT_POINT_RANGE.max) {
      chips.push({ key: "points", label: `Points ${pointRange.min}–${pointRange.max}` })
    }
    if (distanceFilter?.origin) {
      chips.push({
        key: "distance",
        label: `Within ${distanceFilter.radius} of ${distanceFilter.origin.label ?? "selected village"}`,
      })
    }
    if (customFilter) {
      const parts: string[] = []
      if (customFilter.relationship) parts.push(customFilter.relationship.toLowerCase())
      if (customFilter.tribeTag) parts.push(`tribe ${customFilter.tribeTag}`)
      if (customFilter.maxDistance) parts.push(`<= ${customFilter.maxDistance} fields`)
      chips.push({ key: "custom", label: parts.length > 0 ? parts.join(" • ") : "Custom filter" })
    }
    return chips
  }, [customFilter, distanceFilter, playerQuery, pointRange.max, pointRange.min, selectedContinents, viewMode])

  return {
    viewMode,
    setViewMode,
    colorScheme,
    setColorScheme,
    playerQuery,
    setPlayerQuery,
    selectedContinents,
    toggleContinent,
    clearContinents,
    tribeHighlight,
    setTribeHighlight,
    pointRange,
    setPointRange,
    distanceFilter,
    setDistanceFilter,
    customFilter,
    setCustomFilter,
    savedPresets,
    savePreset,
    applyPreset,
    deletePreset,
    activeFilters,
    applyFilters,
  }
}
