"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Sword, Check } from "lucide-react"
import type { TroopType, GameTribe } from "@prisma/client"
import { TextTable } from "./text-table"
import { TribeService } from "@/lib/game-services/tribe-service"
import { TroopService } from "@/lib/game-services/troop-service"

interface TroopTrainerProps {
  villageId: string
  tribe: GameTribe
  onTrain: (troopType: TroopType, quantity: number) => Promise<void>
}

// Helper function to format cost display
function formatCost(cost: Record<string, number>): string {
  const parts = []
  if (cost.wood) parts.push(`${cost.wood} 🪵`)
  if (cost.stone) parts.push(`${cost.stone} 🧱`)
  if (cost.iron) parts.push(`${cost.iron} ⛓`)
  if (cost.gold) parts.push(`${cost.gold} 🪙`)
  if (cost.food) parts.push(`${cost.food} 🌾`)
  return parts.join(", ")
}

// Helper function to format troop name
function formatTroopName(troopType: TroopType): string {
  return troopType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function TroopTrainer({ villageId, tribe, onTrain }: TroopTrainerProps) {
  // Get tribe-specific troops
  const tribeTroops = TribeService.getTribeTroops(tribe)

  // Generate troop types for display
  const troopTypes = tribeTroops.map(troopType => {
    const stats = TroopService.getTroopStats(troopType)
    return {
      type: troopType,
      name: formatTroopName(troopType),
      cost: formatCost(stats.cost)
    }
  })
  const [selected, setSelected] = useState<TroopType | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const troopInfo = selected ? troopTypes.find(t => t.type === selected) : null

  const handleTrain = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await onTrain(selected, quantity)
      setSelected(null)
      setQuantity(1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <TextTable
        headers={["Type", "Cost", "Action"]}
        rows={troopTypes.map((troop) => [
          troop.name,
          <span key={`cost-${troop.type}`} className="text-sm">{troop.cost}</span>,
          <button
            key={`action-${troop.type}`}
            onClick={() => setSelected(troop.type)}
            className={`px-2 py-1 border border-border rounded hover:bg-secondary text-sm flex items-center gap-1 ${
              selected === troop.type ? 'bg-primary/10 font-bold' : ''
            }`}
          >
            {selected === troop.type ? <Check className="w-3 h-3" /> : null}
            {selected === troop.type ? 'Selected' : 'Select'}
          </button>,
        ])}
      />

      {troopInfo && (
        <div className="p-3 border border-border rounded bg-secondary space-y-3">
          <div>
            <p className="font-bold">{troopInfo.name}</p>
            <p className="text-sm text-muted-foreground">Cost per unit: {troopInfo.cost}</p>
          </div>

          <div>
            <label htmlFor="quantity" className="text-sm font-bold block mb-2">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              max="1000"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full p-2 border border-border rounded bg-background text-foreground"
            />
          </div>

          <Button onClick={handleTrain} disabled={loading} className="w-full">
            <Sword className="w-4 h-4" />
            {loading ? 'Training...' : `Train ${quantity} ${troopInfo.name}`}
          </Button>
        </div>
      )}
    </div>
  )
}
