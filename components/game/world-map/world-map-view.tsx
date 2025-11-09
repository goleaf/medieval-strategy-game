"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Badge,
} from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorldMapData, type MapVillageSummary } from "@/hooks/use-world-map-data"
import {
  useWorldMapFilters,
  type PlayerMapContext,
  type MapViewMode,
  type DistanceFilterConfig,
  type CustomFilterConfig,
} from "@/hooks/use-world-map-filters"
import { useWorldMapViewport, type ZoomLevel } from "@/hooks/use-world-map-viewport"
import { cn } from "@/lib/utils"
import { Filter, Map as MapIcon, MousePointerClick, Save, X, Zap, ZoomIn, ZoomOut } from "lucide-react"
import type { Coordinate, CoordinateRange } from "@/lib/map-vision/types"

export interface PlayerVillageMeta {
  id: string
  name: string
  x: number
  y: number
  population?: number
}

export interface WorldMapViewProps {
  authToken: string
  playerVillages: PlayerVillageMeta[]
  playerContext: PlayerMapContext
}

type RenderVillage = MapVillageSummary & {
  screenX: number
  screenY: number
}

type HeatmapCell = {
  x: number
  y: number
  width: number
  height: number
  intensity: number
  color: string
}

type ColorScheme = {
  id: string
  label: string
  background: string
  tile: string
  minorGrid: string
  majorGrid: string
  label: string
  markerStroke: string
  neutralMarker: string
  highlight: string
  heatmap: string[]
}

const COLOR_SCHEMES: Record<string, ColorScheme> = {
  CLASSIC: {
    id: "CLASSIC",
    label: "Classic",
    background: "#01050f",
    tile: "#030712",
    minorGrid: "rgba(148,163,184,0.15)",
    majorGrid: "rgba(248,250,252,0.35)",
    label: "rgba(248,250,252,0.7)",
    markerStroke: "#01050f",
    neutralMarker: "#64748b",
    highlight: "#38bdf8",
    heatmap: ["rgba(56,189,248,0.2)", "rgba(8,145,178,0.3)", "rgba(59,130,246,0.3)", "rgba(147,51,234,0.35)"],
  },
  NIGHT: {
    id: "NIGHT",
    label: "Night Ops",
    background: "#020617",
    tile: "#050a1f",
    minorGrid: "rgba(59,130,246,0.15)",
    majorGrid: "rgba(14,165,233,0.4)",
    label: "rgba(125,211,252,0.9)",
    markerStroke: "#01050f",
    neutralMarker: "#475569",
    highlight: "#f97316",
    heatmap: ["rgba(251,191,36,0.2)", "rgba(249,115,22,0.25)", "rgba(244,63,94,0.3)", "rgba(233,30,99,0.35)"],
  },
  DESERT: {
    id: "DESERT",
    label: "Desert Sun",
    background: "#1f1207",
    tile: "#2a1709",
    minorGrid: "rgba(249,213,141,0.15)",
    majorGrid: "rgba(251,191,36,0.4)",
    label: "rgba(254,215,170,0.9)",
    markerStroke: "#2a1709",
    neutralMarker: "#d97706",
    highlight: "#fb923c",
    heatmap: ["rgba(251,191,36,0.25)", "rgba(245,158,11,0.3)", "rgba(234,88,12,0.35)", "rgba(194,65,12,0.35)"],
  },
  HIGH_CONTRAST: {
    id: "HIGH_CONTRAST",
    label: "High Contrast",
    background: "#000000",
    tile: "#050505",
    minorGrid: "rgba(255,255,255,0.2)",
    majorGrid: "rgba(255,255,255,0.5)",
    label: "rgba(255,255,255,0.95)",
    markerStroke: "#000",
    neutralMarker: "#a3a3a3",
    highlight: "#f87171",
    heatmap: ["rgba(248,113,113,0.2)", "rgba(248,113,113,0.3)", "rgba(234,88,12,0.3)", "rgba(252,211,77,0.35)"],
  },
}

const MAP_ZOOM_LEVELS: ZoomLevel[] = [
  { id: "WORLD", label: "World", tileSize: 2, heatmap: true },
  { id: "PROVINCE", label: "Province", tileSize: 6, heatmap: true },
  { id: "REGION", label: "Region", tileSize: 14 },
  { id: "TACTICAL", label: "Tactical", tileSize: 24 },
]

const HEATMAP_CELL_SIZE = 20

export function WorldMapView({ authToken, playerVillages, playerContext }: WorldMapViewProps) {
  const [presetName, setPresetName] = useState("")
  const [selectedVillage, setSelectedVillage] = useState<MapVillageSummary | null>(null)
  const [hoverVillage, setHoverVillage] = useState<RenderVillage | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [cursorCoordinate, setCursorCoordinate] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [distanceDraft, setDistanceDraft] = useState<{ villageId: string; radius: number }>({ villageId: "", radius: 20 })
  const [customDraft, setCustomDraft] = useState<{ relationship: CustomFilterConfig["relationship"]; tribeTag: string; maxDistance: number; origin: string }>({
    relationship: undefined,
    tribeTag: "",
    maxDistance: 20,
    origin: "",
  })

  const mapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isPanningRef = useRef(false)
  const lastPanPoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const {
    extent,
    ensureRange,
    getVillagesWithinRange,
    isLoading,
    loadingBlocks,
    refreshBlocks,
  } = useWorldMapData({ token: authToken })

  const filters = useWorldMapFilters()
  const viewport = useWorldMapViewport({
    extent,
    zoomLevels: MAP_ZOOM_LEVELS,
    prefetchPaddingTiles: 30,
  })

  const colorScheme = COLOR_SCHEMES[filters.colorScheme] ?? COLOR_SCHEMES.CLASSIC
  const continentSignature = filters.selectedContinents.join("|")

  useEffect(() => {
    ensureRange(viewport.paddedRange)
  }, [ensureRange, viewport.paddedRange])

  useEffect(() => {
    if (!mapRef.current) return
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      viewport.setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(mapRef.current)
    return () => observer.disconnect()
  }, [viewport])

  const visibleVillages = useMemo(
    () => getVillagesWithinRange(viewport.paddedRange),
    [getVillagesWithinRange, viewport.paddedRange],
  )

  const filteredVillages = useMemo(
    () => filters.applyFilters(visibleVillages, playerContext),
    [filters, playerContext, visibleVillages],
  )

  const renderVillages = useMemo<RenderVillage[]>(() => {
    return filteredVillages
      .map((village) => {
        const screen = viewport.coordinateToScreen({ x: village.x, y: village.y })
        return { ...village, screenX: screen.x, screenY: screen.y }
      })
      .filter(
        (village) =>
          village.screenX >= -24 &&
          village.screenX <= viewport.viewportSize.width + 24 &&
          village.screenY >= -24 &&
          village.screenY <= viewport.viewportSize.height + 24,
      )
  }, [filteredVillages, viewport])

  const heatmapCells = useMemo<HeatmapCell[]>(() => {
    if (!viewport.zoomLevel.heatmap) return []
    return buildHeatmapCells(visibleVillages, colorScheme)
  }, [colorScheme, visibleVillages, viewport.zoomLevel])

  useEffect(() => {
    drawMapCanvas({
      canvas: canvasRef.current,
      extent,
      center: viewport.center,
      viewportSize: viewport.viewportSize,
      tileSize: viewport.tileSize,
      colorScheme,
      heatmapCells,
      zoomLevel: viewport.zoomLevel,
    })
  }, [colorScheme, extent, heatmapCells, viewport.center, viewport.tileSize, viewport.viewportSize, viewport.zoomLevel])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = true
    lastPanPoint.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = mapRef.current?.getBoundingClientRect()
    if (!bounds) return
    const local = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
    setHoverPosition(local)
    const coord = viewport.screenToCoordinate(local)
    setCursorCoordinate({ x: Math.round(coord.x), y: Math.round(coord.y) })
    if (isPanningRef.current) {
      const dx = event.clientX - lastPanPoint.current.x
      const dy = event.clientY - lastPanPoint.current.y
      viewport.panByPixels(dx, dy)
      lastPanPoint.current = { x: event.clientX, y: event.clientY }
      setHoverVillage(null)
      return
    }
    const hovered = findVillageAtPointer(local, renderVillages, viewport.tileSize)
    setHoverVillage(hovered)
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const bounds = mapRef.current?.getBoundingClientRect()
    const anchor = bounds
      ? {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        }
      : undefined
    const direction: 1 | -1 = event.deltaY < 0 ? 1 : -1
    viewport.stepZoom(direction, anchor)
  }

  const handleMarkerClick = (village: MapVillageSummary) => {
    setSelectedVillage(village)
  }

  const villageColors = useMemo(() => {
    return renderVillages.reduce<Record<string, string>>((acc, village) => {
      acc[village.id] = getVillageColor(
        village,
        filters.viewMode,
        filters.playerQuery,
        filters.tribeHighlight,
        filters.selectedContinents,
        colorScheme,
      )
      return acc
    }, {})
  }, [colorScheme, continentSignature, filters.playerQuery, filters.tribeHighlight, filters.viewMode, renderVillages])

  const handleMiniMapJump = (coord: Coordinate) => {
    viewport.setCenter(coord)
  }

  const handleSavePreset = () => {
    filters.savePreset(presetName)
    setPresetName("")
  }

  const applyDistanceFilter = () => {
    const selected = playerVillages.find((village) => village.id === distanceDraft.villageId)
    if (!selected) {
      filters.setDistanceFilter(null)
      return
    }
    const filter: DistanceFilterConfig = {
      origin: {
        x: selected.x,
        y: selected.y,
        label: selected.name,
        villageId: selected.id,
      },
      radius: distanceDraft.radius,
    }
    filters.setDistanceFilter(filter)
  }

  const clearDistanceFilter = () => {
    filters.setDistanceFilter(null)
    setDistanceDraft({ villageId: "", radius: 20 })
  }

  const applyCustomFilter = () => {
    const origin = parseCoordinateInput(customDraft.origin)
    const filter: CustomFilterConfig = {
      relationship: customDraft.relationship,
      tribeTag: customDraft.tribeTag || undefined,
      maxDistance: customDraft.maxDistance || undefined,
      origin: origin ? { x: origin.x, y: origin.y, label: customDraft.origin } : undefined,
    }
    filters.setCustomFilter(filter)
  }

  const clearCustomFilter = () => {
    filters.setCustomFilter(null)
    setCustomDraft({ relationship: undefined, tribeTag: "", maxDistance: 20, origin: "" })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Interactive World Map</p>
            <p className="text-xs text-muted-foreground">
              Tile-based rendering with viewport culling, cached blocks, and live overlays.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshBlocks()} disabled={isLoading}>
            <Zap className="mr-2 h-4 w-4" />
            Refresh Cache
          </Button>
          <Badge variant="secondary">
            Zoom: {viewport.zoomLevel.label} ({Math.round(viewport.tileSize)}px/tile)
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="relative overflow-hidden border-muted bg-transparent">
          <CardContent className="p-0">
            <div
              ref={mapRef}
              className="relative h-[70vh] min-h-[520px] cursor-grab select-none overflow-hidden rounded-xl border border-muted bg-black"
              style={{ background: colorScheme.background }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                isPanningRef.current = false
                setHoverVillage(null)
              }}
              onPointerMove={handlePointerMove}
              onWheel={handleWheel}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0"
                width={viewport.viewportSize.width}
                height={viewport.viewportSize.height}
              />

              <div className="absolute top-4 left-4 flex flex-col gap-2 rounded-lg bg-background/80 p-3 shadow-lg backdrop-blur">
                <div className="flex gap-2">
                  <Select value={filters.viewMode} onValueChange={(value) => filters.setViewMode(value as MapViewMode)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="View mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="TRIBE">Tribe overlay</SelectItem>
                      <SelectItem value="CONTINENT">Continent view</SelectItem>
                      <SelectItem value="PLAYER">Player view</SelectItem>
                      <SelectItem value="BARBARIAN">Barbarian view</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.colorScheme} onValueChange={(value) => filters.setColorScheme(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Color scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(COLOR_SCHEMES).map((scheme) => (
                        <SelectItem value={scheme.id} key={scheme.id}>
                          {scheme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filters.activeFilters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filters.activeFilters.map((chip) => (
                      <Badge key={chip.key} variant="secondary" className="bg-secondary/60">
                        {chip.label}
                      </Badge>
                    ))}
                  </div>
                )}
                {isLoading && (
                  <div className="text-xs text-muted-foreground">
                    Loading blocks {loadingBlocks.join(", ") || "…"}...
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 right-4 flex flex-col gap-2 rounded-lg bg-background/80 p-3 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <Button variant="outline" size="icon" onClick={() => viewport.stepZoom(-1)}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => viewport.stepZoom(1)}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary">({cursorCoordinate.x}|{cursorCoordinate.y})</Badge>
                </div>
                <MiniMap
                  extent={extent}
                  villages={visibleVillages}
                  visibleRange={viewport.visibleRange}
                  colorScheme={colorScheme}
                  onJump={handleMiniMapJump}
                  focusContinents={filters.selectedContinents}
                  tribeHighlight={filters.tribeHighlight}
                />
              </div>

              <div className="absolute inset-0">
                {renderVillages.map((village) => {
                  const color = villageColors[village.id]
                  return (
                    <button
                      key={village.id}
                      type="button"
                      className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform",
                        selectedVillage?.id === village.id ? "h-4 w-4 border-white" : "h-3 w-3 border-black/60",
                      )}
                      style={{ left: village.screenX, top: village.screenY, backgroundColor: color }}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleMarkerClick(village)
                      }}
                    />
                  )
                })}
              </div>

              {hoverVillage && (
                <div
                  className="pointer-events-none absolute rounded-md border border-border bg-background/95 p-3 text-xs shadow-xl"
                  style={{
                    left: Math.min(Math.max(hoverPosition.x + 16, 8), viewport.viewportSize.width - 200),
                    top: Math.min(Math.max(hoverPosition.y + 16, 8), viewport.viewportSize.height - 120),
                  }}
                >
                  <p className="font-semibold">{hoverVillage.name}</p>
                  <p className="text-muted-foreground">{hoverVillage.playerName}</p>
                  <p className="text-muted-foreground">
                    {hoverVillage.population} pts • {hoverVillage.tribeTag ?? "No tribe"}
                  </p>
                  <p className="text-muted-foreground">
                    ({hoverVillage.x}|{hoverVillage.y}) • K{hoverVillage.blockId.slice(1)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Map Layers & Filters</CardTitle>
              <CardDescription>Fine-tune viewport overlays, filters, and presets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filters.viewMode === "TRIBE" && (
                <div className="space-y-1">
                  <Label>Highlight tribe tag</Label>
                  <Input
                    value={filters.tribeHighlight ?? ""}
                    placeholder="Enter tribe tag (e.g. KOR)"
                    onChange={(event) => filters.setTribeHighlight(event.target.value || null)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Point range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.pointRange.min}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      filters.setPointRange({ ...filters.pointRange, min: Number.isNaN(value) ? 0 : value })
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.pointRange.max}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      filters.setPointRange({ ...filters.pointRange, max: Number.isNaN(value) ? filters.pointRange.max : value })
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Continent focus (K00-K99)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add continent"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        const value = (event.currentTarget as HTMLInputElement).value.toUpperCase()
                        if (value.startsWith("K") && value.length >= 3) {
                          filters.toggleContinent(value)
                          ;(event.currentTarget as HTMLInputElement).value = ""
                        }
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => filters.clearContinents()}>
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {filters.selectedContinents.map((continent) => (
                    <Badge
                      key={continent}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => filters.toggleContinent(continent)}
                    >
                      {continent} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Player focus</Label>
                <Input
                  value={filters.playerQuery}
                  placeholder="Player name"
                  onChange={(event) => filters.setPlayerQuery(event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Distance filter</Label>
                  <Button variant="ghost" size="sm" onClick={clearDistanceFilter}>
                    Clear
                  </Button>
                </div>
                <Select value={distanceDraft.villageId} onValueChange={(value) => setDistanceDraft((prev) => ({ ...prev, villageId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin village" />
                  </SelectTrigger>
                  <SelectContent>
                    {playerVillages.map((village) => (
                      <SelectItem key={village.id} value={village.id}>
                        {village.name} ({village.x}|{village.y})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={5}
                    value={distanceDraft.radius}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setDistanceDraft((prev) => ({ ...prev, radius: Number.isNaN(value) ? prev.radius : value }))
                    }}
                  />
                  <Button variant="outline" onClick={applyDistanceFilter}>
                    Apply
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  Custom filter builder
                </div>
                <Select
                  value={customDraft.relationship ?? ""}
                  onValueChange={(value) =>
                    setCustomDraft((prev) => ({ ...prev, relationship: value ? (value as CustomFilterConfig["relationship"]) : undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any relationship</SelectItem>
                    <SelectItem value="ALLY">Allies</SelectItem>
                    <SelectItem value="ENEMY">Enemies</SelectItem>
                    <SelectItem value="NEUTRAL">Neutral</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Tribe tag (optional)"
                  value={customDraft.tribeTag}
                  onChange={(event) => setCustomDraft((prev) => ({ ...prev, tribeTag: event.target.value }))}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Max distance"
                    type="number"
                    value={customDraft.maxDistance}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setCustomDraft((prev) => ({ ...prev, maxDistance: Number.isNaN(value) ? prev.maxDistance : value }))
                    }}
                  />
                  <Input
                    placeholder="Origin (e.g. 500|500)"
                    value={customDraft.origin}
                    onChange={(event) => setCustomDraft((prev) => ({ ...prev, origin: event.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={applyCustomFilter}>
                    Apply
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearCustomFilter}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filter presets</CardTitle>
              <CardDescription>Save frequently used layers and queries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                />
                <Button variant="outline" onClick={handleSavePreset}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.savedPresets.map((preset) => (
                  <span key={preset.id} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs">
                    <button type="button" onClick={() => filters.applyPreset(preset.id)} className="font-semibold">
                      {preset.name}
                    </button>
                    <button type="button" onClick={() => filters.deletePreset(preset.id)}>
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedVillage && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  Village details
                </CardTitle>
                <CardDescription>
                  {selectedVillage.name} • ({selectedVillage.x}|{selectedVillage.y})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  <span>{selectedVillage.playerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tribe</span>
                  <span>{selectedVillage.tribeTag ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points</span>
                  <span>{selectedVillage.population.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loyalty</span>
                  <span>{selectedVillage.loyalty ?? 100}%</span>
                </div>
                <Link href={`/village/${selectedVillage.id}`} className="block">
                  <Button variant="outline" className="w-full">
                    Open village
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

interface MiniMapProps {
  extent: CoordinateRange
  villages: MapVillageSummary[]
  visibleRange: CoordinateRange
  colorScheme: ColorScheme
  focusContinents: string[]
  tribeHighlight: string | null
  onJump: (coord: Coordinate) => void
}

function MiniMap({ extent, villages, visibleRange, colorScheme, focusContinents, tribeHighlight, onJump }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const width = 180
  const height = 180

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    ctx.scale(ratio, ratio)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = colorScheme.tile
    ctx.fillRect(0, 0, width, height)

    const scaleX = width / (extent.maxX - extent.minX)
    const scaleY = height / (extent.maxY - extent.minY)

    villages.forEach((village) => {
      const x = (village.x - extent.minX) * scaleX
      const y = (village.y - extent.minY) * scaleY
      const inFocus =
        focusContinents.length === 0 ||
        focusContinents.includes(village.blockId)
      const tribeMatch = tribeHighlight ? village.tribeTag?.toLowerCase() === tribeHighlight.toLowerCase() : false
      ctx.fillStyle = tribeMatch ? colorScheme.highlight : inFocus ? colorScheme.minorGrid : colorScheme.neutralMarker
      ctx.fillRect(x, y, 2, 2)
    })

    const rect = {
      x: (visibleRange.minX - extent.minX) * scaleX,
      y: (visibleRange.minY - extent.minY) * scaleY,
      width: (visibleRange.maxX - visibleRange.minX) * scaleX,
      height: (visibleRange.maxY - visibleRange.minY) * scaleY,
    }
    ctx.strokeStyle = colorScheme.highlight
    ctx.lineWidth = 2
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  }, [colorScheme, extent, focusContinents, tribeHighlight, visibleRange, villages])

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const xRatio = (event.clientX - bounds.left) / bounds.width
    const yRatio = (event.clientY - bounds.top) / bounds.height
    const coord = {
      x: Math.round(extent.minX + xRatio * (extent.maxX - extent.minX)),
      y: Math.round(extent.minY + yRatio * (extent.maxY - extent.minY)),
    }
    onJump(coord)
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="h-[180px] w-[180px] cursor-pointer rounded-md border border-muted"
      onClick={handleClick}
    />
  )
}

interface DrawMapCanvasArgs {
  canvas: HTMLCanvasElement | null
  extent: CoordinateRange
  center: Coordinate
  viewportSize: { width: number; height: number }
  tileSize: number
  colorScheme: ColorScheme
  heatmapCells: HeatmapCell[]
  zoomLevel: ZoomLevel
}

function drawMapCanvas({ canvas, extent, center, viewportSize, tileSize, colorScheme, heatmapCells, zoomLevel }: DrawMapCanvasArgs) {
  if (!canvas) return
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const ratio = window.devicePixelRatio || 1
  canvas.width = viewportSize.width * ratio
  canvas.height = viewportSize.height * ratio
  ctx.resetTransform()
  ctx.scale(ratio, ratio)
  ctx.clearRect(0, 0, viewportSize.width, viewportSize.height)
  ctx.fillStyle = colorScheme.tile
  ctx.fillRect(0, 0, viewportSize.width, viewportSize.height)

  heatmapCells.forEach((cell) => {
    ctx.globalAlpha = cell.intensity
    ctx.fillStyle = cell.color
    const topLeft = coordinateToScreen(cell.x, cell.y, center, viewportSize, tileSize)
    const bottomRight = coordinateToScreen(cell.x + cell.width, cell.y + cell.height, center, viewportSize, tileSize)
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
  })
  ctx.globalAlpha = 1

  const startX = Math.floor(center.x - viewportSize.width / (2 * tileSize)) - 1
  const endX = Math.ceil(center.x + viewportSize.width / (2 * tileSize)) + 1
  const startY = Math.floor(center.y - viewportSize.height / (2 * tileSize)) - 1
  const endY = Math.ceil(center.y + viewportSize.height / (2 * tileSize)) + 1

  for (let x = startX; x <= endX; x++) {
    if (x < extent.minX || x > extent.maxX) continue
    const screen = coordinateToScreen(x, center.y, center, viewportSize, tileSize)
    ctx.beginPath()
    ctx.moveTo(screen.x, 0)
    ctx.lineTo(screen.x, viewportSize.height)
    ctx.strokeStyle = x % 100 === 0 ? colorScheme.majorGrid : colorScheme.minorGrid
    ctx.lineWidth = x % 100 === 0 ? 1.1 : 0.4
    ctx.stroke()
  }

  for (let y = startY; y <= endY; y++) {
    if (y < extent.minY || y > extent.maxY) continue
    const screen = coordinateToScreen(center.x, y, center, viewportSize, tileSize)
    ctx.beginPath()
    ctx.moveTo(0, screen.y)
    ctx.lineTo(viewportSize.width, screen.y)
    ctx.strokeStyle = y % 100 === 0 ? colorScheme.majorGrid : colorScheme.minorGrid
    ctx.lineWidth = y % 100 === 0 ? 1.1 : 0.4
    ctx.stroke()
  }

  if (zoomLevel.id !== "WORLD") {
    const blockStartX = Math.floor(Math.max(extent.minX, startX) / 100)
    const blockEndX = Math.floor(Math.min(endX, extent.maxX) / 100)
    const blockStartY = Math.floor(Math.max(extent.minY, startY) / 100)
    const blockEndY = Math.floor(Math.min(endY, extent.maxY) / 100)
    ctx.fillStyle = colorScheme.label
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    for (let col = blockStartX; col <= blockEndX; col++) {
      for (let row = blockStartY; row <= blockEndY; row++) {
        const centerCoord = { x: col * 100 + 50, y: row * 100 + 50 }
        const screen = coordinateToScreen(centerCoord.x, centerCoord.y, center, viewportSize, tileSize)
        ctx.fillText(`K${col}${row}`, screen.x, screen.y)
      }
    }
  }
}

function coordinateToScreen(
  x: number,
  y: number,
  center: Coordinate,
  viewportSize: { width: number; height: number },
  tileSize: number,
) {
  return {
    x: viewportSize.width / 2 + (x - center.x) * tileSize,
    y: viewportSize.height / 2 + (y - center.y) * tileSize,
  }
}

function findVillageAtPointer(point: { x: number; y: number }, villages: RenderVillage[], tileSize: number) {
  const threshold = Math.max(8, tileSize * 0.4)
  return villages.find((village) => {
    const dx = village.screenX - point.x
    const dy = village.screenY - point.y
    return Math.hypot(dx, dy) <= threshold
  })
}

function getVillageColor(
  village: MapVillageSummary,
  viewMode: MapViewMode,
  playerQuery: string,
  tribeHighlight: string | null,
  selectedContinents: string[],
  colorScheme: ColorScheme,
) {
  if (viewMode === "BARBARIAN" && !village.isBarbarian) {
    return colorScheme.neutralMarker
  }
  if (viewMode === "PLAYER" && playerQuery.trim()) {
    const match = village.playerName.toLowerCase().includes(playerQuery.toLowerCase())
    return match ? colorScheme.highlight : colorScheme.neutralMarker
  }
  if (viewMode === "TRIBE") {
    if (tribeHighlight && village.tribeTag?.toLowerCase() !== tribeHighlight.toLowerCase()) {
      return colorScheme.neutralMarker
    }
    if (!village.tribeId) return colorScheme.neutralMarker
    return colorFromString(village.tribeId, 55)
  }
  if (viewMode === "CONTINENT") {
    const block = village.blockId.slice(1)
    const baseHue = (Number(block) * 37) % 360
    if (selectedContinents.length > 0 && !selectedContinents.includes(village.blockId)) {
      return `hsla(${baseHue}, 25%, 25%, 0.4)`
    }
    return `hsl(${baseHue}, 70%, 55%)`
  }
  return colorFromString(village.playerId, 60)
}

function colorFromString(seed: string, lightness: number) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, ${lightness}%)`
}

function buildHeatmapCells(villages: MapVillageSummary[], colorScheme: ColorScheme): HeatmapCell[] {
  const cells = new Map<string, { count: number; key: string }>()
  villages.forEach((village) => {
    const cellX = Math.floor(village.x / HEATMAP_CELL_SIZE)
    const cellY = Math.floor(village.y / HEATMAP_CELL_SIZE)
    const key = `${cellX}:${cellY}`
    if (!cells.has(key)) {
      cells.set(key, { count: 0, key })
    }
    const entry = cells.get(key)!
    entry.count += 1
  })

  const counts = Array.from(cells.values()).map((entry) => entry.count)
  const maxCount = Math.max(1, ...counts)

  return Array.from(cells.entries()).map(([key, entry]) => {
    const [cellX, cellY] = key.split(":").map(Number)
    const intensity = entry.count / maxCount
    const paletteIndex = Math.min(colorScheme.heatmap.length - 1, Math.floor(intensity * colorScheme.heatmap.length))
    return {
      x: cellX * HEATMAP_CELL_SIZE,
      y: cellY * HEATMAP_CELL_SIZE,
      width: HEATMAP_CELL_SIZE,
      height: HEATMAP_CELL_SIZE,
      intensity: 0.35 + intensity * 0.4,
      color: colorScheme.heatmap[paletteIndex],
    }
  })
}

function parseCoordinateInput(value: string): { x: number; y: number } | null {
  if (!value) return null
  const match = value.trim().match(/^(-?\d+)\|(-?\d+)$/)
  if (!match) return null
  return { x: Number(match[1]), y: Number(match[2]) }
}
