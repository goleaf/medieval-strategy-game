"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import type { ApiResponse } from "@/lib/utils/api-response"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Globe,
  Map as MapIcon,
  Ruler,
  Target,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type MapScale = "REGION" | "PROVINCE" | "WORLD"

type Coordinate = { x: number; y: number }

type CoordinateRange = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type VisionTile = {
  tileId?: string
  coordinate: Coordinate
  tileType: string
  state: "UNKNOWN" | "KNOWN_STALE" | "FRESH"
  metadata?: {
    occupantType?: string
    villageId?: string | null
    villageName?: string | null
    ownerName?: string | null
    ownerId?: string | null
    allianceTag?: string | null
    tribeTag?: string | null
    tribeName?: string | null
    isCapital?: boolean
    isBarbarian?: boolean
    population?: number | null
    populationBand?: string | null
    wallLevel?: number | null
    wallBand?: string | null
    lastSeenAt?: string
    attributeStates?: Record<string, { status: string; seenAt?: string }>
  }
}

type VisionApiPayload = {
  center: Coordinate
  radius: number
  scale: MapScale
  extent: CoordinateRange
  block: string
  tiles: VisionTile[]
}

type WorldVillage = {
  id: string
  name: string
  x: number
  y: number
  population: number
  playerId: string
  playerName: string
  tribeId: string | null
  tribeTag: string | null
  tribeName: string | null
  isBarbarian: boolean
}

type WorldVillagesPayload = {
  gameWorldId: string
  extent: CoordinateRange
  villages: WorldVillage[]
}

type SelectedVillage = {
  id: string | null
  name: string | null
  coordinate: Coordinate
  ownerName: string | null
  playerId?: string | null
  tribeTag: string | null
  tribeName: string | null
  allianceTag: string | null
  population?: number | null
  populationBand?: string | null
  wallLevel?: number | null
  wallBand?: string | null
  isBarbarian: boolean
  isCapital?: boolean
  lastSeenAt?: string
  state?: string
  source: "VISION" | "WORLD"
}

type PlayerProfile = {
  id: string
  playerName: string
  gameWorldId: string | null
  tribeTag?: string | null
  tribeName?: string | null
}

const WORLD_MIN = 0
const WORLD_MAX = 999
const CONTINENT_SIZE = 100
const BARBARIAN_COLOR = "#9ca3af"
const DEFAULT_NEUTRAL_COLOR = "#3b82f6"
const WORLD_CANVAS_SIZE = 720
const MINI_MAP_SIZE = 180

const SCALE_SETTINGS: Record<
  MapScale,
  { label: string; tileSize: number; panStep: number; description: string }
> = {
  REGION: { label: "Region", tileSize: 36, panStep: 3, description: "15×15 tactical window" },
  PROVINCE: { label: "Province", tileSize: 10, panStep: 15, description: "100×100 continental slice" },
  WORLD: { label: "World", tileSize: 2, panStep: 60, description: "1000×1000 overview" },
}

const tribeColorCache = new Map<string, string>()

const formatCoordinate = (coord: Coordinate) =>
  `${coord.x.toString().padStart(3, "0")}|${coord.y.toString().padStart(3, "0")}`

const clampCoordinate = (coord: Coordinate): Coordinate => ({
  x: Math.max(WORLD_MIN, Math.min(WORLD_MAX, coord.x)),
  y: Math.max(WORLD_MIN, Math.min(WORLD_MAX, coord.y)),
})

const getContinentId = (coord: Coordinate) => {
  const col = Math.floor(coord.x / CONTINENT_SIZE)
  const row = Math.floor(coord.y / CONTINENT_SIZE)
  return `K${col}${row}`
}

const getColorForTribe = (tribeTag?: string | null) => {
  if (!tribeTag) {
    return DEFAULT_NEUTRAL_COLOR
  }
  const cached = tribeColorCache.get(tribeTag)
  if (cached) return cached
  const hash = Array.from(tribeTag).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hue = (hash * 47) % 360
  const color = `hsl(${hue} 70% 55%)`
  tribeColorCache.set(tribeTag, color)
  return color
}

const parseCoordinateInput = (value: string): Coordinate | null => {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,3})\|(\d{1,3})$/)
  if (!match) return null
  const x = Number.parseInt(match[1] ?? "", 10)
  const y = Number.parseInt(match[2] ?? "", 10)
  if (Number.isNaN(x) || Number.isNaN(y)) return null
  return clampCoordinate({ x, y })
}

const calculateDistance = (from: Coordinate, to: Coordinate) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return Math.hypot(dx, dy)
}

export function WorldMapExplorer() {
  const { auth, initialized } = useAuth({ redirectOnMissing: true, redirectTo: "/login" })
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null)
  const [gameWorldId, setGameWorldId] = useState<string | null>(null)
  const [center, setCenter] = useState<Coordinate>({ x: 500, y: 500 })
  const [scale, setScale] = useState<MapScale>("REGION")
  const [tiles, setTiles] = useState<VisionTile[]>([])
  const [viewportRange, setViewportRange] = useState<CoordinateRange | null>(null)
  const [isLoadingTiles, setIsLoadingTiles] = useState(false)
  const [tilesError, setTilesError] = useState<string | null>(null)
  const [worldVillages, setWorldVillages] = useState<WorldVillage[]>([])
  const [worldLoading, setWorldLoading] = useState(false)
  const [worldError, setWorldError] = useState<string | null>(null)
  const [selectedVillage, setSelectedVillage] = useState<SelectedVillage | null>(null)
  const [distanceInputs, setDistanceInputs] = useState<{ from: string; to: string }>({ from: "", to: "" })
  const [distanceResult, setDistanceResult] = useState<string | null>(null)
  const [distanceError, setDistanceError] = useState<string | null>(null)
  const [hasBootstrappedCenter, setHasBootstrappedCenter] = useState(false)
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)

  const authHeaders = useMemo(() => {
    if (!auth?.token) return undefined
    return { Authorization: `Bearer ${auth.token}` }
  }, [auth?.token])

  useEffect(() => {
    if (!authHeaders || !auth?.playerId) return
    let active = true
    async function loadPlayerProfile() {
      try {
        const res = await fetch("/api/auth/player-data", { headers: authHeaders })
        const json: ApiResponse<any> = await res.json()
        if (!json.success || !json.data?.player) {
          throw new Error(json.error ?? "Unable to load player data")
        }
        if (!active) return
        const player = json.data.player as { id: string; playerName: string; gameWorldId?: string | null; tribe?: { tag?: string | null; name?: string | null } }
        const worldId = player.gameWorldId ?? json.data.gameWorld?.id ?? null
        setPlayerProfile({
          id: player.id,
          playerName: player.playerName,
          gameWorldId: worldId,
          tribeTag: player.tribe?.tag ?? null,
          tribeName: player.tribe?.name ?? null,
        })
        setGameWorldId(worldId)
      } catch (error) {
        console.error("Failed to load player profile:", error)
      }
    }
    loadPlayerProfile()
    return () => {
      active = false
    }
  }, [auth?.playerId, authHeaders])

  useEffect(() => {
    if (!authHeaders || !auth?.playerId || !gameWorldId || hasBootstrappedCenter) return
    let active = true
    async function loadVillages() {
      try {
        const res = await fetch(`/api/villages?playerId=${auth.playerId}`, { headers: authHeaders })
        const json: ApiResponse<Array<{ x: number; y: number }>> = await res.json()
        if (!json.success || !Array.isArray(json.data) || json.data.length === 0) return
        if (!active) return
        const first = json.data[0]!
        const nextCenter = clampCoordinate({ x: first.x, y: first.y })
        setCenter(nextCenter)
        setDistanceInputs({ from: formatCoordinate(nextCenter), to: "" })
        setHasBootstrappedCenter(true)
      } catch (error) {
        if (!active) return
        console.error("Failed to bootstrap village center:", error)
      }
    }
    loadVillages()
    return () => {
      active = false
    }
  }, [auth?.playerId, authHeaders, gameWorldId, hasBootstrappedCenter])

  useEffect(() => {
    if (!authHeaders || !gameWorldId) return
    const controller = new AbortController()
    setWorldLoading(true)
    setWorldError(null)
    fetch(`/api/map/world?gameWorldId=${gameWorldId}`, { headers: authHeaders, signal: controller.signal })
      .then(async (res) => {
        const json: ApiResponse<WorldVillagesPayload> = await res.json()
        if (!json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load world overview")
        }
        setWorldVillages(json.data.villages)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error("World overview fetch failed:", error)
        setWorldError(error instanceof Error ? error.message : "Failed to load world overview")
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setWorldLoading(false)
        }
      })
    return () => controller.abort()
  }, [authHeaders, gameWorldId])

  useEffect(() => {
    if (!authHeaders || !gameWorldId) return
    if (scale === "WORLD") {
      setTiles([])
      setTilesError(null)
      setIsLoadingTiles(false)
      setViewportRange({
        minX: WORLD_MIN,
        maxX: WORLD_MAX,
        minY: WORLD_MIN,
        maxY: WORLD_MAX,
      })
      return
    }
    const controller = new AbortController()
    async function loadTiles() {
      setIsLoadingTiles(true)
      setTilesError(null)
      try {
        const params = new URLSearchParams({
          gameWorldId,
          center: formatCoordinate(center),
          scale,
        })
        if (auth?.playerId) {
          params.set("viewerPlayerId", auth.playerId)
        }
        const res = await fetch(`/api/map/vision?${params.toString()}`, {
          headers: authHeaders,
          signal: controller.signal,
        })
        const json: ApiResponse<VisionApiPayload> = await res.json()
        if (!json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load map tiles")
        }
        if (controller.signal.aborted) return
        setTiles(json.data.tiles)
        setViewportRange({
          minX: Math.max(WORLD_MIN, json.data.center.x - json.data.radius),
          maxX: Math.min(WORLD_MAX, json.data.center.x + json.data.radius),
          minY: Math.max(WORLD_MIN, json.data.center.y - json.data.radius),
          maxY: Math.min(WORLD_MAX, json.data.center.y + json.data.radius),
        })
      } catch (error) {
        if (controller.signal.aborted) return
        console.error("Tile fetch failed:", error)
        setTilesError(error instanceof Error ? error.message : "Failed to load tiles")
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTiles(false)
        }
      }
    }
    loadTiles()
    return () => controller.abort()
  }, [auth?.playerId, authHeaders, center, gameWorldId, scale])

  const sortedTiles = useMemo(() => {
    if (!tiles.length) return []
    return [...tiles].sort((a, b) => {
      if (a.coordinate.y === b.coordinate.y) {
        return a.coordinate.x - b.coordinate.x
      }
      return a.coordinate.y - b.coordinate.y
    })
  }, [tiles])

  const columns = viewportRange ? viewportRange.maxX - viewportRange.minX + 1 : 0
  const rows = viewportRange ? viewportRange.maxY - viewportRange.minY + 1 : 0
  const tileSize = SCALE_SETTINGS[scale].tileSize

  const handlePan = useCallback(
    (dx: number, dy: number) => {
      setCenter((prev) => clampCoordinate({ x: prev.x + dx, y: prev.y + dy }))
    },
    [setCenter],
  )

  const handleScaleChange = (nextScale: MapScale) => {
    setScale(nextScale)
    if (nextScale === "WORLD") {
      setTiles([])
      setTilesError(null)
    }
  }

  const handleTileSelection = (tile: VisionTile) => {
    if (!tile.metadata?.villageId && !tile.metadata?.villageName) return
    const selection: SelectedVillage = {
      id: tile.metadata?.villageId ?? null,
      name: tile.metadata?.villageName ?? null,
      coordinate: tile.coordinate,
      ownerName: tile.metadata?.ownerName ?? null,
      playerId: tile.metadata?.ownerId ?? null,
      tribeTag: tile.metadata?.tribeTag ?? null,
      tribeName: tile.metadata?.tribeName ?? null,
      allianceTag: tile.metadata?.allianceTag ?? null,
      population: tile.metadata?.population ?? null,
      populationBand: tile.metadata?.populationBand ?? null,
      wallLevel: tile.metadata?.wallLevel ?? null,
      wallBand: tile.metadata?.wallBand ?? null,
      isBarbarian: Boolean(tile.metadata?.isBarbarian),
      isCapital: tile.metadata?.isCapital ?? false,
      lastSeenAt: tile.metadata?.lastSeenAt,
      state: tile.state,
      source: "VISION",
    }
    setSelectedVillage(selection)
    setDistanceInputs((prev) =>
      prev.from
        ? { ...prev, to: formatCoordinate(tile.coordinate) }
        : { from: formatCoordinate(tile.coordinate), to: prev.to },
    )
  }

  const handleWorldVillageSelection = (village: WorldVillage) => {
    const selection: SelectedVillage = {
      id: village.id,
      name: village.name,
      coordinate: { x: village.x, y: village.y },
      ownerName: village.playerName,
      playerId: village.playerId,
      tribeTag: village.tribeTag,
      tribeName: village.tribeName,
      allianceTag: null,
      population: village.population,
      isBarbarian: village.isBarbarian,
      populationBand: null,
      wallLevel: null,
      wallBand: null,
      isCapital: undefined,
      lastSeenAt: undefined,
      source: "WORLD",
    }
    setSelectedVillage(selection)
    setDistanceInputs((prev) =>
      prev.from
        ? { ...prev, to: formatCoordinate(selection.coordinate) }
        : { from: formatCoordinate(selection.coordinate), to: prev.to },
    )
  }

  const handleDistanceCalculate = () => {
    const from = parseCoordinateInput(distanceInputs.from)
    const to = parseCoordinateInput(distanceInputs.to)
    if (!from || !to) {
      setDistanceError("Enter coordinates as NNN|NNN (e.g., 512|487).")
      setDistanceResult(null)
      return
    }
    const distance = calculateDistance(from, to)
    setDistanceError(null)
    setDistanceResult(`${distance.toFixed(2)} tiles`)
  }

  const handleMiniMapNavigate = (coord: Coordinate) => {
    setCenter(clampCoordinate(coord))
  }

  const handleWorldRecenter = (coord: Coordinate, autoZoom = false) => {
    setCenter(clampCoordinate(coord))
    if (autoZoom) {
      setScale("PROVINCE")
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (scale === "WORLD") return
    dragOriginRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (scale === "WORLD") return
    if (!dragOriginRef.current) return
    const origin = dragOriginRef.current
    const dx = event.clientX - origin.x
    const dy = event.clientY - origin.y
    const stepX = Math.trunc(dx / tileSize)
    const stepY = Math.trunc(dy / tileSize)
    if (stepX !== 0 || stepY !== 0) {
      handlePan(-stepX, -stepY)
      dragOriginRef.current = { x: event.clientX, y: event.clientY }
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (scale === "WORLD") return
    dragOriginRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const selectedColor = selectedVillage?.isBarbarian
    ? BARBARIAN_COLOR
    : getColorForTribe(selectedVillage?.tribeTag)

  const barbarianCount = useMemo(() => worldVillages.filter((v) => v.isBarbarian).length, [worldVillages])
  const tribeCount = useMemo(() => {
    const tags = new Set(worldVillages.filter((v) => v.tribeTag).map((v) => v.tribeTag as string))
    return tags.size
  }, [worldVillages])
  const continentCount = useMemo(() => {
    const ids = new Set(worldVillages.map((v) => getContinentId({ x: v.x, y: v.y })))
    return ids.size
  }, [worldVillages])

  if (!initialized) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <LoadingSpinner />
        <span>Preparing world map…</span>
      </div>
    )
  }

  if (!auth) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 p-6 text-muted-foreground">
        Signing in…
      </div>
    )
  }

  if (!gameWorldId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>World Map Unavailable</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-muted-foreground">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <span>Join or create a world to unlock the strategic map.</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>World Map</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Coordinates span 000|000 to 999|999. Continents are 100×100 blocks labeled K00…K99 (column×row). Use the controls
            to pan, zoom, and inspect every village.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SCALE_SETTINGS) as MapScale[]).map((option) => (
                <Button
                  key={option}
                  variant={scale === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScaleChange(option)}
                  className="flex items-center gap-2"
                >
                  {option === "WORLD" ? <Globe className="h-4 w-4" /> : option === "REGION" ? <ZoomIn className="h-4 w-4" /> : <ZoomOut className="h-4 w-4" />}
                  <span>{SCALE_SETTINGS[option].label}</span>
                </Button>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Center: <span className="font-mono text-foreground">{formatCoordinate(center)}</span> · Continent{" "}
              <span className="font-semibold text-foreground">{getContinentId(center)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/60 p-3 text-sm">
            <span className="font-medium text-foreground">Pan</span>
            <div className="grid grid-cols-3 gap-1">
              <Button variant="outline" size="icon" onClick={() => handlePan(0, -SCALE_SETTINGS[scale].panStep)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handlePan(-SCALE_SETTINGS[scale].panStep, 0)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handlePan(SCALE_SETTINGS[scale].panStep, 0)}>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div />
              <Button variant="outline" size="icon" onClick={() => handlePan(0, SCALE_SETTINGS[scale].panStep)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-muted-foreground">or drag the grid</span>
          </div>

          <div className="rounded-lg border bg-slate-950/40 p-3">
            {scale === "WORLD" ? (
              <WorldOverview
                villages={worldVillages}
                selected={selectedVillage}
                loading={worldLoading}
                error={worldError}
                onSelectVillage={handleWorldVillageSelection}
                onBackgroundClick={(coord) => handleWorldRecenter(coord, true)}
              />
            ) : (
              <div
                className={cn(
                  "relative overflow-auto rounded-lg border border-border/60 bg-black/40",
                  isLoadingTiles && "opacity-70",
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => {
                  dragOriginRef.current = null
                }}
              >
                {tilesError && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-red-400">
                    {tilesError}
                  </div>
                )}
                {isLoadingTiles && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto flex w-max items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-muted-foreground">
                    <LoadingSpinner size="sm" />
                    Updating tiles…
                  </div>
                )}
                {sortedTiles.length === 0 && !isLoadingTiles ? (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    No tiles available at this zoom level.
                  </div>
                ) : (
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, ${tileSize}px)`,
                      gridTemplateRows: `repeat(${rows}, ${tileSize}px)`,
                    }}
                  >
                    {sortedTiles.map((tile) => {
                      const hasVillage = Boolean(tile.metadata?.villageId || tile.metadata?.villageName)
                      const color = tile.metadata?.isBarbarian
                        ? BARBARIAN_COLOR
                        : hasVillage
                          ? getColorForTribe(tile.metadata?.tribeTag)
                          : undefined
                      const isSelected =
                        selectedVillage &&
                        selectedVillage.coordinate.x === tile.coordinate.x &&
                        selectedVillage.coordinate.y === tile.coordinate.y
                      return (
                        <button
                          key={`${tile.coordinate.x}-${tile.coordinate.y}`}
                          type="button"
                          className={cn(
                            "relative flex items-center justify-center border border-border/30 transition-colors",
                            tile.state === "UNKNOWN" ? "bg-slate-900/70" : tile.state === "KNOWN_STALE" ? "bg-slate-800/60" : "bg-slate-900/20",
                            hasVillage ? "hover:bg-slate-900/40" : "hover:bg-slate-900/50",
                            isSelected && "ring-2 ring-offset-2 ring-offset-black ring-primary/70",
                          )}
                          style={{ width: tileSize, height: tileSize }}
                          title={
                            hasVillage
                              ? `${tile.metadata?.villageName ?? "Village"} @ ${formatCoordinate(tile.coordinate)}`
                              : `${formatCoordinate(tile.coordinate)}`
                          }
                          onClick={() => hasVillage && handleTileSelection(tile)}
                        >
                          {hasVillage && (
                            <span
                              className="h-3 w-3 rounded-full border border-black/50 shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Mini-map</CardTitle>
                <MapIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <MiniMap
                  villages={worldVillages}
                  viewport={viewportRange}
                  selected={selectedVillage}
                  onNavigate={handleMiniMapNavigate}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Click to re-center the active viewport. Rectangle shows the current zoom window.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Distance Calculator</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <label className="text-xs uppercase text-muted-foreground">From</label>
                  <Input
                    placeholder="000|000"
                    value={distanceInputs.from}
                    onChange={(event) => setDistanceInputs((prev) => ({ ...prev, from: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs uppercase text-muted-foreground">To</label>
                  <Input
                    placeholder="999|999"
                    value={distanceInputs.to}
                    onChange={(event) => setDistanceInputs((prev) => ({ ...prev, to: event.target.value }))}
                  />
                </div>
                <Button size="sm" onClick={handleDistanceCalculate} className="w-full">
                  Compute Distance
                </Button>
                {distanceError && <p className="text-xs text-destructive">{distanceError}</p>}
                {distanceResult && <p className="text-sm text-foreground">{distanceResult}</p>}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Selected Village</CardTitle>
            {selectedVillage && (
              <Badge style={{ backgroundColor: selectedColor }} className="text-xs text-black">
                {selectedVillage.isBarbarian ? "Barbarian" : selectedVillage.tribeTag ?? "Neutral"}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {selectedVillage ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    {selectedVillage.name ?? "Unknown Village"}
                    {selectedVillage.isCapital && <Badge variant="outline">Capital</Badge>}
                  </div>
                  <div className="font-mono text-lg text-foreground">{formatCoordinate(selectedVillage.coordinate)}</div>
                  <div className="text-muted-foreground">Continent {getContinentId(selectedVillage.coordinate)}</div>
                  <div>
                    Owner: <span className="text-foreground">{selectedVillage.ownerName ?? "Barbarian"}</span>
                  </div>
                  {selectedVillage.tribeTag && (
                    <div>
                      Tribe: <span className="text-foreground">{selectedVillage.tribeName ?? selectedVillage.tribeTag}</span>
                    </div>
                  )}
                  {selectedVillage.population !== undefined && selectedVillage.population !== null && (
                    <div>
                      Population: <span className="text-foreground">{selectedVillage.population.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedVillage.populationBand && (
                    <div className="text-muted-foreground">Band: {selectedVillage.populationBand}</div>
                  )}
                  {selectedVillage.lastSeenAt && (
                    <div className="text-xs text-muted-foreground">Last seen {new Date(selectedVillage.lastSeenAt).toLocaleString()}</div>
                  )}
                  {selectedVillage.state && (
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Fog state: {selectedVillage.state}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCenter(selectedVillage.coordinate)
                      setScale("REGION")
                    }}
                  >
                    Focus Region
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDistanceInputs({
                        from: formatCoordinate(selectedVillage.coordinate),
                        to: distanceInputs.to,
                      })
                    }
                  >
                    Use as “From”
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDistanceInputs({
                        from: distanceInputs.from,
                        to: formatCoordinate(selectedVillage.coordinate),
                      })
                    }
                  >
                    Use as “To”
                  </Button>
                  {selectedVillage.playerId && !selectedVillage.isBarbarian && (
                    <Button size="sm" asChild>
                      <Link href={`/players/${selectedVillage.playerId}`}>View Profile</Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a village on the map to inspect its details.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">World Summary</CardTitle>
            <Compass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
              <span className="text-muted-foreground">Villages</span>
              <span className="font-semibold">{worldVillages.length.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
              <span className="text-muted-foreground">Barbarian Villages</span>
              <span className="font-semibold">{barbarianCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
              <span className="text-muted-foreground">Active Tribes</span>
              <span className="font-semibold">{tribeCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
              <span className="text-muted-foreground">Active Continents</span>
              <span className="font-semibold">{continentCount}</span>
            </div>
            <div className="rounded-md border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
              Extent: 000|000 → 999|999
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MiniMap({
  villages,
  viewport,
  selected,
  onNavigate,
}: {
  villages: WorldVillage[]
  viewport: CoordinateRange | null
  selected: SelectedVillage | null
  onNavigate: (coord: Coordinate) => void
}) {
  const scale = MINI_MAP_SIZE / (WORLD_MAX + 1)

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const relX = ((event.clientX - rect.left) / rect.width) * WORLD_MAX
    const relY = ((event.clientY - rect.top) / rect.height) * WORLD_MAX
    onNavigate({
      x: Math.round(relX),
      y: Math.round(relY),
    })
  }

  return (
    <div
      className="relative h-[200px] w-full rounded-lg border border-border/60 bg-black/40"
      onClick={handleClick}
      role="presentation"
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${MINI_MAP_SIZE} ${MINI_MAP_SIZE}`} className="text-slate-800">
        <rect width={MINI_MAP_SIZE} height={MINI_MAP_SIZE} className="fill-slate-900/60 stroke-slate-800" />
        {[...Array(10)].map((_, index) => {
          const pos = (index + 1) * (MINI_MAP_SIZE / 10)
          return (
            <g key={`grid-${index}`} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5">
              <line x1={pos} y1={0} x2={pos} y2={MINI_MAP_SIZE} />
              <line x1={0} y1={pos} x2={MINI_MAP_SIZE} y2={pos} />
            </g>
          )
        })}
        {villages.map((village) => {
          const cx = (village.x + 0.5) * scale
          const cy = (village.y + 0.5) * scale
          const color = village.isBarbarian ? BARBARIAN_COLOR : getColorForTribe(village.tribeTag)
          const isSelected =
            selected && selected.coordinate.x === village.x && selected.coordinate.y === village.y && selected.source === "WORLD"
          return (
            <circle
              key={village.id}
              cx={cx}
              cy={cy}
              r={isSelected ? 2.5 : 1.5}
              fill={color}
              opacity={isSelected ? 1 : 0.8}
            />
          )
        })}
        {viewport && (
          <rect
            x={viewport.minX * scale}
            y={viewport.minY * scale}
            width={(viewport.maxX - viewport.minX + 1) * scale}
            height={(viewport.maxY - viewport.minY + 1) * scale}
            fill="none"
            stroke="white"
            strokeWidth="1.2"
          />
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 rounded-lg border border-border/40" />
    </div>
  )
}

function WorldOverview({
  villages,
  loading,
  error,
  selected,
  onSelectVillage,
  onBackgroundClick,
}: {
  villages: WorldVillage[]
  loading: boolean
  error: string | null
  selected: SelectedVillage | null
  onSelectVillage: (village: WorldVillage) => void
  onBackgroundClick: (coord: Coordinate) => void
}) {
  const scale = WORLD_CANVAS_SIZE / (WORLD_MAX + 1)

  const handleBackgroundClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.target instanceof SVGCircleElement) return
    const rect = event.currentTarget.getBoundingClientRect()
    const relX = ((event.clientX - rect.left) / rect.width) * WORLD_MAX
    const relY = ((event.clientY - rect.top) / rect.height) * WORLD_MAX
    onBackgroundClick({
      x: Math.round(relX),
      y: Math.round(relY),
    })
  }

  if (error) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-destructive">
        <AlertTriangle className="mr-2 h-4 w-4" />
        {error}
      </div>
    )
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <LoadingSpinner size="lg" />
        </div>
      )}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${WORLD_CANVAS_SIZE} ${WORLD_CANVAS_SIZE}`}
        className="rounded-lg border border-border/60 bg-slate-950/40"
        onClick={handleBackgroundClick}
      >
        <rect width={WORLD_CANVAS_SIZE} height={WORLD_CANVAS_SIZE} fill="rgba(15,23,42,0.6)" />
        {[...Array(10)].map((_, index) => {
          const pos = (index + 1) * (WORLD_CANVAS_SIZE / 10)
          const id = `K${index}${0}`
          return (
            <g key={`continent-${index}`} stroke="rgba(255,255,255,0.08)" strokeWidth="1">
              <line x1={pos} y1={0} x2={pos} y2={WORLD_CANVAS_SIZE} />
              <line x1={0} y1={pos} x2={WORLD_CANVAS_SIZE} y2={pos} />
              <text x={pos - 30} y={15} fill="rgba(255,255,255,0.2)" fontSize="10">
                {id}
              </text>
            </g>
          )
        })}
        {villages.map((village) => {
          const cx = (village.x + 0.5) * scale
          const cy = (village.y + 0.5) * scale
          const color = village.isBarbarian ? BARBARIAN_COLOR : getColorForTribe(village.tribeTag)
          const isSelected =
            selected &&
            selected.source === "WORLD" &&
            selected.coordinate.x === village.x &&
            selected.coordinate.y === village.y
          return (
            <circle
              key={village.id}
              cx={cx}
              cy={cy}
              r={isSelected ? 4 : 2}
              fill={color}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="0.5"
              onClick={(event) => {
                event.stopPropagation()
                onSelectVillage(village)
              }}
              style={{ cursor: "pointer" }}
            />
          )
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        Click anywhere to jump to that area (auto-switches to Province view). Click a dot to inspect a village.
      </p>
    </div>
  )
}
