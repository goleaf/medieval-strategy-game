"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface MapTile {
  x: number
  y: number
  type: "village" | "empty"
  village: {
    id: string
    name: string
    playerName: string
    isOwn: boolean
  } | null
  fogOfWar: boolean
}

interface Village {
  id: string
  name: string
  playerName: string
  x: number
  y: number
  isOwn: boolean
  population?: number
  loyalty?: number
}

export default function MapPage() {
  const [villages, setVillages] = useState<Village[]>([])
  const [continents, setContinents] = useState<any[]>([])
  const [centerX, setCenterX] = useState(100)
  const [centerY, setCenterY] = useState(100)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const svgRef = useRef<SVGSVGElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Map dimensions and view settings
  const WORLD_SIZE = 200
  const VIEW_WIDTH = 800
  const VIEW_HEIGHT = 600
  const TILE_SIZE = 20
  const VIEW_RADIUS = Math.max(VIEW_WIDTH, VIEW_HEIGHT) / 2 / TILE_SIZE / zoom

  const fetchMapData = useCallback(async (x: number, y: number, z: number) => {
    try {
      setLoading(true)
      const authToken = localStorage.getItem("authToken")
      const playerId = localStorage.getItem("playerId")

      if (!authToken || !playerId) {
        console.error("No auth token or player ID found")
        setVillages([])
        setContinents([])
        setLoading(false)
        return
      }

      // Fetch villages in view
      const viewSize = Math.ceil(VIEW_RADIUS * 2)
      const startX = Math.max(0, Math.floor(x - viewSize / 2))
      const startY = Math.max(0, Math.floor(y - viewSize / 2))
      const endX = Math.min(WORLD_SIZE, startX + viewSize)
      const endY = Math.min(WORLD_SIZE, startY + viewSize)

      const res = await fetch(
        `/api/world/map?centerX=${x}&centerY=${y}&zoom=1&playerId=${playerId}`,
        {
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        }
      )
      const data = await res.json()

      if (data.success && data.data) {
        const tiles = data.data.tiles || []

        // Convert tiles to villages format
        const visibleVillages: Village[] = tiles
          .filter((tile: MapTile) => tile.village && !tile.fogOfWar)
          .map((tile: MapTile) => ({
            id: tile.village!.id,
            name: tile.village!.name,
            playerName: tile.village!.playerName,
            x: tile.x,
            y: tile.y,
            isOwn: tile.village!.isOwn,
            population: 100, // Default, could be fetched from API
            loyalty: 100, // Default, could be fetched from API
          }))

        setVillages(visibleVillages)
      }

      // Fetch continents (simplified - in real implementation, this would come from API)
      setContinents([
        { id: 1, name: "Continent 1", x: 0, y: 0, size: 50 },
        { id: 2, name: "Continent 2", x: 50, y: 0, size: 50 },
        { id: 3, name: "Continent 3", x: 100, y: 0, size: 50 },
        { id: 4, name: "Continent 4", x: 150, y: 0, size: 50 },
        { id: 5, name: "Continent 5", x: 0, y: 50, size: 50 },
        { id: 6, name: "Continent 6", x: 50, y: 50, size: 50 },
        { id: 7, name: "Continent 7", x: 100, y: 50, size: 50 },
        { id: 8, name: "Continent 8", x: 150, y: 50, size: 50 },
        { id: 9, name: "Continent 9", x: 0, y: 100, size: 50 },
        { id: 10, name: "Continent 10", x: 50, y: 100, size: 50 },
        { id: 11, name: "Continent 11", x: 100, y: 100, size: 50 },
        { id: 12, name: "Continent 12", x: 150, y: 100, size: 50 },
        { id: 13, name: "Continent 13", x: 0, y: 150, size: 50 },
        { id: 14, name: "Continent 14", x: 50, y: 150, size: 50 },
        { id: 15, name: "Continent 15", x: 100, y: 150, size: 50 },
        { id: 16, name: "Continent 16", x: 150, y: 150, size: 50 },
      ])
    } catch (error) {
      console.error("Failed to fetch map:", error)
    } finally {
      setLoading(false)
    }
  }, [VIEW_RADIUS, WORLD_SIZE])

  useEffect(() => {
    fetchMapData(centerX, centerY, zoom)
  }, [centerX, centerY, zoom, fetchMapData])

  // Mouse/touch navigation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = (e.clientX - dragStart.x) / zoom / TILE_SIZE
    const deltaY = (e.clientY - dragStart.y) / zoom / TILE_SIZE

    setCenterX(prev => Math.max(0, Math.min(WORLD_SIZE, prev - deltaX)))
    setCenterY(prev => Math.max(0, Math.min(WORLD_SIZE, prev - deltaY)))

    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Zoom controls
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)))
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1
    handleZoom(zoomDelta)
  }

  // Village click handler
  const handleVillageClick = (village: Village) => {
    setSelectedVillage(village)
    setCenterX(village.x)
    setCenterY(village.y)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const step = 5 / zoom
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          setCenterY(prev => Math.max(0, prev - step))
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          setCenterY(prev => Math.min(WORLD_SIZE, prev + step))
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          setCenterX(prev => Math.max(0, prev - step))
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          setCenterX(prev => Math.min(WORLD_SIZE, prev + step))
          break
        case '+':
        case '=':
          e.preventDefault()
          handleZoom(0.2)
          break
        case '-':
        case '_':
          e.preventDefault()
          handleZoom(-0.2)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [zoom, WORLD_SIZE])

  // Transform coordinates to screen space
  const worldToScreen = (worldX: number, worldY: number) => {
    const screenX = (worldX - centerX) * TILE_SIZE * zoom + VIEW_WIDTH / 2
    const screenY = (worldY - centerY) * TILE_SIZE * zoom + VIEW_HEIGHT / 2
    return { x: screenX, y: screenY }
  }

  // Check if coordinates are visible on screen
  const isVisible = (worldX: number, worldY: number) => {
    const { x, y } = worldToScreen(worldX, worldY)
    return x >= -50 && x <= VIEW_WIDTH + 50 && y >= -50 && y <= VIEW_HEIGHT + 50
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 p-4 bg-slate-800">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:text-blue-400 flex items-center gap-1">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold">🗺️ World Map</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(-0.2)}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              -
            </Button>
            <span className="text-sm min-w-[3rem] text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(0.2)}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              +
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Map */}
        <div className="flex-1 relative overflow-hidden bg-slate-900">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-75 z-10">
              <div className="text-white text-lg">Loading map...</div>
            </div>
          )}

          {/* Map Container */}
          <div
            ref={mapContainerRef}
            className="w-full h-full cursor-move select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <svg
              ref={svgRef}
              width={VIEW_WIDTH}
              height={VIEW_HEIGHT}
              className="border border-slate-700"
              style={{
                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
              }}
            >
              {/* Grid Pattern */}
              <defs>
                <pattern
                  id="grid"
                  width={TILE_SIZE * zoom}
                  height={TILE_SIZE * zoom}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${TILE_SIZE * zoom} 0 L 0 0 0 ${TILE_SIZE * zoom}`}
                    fill="none"
                    stroke="#374151"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Continents */}
              {continents.map((continent) => {
                const { x, y } = worldToScreen(continent.x, continent.y)
                const size = continent.size * TILE_SIZE * zoom
                if (!isVisible(continent.x, continent.y)) return null

                return (
                  <g key={continent.id}>
                    <circle
                      cx={x + size / 2}
                      cy={y + size / 2}
                      r={size / 2}
                      fill="#10b981"
                      fillOpacity="0.1"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeOpacity="0.5"
                    />
                    <text
                      x={x + size / 2}
                      y={y + size / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs fill-slate-400 font-semibold"
                      fontSize={Math.max(8, 12 * zoom)}
                    >
                      {continent.name}
                    </text>
                  </g>
                )
              })}

              {/* Villages */}
              {villages.map((village) => {
                if (!isVisible(village.x, village.y)) return null

                const { x, y } = worldToScreen(village.x, village.y)
                const size = Math.max(8, 16 * zoom)
                const isSelected = selectedVillage?.id === village.id

                return (
                  <g key={village.id}>
                    {/* Village circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={size}
                      fill={village.isOwn ? "#3b82f6" : "#ef4444"}
                      stroke={isSelected ? "#fbbf24" : village.isOwn ? "#1e40af" : "#dc2626"}
                      strokeWidth={isSelected ? 3 : 2}
                      className="cursor-pointer hover:stroke-yellow-400 transition-all duration-200"
                      onClick={() => handleVillageClick(village)}
                    />

                    {/* Village icon */}
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-lg cursor-pointer select-none pointer-events-none"
                      fontSize={Math.max(10, 16 * zoom)}
                    >
                      🏰
                    </text>

                    {/* Village name */}
                    <text
                      x={x}
                      y={y + size + 8}
                      textAnchor="middle"
                      className="text-xs fill-slate-300 font-medium"
                      fontSize={Math.max(8, 10 * zoom)}
                    >
                      {village.name}
                    </text>

                    {/* Population indicator */}
                    {village.population && (
                      <text
                        x={x + size + 5}
                        y={y - size - 5}
                        className="text-xs fill-green-400 font-bold"
                        fontSize={Math.max(8, 10 * zoom)}
                      >
                        👥 {village.population}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Crosshair at center */}
              <g>
                <line
                  x1={VIEW_WIDTH / 2 - 10}
                  y1={VIEW_HEIGHT / 2}
                  x2={VIEW_WIDTH / 2 + 10}
                  y2={VIEW_HEIGHT / 2}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  opacity="0.7"
                />
                <line
                  x1={VIEW_WIDTH / 2}
                  y1={VIEW_HEIGHT / 2 - 10}
                  x2={VIEW_WIDTH / 2}
                  y2={VIEW_HEIGHT / 2 + 10}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  opacity="0.7"
                />
              </g>
            </svg>
          </div>

          {/* Coordinates Display */}
          <div className="absolute top-4 left-4 bg-slate-800 bg-opacity-90 px-3 py-2 rounded text-sm">
            Center: ({Math.round(centerX)}, {Math.round(centerY)})
          </div>

          {/* Zoom Indicator */}
          <div className="absolute top-4 right-4 bg-slate-800 bg-opacity-90 px-3 py-2 rounded text-sm">
            Zoom: {(zoom * 100).toFixed(0)}%
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
          {/* Village Details */}
          {selectedVillage && (
            <Card className="mb-4 bg-slate-700 border-slate-600">
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{selectedVillage.name}</h3>
                <div className="space-y-2 text-sm">
                  <div>Owner: {selectedVillage.playerName}</div>
                  <div>Position: ({selectedVillage.x}, {selectedVillage.y})</div>
                  <div>Population: {selectedVillage.population || 'Unknown'}</div>
                  <div>Loyalty: {selectedVillage.loyalty || 'Unknown'}%</div>
                  <div className={`inline-block px-2 py-1 rounded text-xs ${
                    selectedVillage.isOwn ? 'bg-blue-600' : 'bg-red-600'
                  }`}>
                    {selectedVillage.isOwn ? 'Your Village' : 'Enemy Village'}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Mini Map */}
          <Card className="mb-4 bg-slate-700 border-slate-600">
            <div className="p-4">
              <h3 className="font-bold mb-2">World Overview</h3>
              <div className="relative w-full h-32 bg-slate-900 rounded border border-slate-600">
                {/* Mini world representation */}
                <svg width="100%" height="100%" viewBox="0 0 200 200">
                  {/* Continents in mini map */}
                  {continents.map((continent) => (
                    <circle
                      key={continent.id}
                      cx={continent.x + continent.size / 2}
                      cy={continent.y + continent.size / 2}
                      r={continent.size / 2}
                      fill="#10b981"
                      fillOpacity="0.3"
                    />
                  ))}

                  {/* Viewport indicator */}
                  <rect
                    x={centerX - VIEW_RADIUS}
                    y={centerY - VIEW_RADIUS}
                    width={VIEW_RADIUS * 2}
                    height={VIEW_RADIUS * 2}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    opacity="0.8"
                  />
                </svg>
              </div>
            </div>
          </Card>

          {/* Controls */}
          <Card className="bg-slate-700 border-slate-600">
            <div className="p-4">
              <h3 className="font-bold mb-3">Controls</h3>
              <div className="space-y-2 text-sm">
                <div>🖱️ <strong>Drag</strong> to pan the map</div>
                <div>🔄 <strong>Scroll</strong> to zoom in/out</div>
                <div>⌨️ <strong>WASD/Arrow keys</strong> to navigate</div>
                <div>🏰 <strong>Click villages</strong> for details</div>
              </div>
            </div>
          </Card>

          {/* Legend */}
          <Card className="mt-4 bg-slate-700 border-slate-600">
            <div className="p-4">
              <h3 className="font-bold mb-3">Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-blue-700"></div>
                  <span className="text-sm">Your Villages</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-red-700"></div>
                  <span className="text-sm">Enemy Villages</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full opacity-30"></div>
                  <span className="text-sm">Continents</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
