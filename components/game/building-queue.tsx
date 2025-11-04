"use client"

import { useEffect } from "react"
import { CountdownTimer } from "./countdown-timer"
import type { Building } from "@prisma/client"

interface BuildingQueueProps {
  buildings: Building[]
  onCancel?: (buildingId: string) => void
}

export function BuildingQueue({ buildings, onCancel }: BuildingQueueProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && onCancel) {
      (window as any).__buildingQueueCancelHandler = onCancel
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__buildingQueueCancelHandler
      }
    }
  }, [onCancel])

  const queuedBuildings = buildings.filter((b) => b.isBuilding && b.queuePosition !== null)

  if (queuedBuildings.length === 0) {
    return <div className="text-sm text-muted-foreground">No buildings in queue</div>
  }

  const sortedBuildings = queuedBuildings.sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0))

  return (
    <div
      x-data={`{
        handleCancel(buildingId) {
          if (window.__buildingQueueCancelHandler) {
            window.__buildingQueueCancelHandler(buildingId);
          }
        }
      }`}
      className="space-y-2"
    >
      <h3 className="text-sm font-semibold">Construction Queue</h3>
      {sortedBuildings.map((building) => (
        <div
          key={building.id}
          className="flex items-center justify-between border border-border bg-secondary/50 p-2 text-sm"
        >
          <div className="flex-1">
            <div className="font-semibold">
              {building.type} (Level {building.level} → {building.level + 1})
            </div>
            <div className="text-xs text-muted-foreground">
              Queue #{building.queuePosition}
              {building.completionAt && (
                <>
                  {" "}
                  • Completes in <CountdownTimer targetDate={building.completionAt} />
                </>
              )}
            </div>
          </div>
          {onCancel && building.queuePosition !== 1 && (
            <button
              x-on:click={`handleCancel('${building.id}')`}
              className="ml-2 rounded border border-border bg-destructive px-2 py-1 text-xs hover:bg-destructive/80"
            >
              Cancel
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

