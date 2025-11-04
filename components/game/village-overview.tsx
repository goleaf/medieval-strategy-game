"use client"

import { Button } from "@/components/ui/button"
import type { Village, Building, Troop } from "@prisma/client"
import { useState } from "react"
import { CountdownTimer } from "./countdown-timer"

interface VillageOverviewProps {
  village: Village & { buildings: Building[]; troops: Troop[] }
  onBuild?: (type: string) => void
  onUpgrade?: (buildingId: string) => void
}

export function VillageOverview({ village, onUpgrade }: VillageOverviewProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

  return (
    <div className="w-full space-y-4">
      {/* Village Info Table */}
      <section>
        <h2 className="text-xl font-bold mb-2">{village.name}</h2>
        <table className="w-full border-collapse border border-border">
          <tbody>
            <tr>
              <th className="border border-border p-2 text-left bg-secondary">Position</th>
              <td className="border border-border p-2">({village.x}, {village.y})</td>
            </tr>
            <tr>
              <th className="border border-border p-2 text-left bg-secondary">Population</th>
              <td className="border border-border p-2">👨‍🌾 {village.population}</td>
            </tr>
            <tr>
              <th className="border border-border p-2 text-left bg-secondary">Loyalty</th>
              <td className="border border-border p-2">{village.loyalty}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Resources Table */}
      <section>
        <h3 className="text-lg font-bold mb-2">Resources</h3>
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr>
              <th className="border border-border p-2 text-left bg-secondary">Resource</th>
              <th className="border border-border p-2 text-right bg-secondary">Amount</th>
              <th className="border border-border p-2 text-right bg-secondary">Production</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">🪵 Wood</td>
              <td className="border border-border p-2 text-right font-mono">{village.wood.toLocaleString()}</td>
              <td className="border border-border p-2 text-right">+{village.woodProduction}/tick</td>
            </tr>
            <tr>
              <td className="border border-border p-2">🧱 Stone</td>
              <td className="border border-border p-2 text-right font-mono">{village.stone.toLocaleString()}</td>
              <td className="border border-border p-2 text-right">+{village.stoneProduction}/tick</td>
            </tr>
            <tr>
              <td className="border border-border p-2">⛓ Iron</td>
              <td className="border border-border p-2 text-right font-mono">{village.iron.toLocaleString()}</td>
              <td className="border border-border p-2 text-right">+{village.ironProduction}/tick</td>
            </tr>
            <tr>
              <td className="border border-border p-2">🪙 Gold</td>
              <td className="border border-border p-2 text-right font-mono">{village.gold.toLocaleString()}</td>
              <td className="border border-border p-2 text-right">+{village.goldProduction}/tick</td>
            </tr>
            <tr>
              <td className="border border-border p-2">🌾 Food</td>
              <td className="border border-border p-2 text-right font-mono">{village.food.toLocaleString()}</td>
              <td className="border border-border p-2 text-right">+{village.foodProduction}/tick</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Buildings Table */}
      <section>
        <h3 className="text-lg font-bold mb-2">Buildings</h3>
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr>
              <th className="border border-border p-2 text-left bg-secondary">Type</th>
              <th className="border border-border p-2 text-right bg-secondary">Level</th>
              <th className="border border-border p-2 text-left bg-secondary">Status</th>
              <th className="border border-border p-2 text-left bg-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {village.buildings.length === 0 ? (
              <tr>
                <td colSpan={4} className="border border-border p-2 text-center text-muted-foreground">
                  No buildings
                </td>
              </tr>
            ) : (
              village.buildings.map((building) => (
                <tr
                  key={building.id}
                  className={selectedBuilding?.id === building.id ? "bg-primary/10" : ""}
                >
                  <td className="border border-border p-2">{building.type}</td>
                  <td className="border border-border p-2 text-right">{building.level}</td>
                  <td className="border border-border p-2">
                    {building.isBuilding && building.completionAt ? (
                      <span>
                        Building: <CountdownTimer targetDate={building.completionAt} />
                      </span>
                    ) : (
                      "Ready"
                    )}
                  </td>
                  <td className="border border-border p-2">
                    <button
                      onClick={() => {
                        if (selectedBuilding?.id === building.id) {
                          setSelectedBuilding(null)
                        } else {
                          setSelectedBuilding(building)
                        }
                      }}
                      className="px-2 py-1 border border-border rounded hover:bg-secondary"
                    >
                      {selectedBuilding?.id === building.id ? "Hide" : "Select"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
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
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr>
              <th className="border border-border p-2 text-left bg-secondary">Type</th>
              <th className="border border-border p-2 text-right bg-secondary">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {village.troops.length === 0 ? (
              <tr>
                <td colSpan={2} className="border border-border p-2 text-center text-muted-foreground">
                  No troops stationed
                </td>
              </tr>
            ) : (
              village.troops.map((troop) => (
                <tr key={troop.id}>
                  <td className="border border-border p-2">{troop.type}</td>
                  <td className="border border-border p-2 text-right font-mono">{troop.quantity.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
