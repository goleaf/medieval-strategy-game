"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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

export default function MapPage() {
  const [tiles, setTiles] = useState<MapTile[]>([])
  const [bounds, setBounds] = useState({ startX: 0, startY: 0, endX: 20, endY: 20 })
  const [centerX, setCenterX] = useState(50)
  const [centerY, setCenterY] = useState(50)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchMap = async (x: number, y: number, z: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/world/map?centerX=${x}&centerY=${y}&zoom=${z}&playerId=temp-player-id`,
      )
      const data = await res.json()
      if (data.success && data.data) {
        setTiles(data.data.tiles || [])
        setBounds(data.data.bounds || bounds)
      }
    } catch (error) {
      console.error("Failed to fetch map:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMap(centerX, centerY, zoom)
  }, [])

  const moveMap = (dx: number, dy: number) => {
    const newX = Math.max(0, Math.min(100, centerX + dx))
    const newY = Math.max(0, Math.min(100, centerY + dy))
    setCenterX(newX)
    setCenterY(newY)
    fetchMap(newX, newY, zoom)
  }

  const adjustZoom = (delta: number) => {
    const newZoom = Math.max(0.5, Math.min(5, zoom + delta))
    setZoom(newZoom)
    fetchMap(centerX, centerY, newZoom)
  }

  const gridWidth = bounds.endX - bounds.startX
  const gridHeight = bounds.endY - bounds.startY

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">🗺️ World Map</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => adjustZoom(-0.5)}>
              -
            </Button>
            <span className="text-xs">Zoom: {zoom}x</span>
            <Button variant="outline" size="sm" onClick={() => adjustZoom(0.5)}>
              +
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading && <div className="text-center py-4">Loading map...</div>}
          {!loading && (
            <>
            <div className="flex items-center justify-between text-sm">
                <div>Center: ({centerX}, {centerY}) | View: {gridWidth}×{gridHeight}</div>
              <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => moveMap(0, -5)}>
                  ↑
                </Button>
                  <Button variant="outline" size="sm" onClick={() => moveMap(-5, 0)}>
                  ←
                </Button>
                  <Button variant="outline" size="sm" onClick={() => moveMap(5, 0)}>
                  →
                </Button>
                  <Button variant="outline" size="sm" onClick={() => moveMap(0, 5)}>
                  ↓
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block">
                <div className="grid gap-0 font-mono text-xs" style={{ gridTemplateColumns: `repeat(${gridWidth}, minmax(20px, 1fr))` }}>
                    {tiles.map((tile) => {
                    const symbol = tile.fogOfWar
                      ? "?"
                      : tile.village
                        ? tile.village.isOwn
                          ? "🏰"
                          : "⚔️"
                        : "·"
                    return (
                      <div
                        key={`${tile.x}-${tile.y}`}
                        className="w-5 h-5 flex items-center justify-center border border-border hover:bg-secondary cursor-pointer"
                        title={tile.village ? `${tile.village.name} (${tile.village.playerName})` : `(${tile.x}, ${tile.y})`}
                      >
                        {symbol}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>🏰 = Your village</div>
              <div>⚔️ = Enemy village</div>
              <div>· = Empty</div>
              <div>? = Unknown (fog of war)</div>
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
