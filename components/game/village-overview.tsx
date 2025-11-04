"use client"

import { Button } from "@/components/ui/button"
import type { Village, Building, Troop } from "@prisma/client"
import { useState } from "react"
import { CountdownTimer } from "./countdown-timer"
import { TextTable } from "./text-table"

interface VillageOverviewProps {
  village: Village & { buildings: Building[]; troops: Troop[] }
  onBuild?: (type: string) => void
  onUpgrade?: (buildingId: string) => void
}

export function VillageOverview({ village, onUpgrade }: VillageOverviewProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

  return (
    <div className="w-full space-y-4">
      {/* Village Info */}
      <section>
        <h2 className="text-lg font-bold mb-2">{village.name}</h2>
        <TextTable
          headers={["Property", "Value"]}
          rows={[
            ["Position", `(${village.x}, ${village.y})`],
            ["Population", `👨‍🌾 ${village.population}`],
            ["Loyalty", `${village.loyalty}%`],
          ]}
        />
      </section>

      {/* Resources Table */}
      <section>
        <h3 className="text-lg font-bold mb-2">Resources</h3>
        <TextTable
          headers={["Resource", "Amount", "Production"]}
          rows={[
            ["🪵 Wood", <span key="wood" className="font-mono text-right block">{village.wood.toLocaleString()}</span>, `+${village.woodProduction}/tick`],
            ["🧱 Stone", <span key="stone" className="font-mono text-right block">{village.stone.toLocaleString()}</span>, `+${village.stoneProduction}/tick`],
            ["⛓ Iron", <span key="iron" className="font-mono text-right block">{village.iron.toLocaleString()}</span>, `+${village.ironProduction}/tick`],
            ["🪙 Gold", <span key="gold" className="font-mono text-right block">{village.gold.toLocaleString()}</span>, `+${village.goldProduction}/tick`],
            ["🌾 Food", <span key="food" className="font-mono text-right block">{village.food.toLocaleString()}</span>, `+${village.foodProduction}/tick`],
          ]}
        />
      </section>

      {/* Buildings Table */}
      <section>
        <h3 className="text-lg font-bold mb-2">Buildings</h3>
        <TextTable
          headers={["Type", "Level", "Status", "Actions"]}
          rows={village.buildings.map((building) => [
            building.type,
            building.level.toString(),
            building.isBuilding && building.completionAt ? (
              <span key={`status-${building.id}`}>
                Building: <CountdownTimer targetDate={building.completionAt} />
              </span>
            ) : (
              "Ready"
            ),
            <button
              key={`action-${building.id}`}
              onClick={() => {
                if (selectedBuilding?.id === building.id) {
                  setSelectedBuilding(null)
                } else {
                  setSelectedBuilding(building)
                }
              }}
              className="px-2 py-1 border border-border rounded hover:bg-secondary text-sm"
            >
              {selectedBuilding?.id === building.id ? "Hide" : "Select"}
            </button>,
          ])}
        />
        
        {selectedBuilding && (
          <div className="mt-2 p-3 border border-border rounded bg-secondary">
            <h4 className="font-bold mb-2">{selectedBuilding.type} (Level {selectedBuilding.level})</h4>
            {selectedBuilding.isBuilding && selectedBuilding.completionAt ? (
              <p className="mb-2">
                Completion: <CountdownTimer targetDate={selectedBuilding.completionAt} />
              </p>
            ) : (
              <Button
                onClick={() => onUpgrade?.(selectedBuilding.id)}
                className="w-full"
              >
                Upgrade
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Troops Table */}
      <section>
        <h3 className="text-lg font-bold mb-2">Troops</h3>
        <TextTable
          headers={["Type", "Quantity"]}
          rows={village.troops.map((troop) => [
            troop.type,
            <span key={troop.id} className="font-mono text-right block">{troop.quantity.toLocaleString()}</span>,
          ])}
        />
      </section>
    </div>
  )
}
