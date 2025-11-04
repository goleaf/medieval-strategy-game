"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { TroopType } from "@prisma/client"
import { TextTable } from "./text-table"

interface TroopTrainerProps {
  villageId: string
  onTrain: (troopType: TroopType, quantity: number) => Promise<void>
}

const TROOP_TYPES: { type: TroopType; name: string; cost: string }[] = [
  { type: "WARRIOR", name: "Warrior", cost: "100 🪵, 50 🧱, 20 ⛓, 200 🌾" },
  { type: "SPEARMAN", name: "Spearman", cost: "120 🪵, 60 🧱, 25 ⛓, 220 🌾" },
  { type: "BOWMAN", name: "Bowman", cost: "80 🪵, 40 🧱, 30 ⛓, 180 🌾" },
  { type: "HORSEMAN", name: "Horseman", cost: "150 🪵, 100 🧱, 50 ⛓, 300 🌾" },
  { type: "PALADIN", name: "Paladin", cost: "200 🪵, 150 🧱, 100 ⛓, 400 🌾" },
  { type: "RAM", name: "Ram", cost: "300 🪵, 200 🧱, 50 ⛓, 100 🌾" },
  { type: "CATAPULT", name: "Catapult", cost: "400 🪵, 300 🧱, 150 ⛓, 200 🌾" },
]

export function TroopTrainer({ villageId, onTrain }: TroopTrainerProps) {
  const [selected, setSelected] = useState<TroopType | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const troopInfo = selected ? TROOP_TYPES.find((t) => t.type === selected) : null

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
        rows={TROOP_TYPES.map((troop) => [
          troop.name,
          <span key={`cost-${troop.type}`} className="text-sm">{troop.cost}</span>,
          <button
            key={`action-${troop.type}`}
            onClick={() => setSelected(troop.type)}
            className={`px-2 py-1 border border-border rounded hover:bg-secondary text-sm ${
              selected === troop.type ? "bg-primary/10 font-bold" : ""
            }`}
          >
            {selected === troop.type ? "Selected" : "Select"}
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
              onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
              className="w-full p-2 border border-border rounded bg-background text-foreground"
            />
          </div>

          <Button onClick={handleTrain} disabled={loading} className="w-full">
            {loading ? "Training..." : `Train ${quantity} ${troopInfo.name}`}
          </Button>
        </div>
      )}
    </div>
  )
}
