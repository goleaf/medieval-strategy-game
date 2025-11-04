"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/game/navbar"

interface MapTile {
  x: number
  y: number
  type: "player" | "barbarian" | "empty"
  playerId?: string
  playerName?: string
}

const SECTOR_SIZE = 20 // 20x20 tiles per sector
const VIEW_SIZE = 15 // Show 15x15 tiles in textarea

export default function MapPage() {
  const [tiles, setTiles] = useState<MapTile[][]>([])
  const [sectorX, setSectorX] = useState(0)
  const [sectorY, setSectorY] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [selectedTile, setSelectedTile] = useState<MapTile | null>(null)
  const [loading, setLoading] = useState(false)
  const [villages] = useState<any[]>([]) // Will be populated from API

  const loadSector = async (sx: number, sy: number) => {
    setLoading(true)
    try {
      // Lazy load sector data from API
      const res = await fetch(`/api/world/map?sectorX=${sx}&sectorY=${sy}`)
      const data = await res.json()
      
      // Build grid for this sector
      const grid: MapTile[][] = []
      const startX = sx * SECTOR_SIZE
      const startY = sy * SECTOR_SIZE
      
      for (let y = startY; y < startY + SECTOR_SIZE; y++) {
        const row: MapTile[] = []
        for (let x = startX; x < startX + SECTOR_SIZE; x++) {
          // Check if tile exists in loaded data
          const tileData = data.tiles?.find((t: any) => t.x === x && t.y === y)
          row.push(
            tileData || {
              x,
              y,
              type: "empty",
            }
          )
        }
        grid.push(row)
      }
      setTiles(grid)
    } catch (error) {
      // Fallback: generate empty grid
      const grid: MapTile[][] = []
      const startX = sx * SECTOR_SIZE
      const startY = sy * SECTOR_SIZE
      for (let y = startY; y < startY + SECTOR_SIZE; y++) {
        const row: MapTile[] = []
        for (let x = startX; x < startX + SECTOR_SIZE; x++) {
          row.push({ x, y, type: "empty" })
        }
        grid.push(row)
      }
      setTiles(grid)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSector(sectorX, sectorY)
  }, [sectorX, sectorY])

  const getTileSymbol = (tile: MapTile) => {
    if (tile.type === "barbarian") return "B"
    if (tile.type === "player") return "P"
    return "."
  }

  const getTileColor = (tile: MapTile) => {
    if (tile.type === "barbarian") return "text-red-600"
    if (tile.type === "player") return "text-blue-600"
    return "text-gray-400"
  }

  // Get visible tiles based on offset
  const visibleTiles = tiles.slice(offsetY, offsetY + VIEW_SIZE).map((row) =>
    row.slice(offsetX, offsetX + VIEW_SIZE)
  )

  const handleSectorChange = (dx: number, dy: number) => {
    const newSectorX = Math.max(0, sectorX + dx)
    const newSectorY = Math.max(0, sectorY + dy)
    setSectorX(newSectorX)
    setSectorY(newSectorY)
    setOffsetX(0)
    setOffsetY(0)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        villages={villages}
        currentVillageId={null}
        onVillageChange={() => {}}
        notificationCount={0}
      />
      
      <main className="flex-1 w-full p-4">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">World Map</h1>

          {/* Legends */}
          <section>
            <h2 className="text-lg font-bold mb-2">Legends</h2>
            <table className="w-full border-collapse border border-border">
              <tbody>
                <tr>
                  <td className="border border-border p-2">.</td>
                  <td className="border border-border p-2">Empty Land</td>
                </tr>
                <tr>
                  <td className="border border-border p-2 text-blue-600">P</td>
                  <td className="border border-border p-2">Player Village</td>
                </tr>
                <tr>
                  <td className="border border-border p-2 text-red-600">B</td>
                  <td className="border border-border p-2">Barbarian Village</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Map Grid - Textarea Style */}
          <section>
            <h2 className="text-lg font-bold mb-2">
              Sector ({sectorX}, {sectorY}) - View ({offsetX}, {offsetY})
            </h2>
            <div className="border border-border rounded bg-card p-2">
              <textarea
                readOnly
                value={visibleTiles
                  .map((row, y) =>
                    row
                      .map((tile, x) => {
                        const symbol = getTileSymbol(tile)
                        return selectedTile?.x === tile.x && selectedTile?.y === tile.y
                          ? `[${symbol}]`
                          : ` ${symbol} `
                      })
                      .join("")
                  )
                  .join("\n")}
                className="w-full font-mono text-sm resize-none border-none bg-transparent p-2"
                rows={VIEW_SIZE}
                cols={VIEW_SIZE * 3}
                onClick={(e) => {
                  const textarea = e.currentTarget
                  const rect = textarea.getBoundingClientRect()
                  const x = Math.floor((e.clientX - rect.left) / (rect.width / VIEW_SIZE))
                  const y = Math.floor((e.clientY - rect.top) / (rect.height / VIEW_SIZE))
                  if (y >= 0 && y < visibleTiles.length && x >= 0 && x < visibleTiles[0]?.length) {
                    const tile = visibleTiles[y]?.[x]
                    if (tile) setSelectedTile(tile)
                  }
                }}
                style={{ 
                  fontFamily: "monospace",
                  lineHeight: "1.2",
                  cursor: "pointer"
                }}
              />
            </div>
          </section>

          {/* Sector Navigation */}
          <section>
            <h2 className="text-lg font-bold mb-2">Sector Navigation</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleSectorChange(-1, 0)} variant="outline">
                West Sector
              </Button>
              <Button onClick={() => handleSectorChange(1, 0)} variant="outline">
                East Sector
              </Button>
              <Button onClick={() => handleSectorChange(0, -1)} variant="outline">
                North Sector
              </Button>
              <Button onClick={() => handleSectorChange(0, 1)} variant="outline">
                South Sector
              </Button>
            </div>
          </section>

          {/* View Offset Controls */}
          <section>
            <h2 className="text-lg font-bold mb-2">View Offset</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setOffsetX(Math.max(0, offsetX - 5))}
                variant="outline"
                disabled={offsetX === 0}
              >
                ← West
              </Button>
              <Button
                onClick={() => setOffsetX(Math.min(SECTOR_SIZE - VIEW_SIZE, offsetX + 5))}
                variant="outline"
                disabled={offsetX >= SECTOR_SIZE - VIEW_SIZE}
              >
                East →
              </Button>
              <Button
                onClick={() => setOffsetY(Math.max(0, offsetY - 5))}
                variant="outline"
                disabled={offsetY === 0}
              >
                ↑ North
              </Button>
              <Button
                onClick={() => setOffsetY(Math.min(SECTOR_SIZE - VIEW_SIZE, offsetY + 5))}
                variant="outline"
                disabled={offsetY >= SECTOR_SIZE - VIEW_SIZE}
              >
                South ↓
              </Button>
            </div>
          </section>

          {/* Selected Tile Info */}
          {selectedTile && (
            <section>
              <h2 className="text-lg font-bold mb-2">Selected Tile</h2>
              <table className="w-full border-collapse border border-border">
                <tbody>
                  <tr>
                    <th className="border border-border p-2 text-left bg-secondary">Position</th>
                    <td className="border border-border p-2">({selectedTile.x}, {selectedTile.y})</td>
                  </tr>
                  <tr>
                    <th className="border border-border p-2 text-left bg-secondary">Type</th>
                    <td className="border border-border p-2">
                      {selectedTile.type === "barbarian"
                        ? "Barbarian Village"
                        : selectedTile.type === "player"
                          ? selectedTile.playerName || "Player Village"
                          : "Empty Land"}
                    </td>
                  </tr>
                </tbody>
              </table>
              {selectedTile.type === "barbarian" && (
                <div className="mt-2">
                  <Button>Scout Village</Button>
                </div>
              )}
            </section>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground">Loading sector...</p>
          )}
        </div>
      </main>
    </div>
  )
}
