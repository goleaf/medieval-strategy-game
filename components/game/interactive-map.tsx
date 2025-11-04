"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface MapTile {
  x: number
  y: number
  type: "village" | "empty"
  village?: { x: number; y: number; name: string; player?: { playerName: string } }
}

export function InteractiveMap() {
  const [tiles, setTiles] = useState<MapTile[]>([])

  const fetchMap = async (centerX: number, centerY: number) => {
    try {
      const res = await fetch(`/api/world/map?centerX=${centerX}&centerY=${centerY}`)
      const data = await res.json()
      setTiles(data.tiles)
    } catch (error) {
      console.error("Failed to fetch map:", error)
    }
  }

  useEffect(() => {
    fetchMap(100, 100)
    if (typeof window !== "undefined") {
      (window as any).__interactiveMapFetchHandler = fetchMap
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__interactiveMapFetchHandler
      }
    }
  }, [])

  const viewSize = 15
  const getTileSymbol = (tile: MapTile) => (tile.type === "village" ? "🏰" : "🌾")

  return (
    <div
      x-data={`{
        centerX: 100,
        centerY: 100,
        selectedTile: null,
        loading: false,
        tiles: ${JSON.stringify(tiles)},
        async init() {
          await this.fetchMap();
        },
        async fetchMap() {
          this.loading = true;
          if (window.__interactiveMapFetchHandler) {
            await window.__interactiveMapFetchHandler(this.centerX, this.centerY);
            this.tiles = ${JSON.stringify(tiles)};
          }
          this.loading = false;
        },
        moveMap(dx, dy) {
          this.centerX = Math.max(0, Math.min(200, this.centerX + dx));
          this.centerY = Math.max(0, Math.min(200, this.centerY + dy));
          this.fetchMap();
        },
        selectTile(tile) {
          this.selectedTile = tile;
        }
      }`}
      className="space-y-4"
    >
      <div x-show="loading">Loading map...</div>
      <div x-show="!loading">
        <Card className="p-6">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${viewSize}, minmax(0, 1fr))` }}>
            {tiles.map((tile) => (
              <button
                key={`${tile.x}-${tile.y}`}
                x-on:click={`selectTile(${JSON.stringify(tile)})`}
                x-bind:class={`selectedTile && selectedTile.x === ${tile.x} && selectedTile.y === ${tile.y} ? 'border-primary bg-primary/20' : 'border-border hover:bg-secondary/50'`}
                className="aspect-square p-1 flex items-center justify-center border transition text-sm"
                title={`(${tile.x}, ${tile.y})`}
              >
                {getTileSymbol(tile)}
              </button>
            ))}
          </div>
        </Card>

        <div className="flex gap-2 justify-center flex-wrap">
          <Button x-on:click="moveMap(0, -5)" size="sm">N</Button>
          <Button x-on:click="moveMap(0, 5)" size="sm">S</Button>
          <Button x-on:click="moveMap(-5, 0)" size="sm">W</Button>
          <Button x-on:click="moveMap(5, 0)" size="sm">E</Button>
        </div>

        <div x-show="selectedTile">
          <Card className="p-4">
            <p className="font-bold" x-text="`(${selectedTile?.x}, ${selectedTile?.y})`" />
            <p x-show="selectedTile?.village" className="text-sm text-muted-foreground" x-text="`${selectedTile?.village?.name} - ${selectedTile?.village?.player?.playerName}`" />
            <p x-show="!selectedTile?.village" className="text-sm text-muted-foreground">Empty land</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
