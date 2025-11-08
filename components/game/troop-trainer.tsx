"use client"

import { useState } from "react"
import { Sword, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TextTable } from "@/components/game/text-table"
import { useToast } from "@/components/ui/use-toast"
import unitConfig from "@/config/unit-system.json"

interface TroopTrainerProps {
  villageId: string
  tribe: string
  onTrain: (unitTypeId: string, quantity: number) => Promise<void>
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

export function TroopTrainer({ villageId, onTrain }: TroopTrainerProps) {
  const { toast } = useToast()
  const [selected, setSelected] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const selectedUnit = selected ? DISPLAY_UNITS.find((unit) => unit.id === selected) : null

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
        rows={DISPLAY_UNITS.map((unit) => [
          unit.name,
          unit.role.toUpperCase(),
          <span key={`cost-${unit.id}`} className="text-sm">
            {unit.cost}
          </span>,
          <button
            key={`action-${unit.id}`}
            onClick={() => setSelected(unit.id)}
            className={`px-2 py-1 border border-border rounded hover:bg-secondary text-sm flex items-center gap-1 ${
              selected === unit.id ? "bg-primary/10 font-bold" : ""
            }`}
          >
            {selected === unit.id ? <Check className="w-3 h-3" /> : null}
            {selected === unit.id ? "Selected" : "Select"}
          </button>,
        ])}
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
        </div>
      )}
    </div>
  )
}
