"use client"

import Image from "next/image"
import { X } from "lucide-react"
import { CountdownTimer } from "./countdown-timer"
import type { Building } from "@prisma/client"

function getBuildingImage(type: string): string {
  const imageMap: Record<string, string> = {
    HEADQUARTER: "/buildings/headquarter.svg",
    MARKETPLACE: "/buildings/marketplace.svg",
    BARRACKS: "/buildings/barracks.svg",
    STABLES: "/buildings/stables.svg",
    WATCHTOWER: "/buildings/watchtower.svg",
    WALL: "/buildings/wall.svg",
    WAREHOUSE: "/buildings/warehouse.svg",
    GRANARY: "/buildings/granary.svg",
    SAWMILL: "/buildings/sawmill.svg",
    QUARRY: "/buildings/quarry.svg",
    IRON_MINE: "/buildings/iron_mine.svg",
    TREASURY: "/buildings/treasury.svg",
    ACADEMY: "/buildings/academy.svg",
    TEMPLE: "/buildings/temple.svg",
    HOSPITAL: "/buildings/hospital.svg",
    FARM: "/buildings/farm.svg",
    SNOB: "/buildings/snob.svg",
  }
  return imageMap[type] || "/placeholder.svg"
}

interface BuildingQueueProps {
  buildings: Building[]
  onCancel?: (buildingId: string) => void
}

export function BuildingQueue({ buildings, onCancel }: BuildingQueueProps) {
  const queuedBuildings = buildings.filter((b) => b.isBuilding && b.queuePosition !== null)

  if (queuedBuildings.length === 0) {
    return <div className="text-sm text-muted-foreground">No buildings in queue</div>
  }

  const sortedBuildings = queuedBuildings.sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0))

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Construction Queue</h3>
      {sortedBuildings.map((building) => (
        <div
          key={building.id}
          className="flex items-center justify-between border border-border bg-secondary/50 p-2 text-sm"
        >
          <div className="flex items-center gap-3">
            <Image
              src={getBuildingImage(building.type)}
              alt={building.type}
              width={32}
              height={32}
              className="object-contain"
            />
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
          </div>
          {onCancel && building.queuePosition !== 1 && (
            <button
              onClick={() => onCancel(building.id)}
              className="ml-2 rounded border border-border bg-destructive px-2 py-1 text-xs hover:bg-destructive/80 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

