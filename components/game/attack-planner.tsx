"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { AttackType } from "@prisma/client"
import type { Troop } from "@prisma/client"

interface AttackPlannerProps {
  villageId: string
  troops: Troop[]
  onLaunchAttack: (toX: number, toY: number, selection: Record<string, number>, type: AttackType) => Promise<void>
}

export function AttackPlanner({ villageId, troops, onLaunchAttack }: AttackPlannerProps) {
  const [mode, setMode] = useState<"inactive" | "coordinates" | "troops">("inactive")
  const [targetX, setTargetX] = useState("")
  const [targetY, setTargetY] = useState("")
  const [attackType, setAttackType] = useState<AttackType>("RAID")
  const [troopSelection, setTroopSelection] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  const handleTroopChange = (troopId: string, value: number) => {
    setTroopSelection((prev) => {
      const updated = { ...prev }
      if (value <= 0) {
        delete updated[troopId]
      } else {
        updated[troopId] = value
      }
      return updated
    })
  }

  const handleLaunch = async () => {
    if (!targetX || !targetY || Object.keys(troopSelection).length === 0) return

    setLoading(true)
    try {
      await onLaunchAttack(Number.parseInt(targetX), Number.parseInt(targetY), troopSelection, attackType)
      setMode("inactive")
      setTargetX("")
      setTargetY("")
      setTroopSelection({})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      {mode === "inactive" && (
        <Button onClick={() => setMode("coordinates")} className="w-full">
          Plan Attack
        </Button>
      )}

      {mode === "coordinates" && (
        <div className="space-y-4 p-3 border border-border rounded bg-secondary">
          <div>
            <label htmlFor="target-x" className="text-sm font-bold block mb-2">
              Target Coordinates
            </label>
            <div className="flex gap-2">
              <input
                id="target-x"
                type="number"
                placeholder="X"
                value={targetX}
                onChange={(e) => setTargetX(e.target.value)}
                className="flex-1 p-2 border border-border rounded bg-background"
              />
              <input
                id="target-y"
                type="number"
                placeholder="Y"
                value={targetY}
                onChange={(e) => setTargetY(e.target.value)}
                className="flex-1 p-2 border border-border rounded bg-background"
              />
            </div>
          </div>

          <div>
            <label htmlFor="attack-type" className="text-sm font-bold block mb-2">
              Attack Type
            </label>
            <select
              id="attack-type"
              value={attackType}
              onChange={(e) => setAttackType(e.target.value as AttackType)}
              className="w-full p-2 border border-border rounded bg-background"
            >
              <option value="RAID">Raid (steal resources)</option>
              <option value="CONQUEST">Conquest (take village)</option>
              <option value="SUPPRESSION">Suppression</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setMode("troops")} disabled={!targetX || !targetY} className="flex-1">
              Select Troops
            </Button>
            <Button variant="outline" onClick={() => setMode("inactive")} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "troops" && (
        <div className="space-y-4">
          <div className="p-3 border border-border rounded bg-secondary">
            <p className="font-bold">Target: ({targetX}, {targetY})</p>
            <p className="text-sm text-muted-foreground">Type: {attackType}</p>
          </div>

          <table className="w-full border-collapse border border-border">
            <thead>
              <tr>
                <th className="border border-border p-2 text-left bg-secondary">Troop Type</th>
                <th className="border border-border p-2 text-right bg-secondary">Available</th>
                <th className="border border-border p-2 text-right bg-secondary">Send</th>
              </tr>
            </thead>
            <tbody>
              {troops.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border border-border p-2 text-center text-muted-foreground">
                    No troops available
                  </td>
                </tr>
              ) : (
                troops.map((troop) => (
                  <tr key={troop.id}>
                    <td className="border border-border p-2">{troop.type}</td>
                    <td className="border border-border p-2 text-right font-mono">{troop.quantity.toLocaleString()}</td>
                    <td className="border border-border p-2">
                      <input
                        type="number"
                        min="0"
                        max={troop.quantity}
                        value={troopSelection[troop.id] || 0}
                        onChange={(e) => handleTroopChange(troop.id, Number.parseInt(e.target.value) || 0)}
                        className="w-full p-2 border border-border rounded bg-background text-foreground"
                        aria-label={`Send ${troop.type}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex gap-2">
            <Button
              onClick={handleLaunch}
              disabled={loading || Object.keys(troopSelection).length === 0}
              className="flex-1"
            >
              {loading ? "Launching..." : "Launch Attack"}
            </Button>
            <Button variant="outline" onClick={() => setMode("coordinates")} className="flex-1">
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
