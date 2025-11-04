"use client"

import { useEffect } from "react"
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
  useEffect(() => {
    if (typeof window !== "undefined" && onVillageClick) {
      (window as any).__worldMapVillageClickHandler = onVillageClick
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__worldMapVillageClickHandler
      }
    }
  }, [onVillageClick])

  const cellSize = 30
  const viewWidth = 400
  const viewHeight = 400

  return (
    <Card
      x-data={`{
        zoomLevel: 1,
        centerX: ${maxX / 2},
        centerY: ${maxY / 2},
        get cellSize() {
          return 30 * this.zoomLevel;
        },
        get visibleVillages() {
          const villages = ${JSON.stringify(villages)};
          return villages.filter(v => {
            const dx = Math.abs(v.x - this.centerX);
            const dy = Math.abs(v.y - this.centerY);
            return dx < ${viewWidth} / this.cellSize && dy < ${viewHeight} / this.cellSize;
          });
        },
        adjustZoom(delta) {
          this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel + delta));
        },
        handleVillageClick(village) {
          this.centerX = village.x;
          this.centerY = village.y;
          if (window.__worldMapVillageClickHandler) {
            window.__worldMapVillageClickHandler(village);
          }
        }
      }`}
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold">World Map</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" x-on:click="adjustZoom(-0.5)">-</Button>
          <span className="text-sm px-2 py-1" x-text="`${(zoomLevel * 100).toFixed(0)}%`" />
          <Button size="sm" variant="outline" x-on:click="adjustZoom(0.5)">+</Button>
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
          {villages.map((village) => {
            const isPlayerVillage = playerVillages.some((v) => v.x === village.x && v.y === village.y)
            return (
              <g
                key={`${village.x}-${village.y}`}
                x-on:click={`handleVillageClick(${JSON.stringify(village)})`}
                className="cursor-pointer"
              >
                <circle
                  cx={`((${village.x} - (centerX - ${viewWidth} / (2 * cellSize))) * cellSize)`}
                  cy={`((${village.y} - (centerY - ${viewHeight} / (2 * cellSize))) * cellSize)`}
                  r={`cellSize / 3`}
                  fill={isPlayerVillage ? "rgba(166, 124, 82, 0.8)" : "rgba(100, 100, 100, 0.5)"}
                  stroke={village.isEnemy ? "#b54a35" : "#a67c52"}
                  strokeWidth="2"
                />
                <text
                  x={`((${village.x} - (centerX - ${viewWidth} / (2 * cellSize))) * cellSize)`}
                  y={`((${village.y} - (centerY - ${viewHeight} / (2 * cellSize))) * cellSize)`}
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
        <p x-text="`Center: (${Math.round(centerX)}, ${Math.round(centerY)})`" />
        <p x-text="`Villages visible: ${visibleVillages.length}`" />
      </div>
    </Card>
  )
}
