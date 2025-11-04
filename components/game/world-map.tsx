"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface MapVillage {
  x: number
  y: number
  name: string
  owner?: string
  isEnemy?: boolean
}

interface WorldMapProps {
  villages: MapVillage[]
  playerVillages: MapVillage[]
  onVillageClick?: (village: MapVillage) => void
  maxX?: number
  maxY?: number
}

export function WorldMap({ villages, playerVillages, onVillageClick, maxX = 200, maxY = 200 }: WorldMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [centerX, setCenterX] = useState(maxX / 2)
  const [centerY, setCenterY] = useState(maxY / 2)

  const cellSize = 30 * zoomLevel
  const viewWidth = 400
  const viewHeight = 400

  const visibleVillages = villages.filter((v) => {
    const dx = Math.abs(v.x - centerX)
    const dy = Math.abs(v.y - centerY)
    return dx < viewWidth / cellSize && dy < viewHeight / cellSize
  })

  const handleVillageClick = (village: MapVillage) => {
    setCenterX(village.x)
    setCenterY(village.y)
    onVillageClick?.(village)
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">World Map</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))}>
            -
          </Button>
          <span className="text-sm px-2 py-1">{(zoomLevel * 100).toFixed(0)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}>
            +
          </Button>
        </div>
      </div>

      <div className="relative w-full h-96 bg-secondary rounded border border-border overflow-hidden">
        <svg
          className="w-full h-full"
          style={{
            backgroundImage:
              'url(data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect fill="none" stroke="rgba(0,0,0,0.05)" width="20" height="20"/></svg>)',
          }}
        >
          {visibleVillages.map((village) => {
            const x = (village.x - (centerX - viewWidth / (2 * cellSize))) * cellSize
            const y = (village.y - (centerY - viewHeight / (2 * cellSize))) * cellSize

            const isPlayerVillage = playerVillages.some((v) => v.x === village.x && v.y === village.y)

            return (
              <g
                key={`${village.x}-${village.y}`}
                onClick={() => handleVillageClick(village)}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={cellSize / 3}
                  fill={isPlayerVillage ? "rgba(166, 124, 82, 0.8)" : "rgba(100, 100, 100, 0.5)"}
                  stroke={village.isEnemy ? "#b54a35" : "#a67c52"}
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-bold fill-white pointer-events-none select-none"
                >
                  {village.x},{village.y}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          Center: ({Math.round(centerX)}, {Math.round(centerY)})
        </p>
        <p>Villages visible: {visibleVillages.length}</p>
      </div>
    </Card>
  )
}
