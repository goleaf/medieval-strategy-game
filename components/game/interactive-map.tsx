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
  const [centerX, setCenterX] = useState(100)
  const [centerY, setCenterY] = useState(100)
  const [selectedTile, setSelectedTile] = useState<MapTile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const res = await fetch(`/api/world/map?centerX=${centerX}&centerY=${centerY}`)
        const data = await res.json()
        setTiles(data.tiles)
      } finally {
        setLoading(false)
      }
    }
    fetchMap()
  }, [centerX, centerY])

  const viewSize = 15
  const getTileSymbol = (tile: MapTile) => (tile.type === "village" ? "🏰" : "🌾")

  if (loading) return <div>Loading map...</div>

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${viewSize}, minmax(0, 1fr))` }}>
          {tiles.map((tile) => (
            <button
              key={`${tile.x}-${tile.y}`}
              onClick={() => setSelectedTile(tile)}
              className={`aspect-square p-1 flex items-center justify-center border transition text-sm ${
                selectedTile?.x === tile.x && selectedTile?.y === tile.y
                  ? "border-primary bg-primary/20"
                  : "border-border hover:bg-secondary/50"
              }`}
              title={`(${tile.x}, ${tile.y})`}
            >
              {getTileSymbol(tile)}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 justify-center flex-wrap">
        <Button onClick={() => setCenterY(Math.max(0, centerY - 5))} size="sm">
          N
        </Button>
        <Button onClick={() => setCenterY(Math.min(200, centerY + 5))} size="sm">
          S
        </Button>
        <Button onClick={() => setCenterX(Math.max(0, centerX - 5))} size="sm">
          W
        </Button>
        <Button onClick={() => setCenterX(Math.min(200, centerX + 5))} size="sm">
          E
        </Button>
      </div>

      {selectedTile && (
        <Card className="p-4">
          <p className="font-bold">
            ({selectedTile.x}, {selectedTile.y})
          </p>
          {selectedTile.village ? (
            <p className="text-sm text-muted-foreground">
              {selectedTile.village.name} - {selectedTile.village.player?.playerName}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Empty land</p>
          )}
        </Card>
      )}
    </div>
  )
}
