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

  const fetchMap = async (centerX: number, centerY: number, zoom: number) => {
    try {
      const res = await fetch(
        `/api/world/map?centerX=${centerX}&centerY=${centerY}&zoom=${zoom}&playerId=temp-player-id`,
      )
      const data = await res.json()
      if (data.success && data.data) {
        setTiles(data.data.tiles || [])
        setBounds(data.data.bounds || bounds)
      }
    } catch (error) {
      console.error("Failed to fetch map:", error)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__mapFetchHandler = fetchMap
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__mapFetchHandler
      }
    }
  }, [])

  const gridWidth = bounds.endX - bounds.startX
  const gridHeight = bounds.endY - bounds.startY

  return (
    <div
      x-data={`{
        centerX: 50,
        centerY: 50,
        zoom: 1,
        loading: false,
        async init() {
          await this.fetchMap();
        },
        async fetchMap() {
          this.loading = true;
          if (window.__mapFetchHandler) {
            await window.__mapFetchHandler(this.centerX, this.centerY, this.zoom);
          }
          this.loading = false;
        },
        moveMap(dx, dy) {
          this.centerX = Math.max(0, Math.min(100, this.centerX + dx));
          this.centerY = Math.max(0, Math.min(100, this.centerY + dy));
          this.fetchMap();
        },
        adjustZoom(delta) {
          this.zoom = Math.max(0.5, Math.min(5, this.zoom + delta));
          this.fetchMap();
        }
      }`}
      className="min-h-screen bg-background text-foreground"
    >
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">🗺️ World Map</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" x-on:click="adjustZoom(-0.5)">
              -
            </Button>
            <span className="text-xs" x-text="`Zoom: ${zoom}x`" />
            <Button variant="outline" size="sm" x-on:click="adjustZoom(0.5)">
              +
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div x-show="loading" className="text-center py-4">Loading map...</div>
          <div x-show="!loading">
            <div className="flex items-center justify-between text-sm">
              <div x-text="`Center: (${centerX}, ${centerY}) | View: ${gridWidth}×${gridHeight}`" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" x-on:click="moveMap(0, -5)">
                  ↑
                </Button>
                <Button variant="outline" size="sm" x-on:click="moveMap(-5, 0)">
                  ←
                </Button>
                <Button variant="outline" size="sm" x-on:click="moveMap(5, 0)">
                  →
                </Button>
                <Button variant="outline" size="sm" x-on:click="moveMap(0, 5)">
                  ↓
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block">
                <div className="grid gap-0 font-mono text-xs" style={{ gridTemplateColumns: `repeat(${gridWidth}, minmax(20px, 1fr))` }}>
                  {tiles.map((tile, idx) => {
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
          </div>
        </div>
      </main>
    </div>
  )
}
