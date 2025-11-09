"use client"

import React, { useState } from "react"
import { Sword, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TextTable } from "@/components/game/text-table"
import { useToast } from "@/components/ui/use-toast"
import unitConfig from "@/config/unit-system.json"

interface TroopTrainerProps {
  villageId: string
  tribe: string
  onTrain: (unitTypeId: string, quantity: number) => Promise<void>
  playerId?: string | null
}

type ConfigUnit = (typeof unitConfig)["units"][string]

function formatCost(definition: ConfigUnit): string {
  const { cost } = definition
  const parts: string[] = []
  if (cost.wood) parts.push(`${cost.wood} 🪵`)
  if (cost.clay) parts.push(`${cost.clay} 🧱`)
  if (cost.iron) parts.push(`${cost.iron} ⛓`)
  if (cost.crop) parts.push(`${cost.crop} 🌾`)
  return parts.join(", ")
}

function formatName(unitId: string): string {
  return unitId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

interface DisplayUnit {
  id: string
  name: string
  role: string
  cost: string
}

const DISPLAY_UNITS: DisplayUnit[] = Object.entries(unitConfig.units).map(([unitId, definition]) => ({
  id: unitId,
  name: definition.displayName ?? formatName(unitId),
  role: definition.role,
  cost: formatCost(definition),
}))

export function TroopTrainer({ villageId, onTrain, playerId }: TroopTrainerProps) {
  const { toast } = useToast()
  const [selected, setSelected] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [unlockedTech, setUnlockedTech] = useState<Set<string>>(new Set())

  const selectedUnit = selected ? DISPLAY_UNITS.find((unit) => unit.id === selected) : null

  // Map units to technology keys required
  const TECH_UNLOCKS: Record<string, string> = {
    scout: "UNIT_SCOUT",
    ram: "UNIT_RAM",
    catapult: "UNIT_CATAPULT",
    admin: "UNIT_NOBLE",
    paladin: "SYSTEM_PALADIN",
  }

  const isUnitUnlocked = (unitId: string): boolean => {
    const key = TECH_UNLOCKS[unitId]
    if (!key) return true
    return unlockedTech.has(key)
  }

  // Load completed techs to preemptively gate UI
  React.useEffect(() => {
    let cancelled = false
    async function loadTech() {
      if (!playerId) return
      try {
        const res = await fetch(`/api/villages/${villageId}/tech-tree?playerId=${playerId}`)
        const data = await res.json()
        if (!res.ok) return
        const set = new Set<string>()
        for (const node of data.data as Array<{ key: string; status: string }>) {
          if (node.status === "COMPLETED") set.add(node.key)
        }
        if (!cancelled) setUnlockedTech(set)
      } catch {}
    }
    loadTech()
    return () => {
      cancelled = true
    }
  }, [playerId, villageId])

  const handleTrain = async () => {
    if (!selectedUnit) return
    setLoading(true)
    try {
      const response = await fetch("/api/troops/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId,
          troopType: selectedUnit.id,
          quantity,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to queue training")
      }
      await onTrain(selectedUnit.id, quantity)
      toast({
        title: "Training queued",
        description: `${quantity} ${selectedUnit.name} added to the queue.`,
      })
      setSelected(null)
      setQuantity(1)
    } catch (error) {
      toast({
        title: "Unable to queue training",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <TextTable
        headers={["Type", "Role", "Cost", "Action"]}
        rows={DISPLAY_UNITS.map((unit) => {
          const requiredKey = TECH_UNLOCKS[unit.id]
          const unlocked = isUnitUnlocked(unit.id)
          return [
            unit.name,
            unit.role.toUpperCase(),
            <span key={`cost-${unit.id}`} className="text-sm">
              {unit.cost}
            </span>,
            <div key={`action-${unit.id}`} className="flex flex-col items-start gap-1">
              <button
                onClick={() => unlocked && setSelected(unit.id)}
                className={`px-2 py-1 border border-border rounded hover:bg-secondary text-sm flex items-center gap-1 ${
                  selected === unit.id ? "bg-primary/10 font-bold" : ""
                }`}
                disabled={!unlocked}
                title={!unlocked && requiredKey ? `Locked — requires ${requiredKey}` : undefined}
              >
                {selected === unit.id ? <Check className="w-3 h-3" /> : null}
                {unlocked ? (selected === unit.id ? "Selected" : "Select") : "Locked"}
              </button>
              {!unlocked && requiredKey && (
                <span className="text-[11px] text-red-300">Requires {requiredKey}</span>
              )}
            </div>,
          ]
        })}
      />

      {selectedUnit && (
        <div className="p-3 border border-border rounded bg-secondary space-y-3">
          <div>
            <p className="font-bold">{selectedUnit.name}</p>
            <p className="text-sm text-muted-foreground">Cost per unit: {selectedUnit.cost}</p>
          </div>

          <div>
            <label htmlFor="quantity" className="text-sm font-bold block mb-2">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              max="10000"
              value={quantity}
              onChange={(e) => setQuantity(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 1)}
              className="w-full p-2 border border-border rounded bg-background text-foreground"
            />
          </div>

          <Button onClick={handleTrain} disabled={loading} className="w-full">
            <Sword className="w-4 h-4" />
            {loading ? "Training..." : `Train ${quantity} ${selectedUnit.name}`}
          </Button>
          {!isUnitUnlocked(selectedUnit.id) && (
            <p className="mt-2 text-xs text-red-300">
              This unit is locked. Research {TECH_UNLOCKS[selectedUnit.id] ?? "the required technology"} in the <a className="underline" href={`/village/${villageId}/academy${playerId ? `?playerId=${playerId}` : ''}`}>Academy</a>.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
