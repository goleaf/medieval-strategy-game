"use client"

import { Button } from "@/components/ui/button"
import { useEffect } from "react"
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
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__troopTrainHandler = onTrain
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__troopTrainHandler
      }
    }
  }, [onTrain])

  return (
    <div
      x-data={`{
        selected: null,
        quantity: 1,
        loading: false,
        troopTypes: ${JSON.stringify(TROOP_TYPES)},
        get troopInfo() {
          return this.selected ? this.troopTypes.find(t => t.type === this.selected) : null;
        },
        async handleTrain() {
          if (!this.selected) return;
          this.loading = true;
          try {
            if (window.__troopTrainHandler) {
              await window.__troopTrainHandler(this.selected, this.quantity);
            }
            this.selected = null;
            this.quantity = 1;
          } finally {
            this.loading = false;
          }
        }
      }`}
      className="w-full space-y-4"
    >
      <TextTable
        headers={["Type", "Cost", "Action"]}
        rows={TROOP_TYPES.map((troop) => [
          troop.name,
          <span key={`cost-${troop.type}`} className="text-sm">{troop.cost}</span>,
          <button
            key={`action-${troop.type}`}
            x-on:click={`selected = '${troop.type}'`}
            x-bind:class={`selected === '${troop.type}' ? 'bg-primary/10 font-bold' : ''`}
            className="px-2 py-1 border border-border rounded hover:bg-secondary text-sm"
          >
            <span x-show={`selected === '${troop.type}'`}>Selected</span>
            <span x-show={`selected !== '${troop.type}'`}>Select</span>
          </button>,
        ])}
      />

      <div x-show="troopInfo">
        <div className="p-3 border border-border rounded bg-secondary space-y-3">
          <div>
            <p className="font-bold" x-text="troopInfo.name" />
            <p className="text-sm text-muted-foreground" x-text="`Cost per unit: ${troopInfo.cost}`" />
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
              x-model.number="quantity"
              className="w-full p-2 border border-border rounded bg-background text-foreground"
            />
          </div>

          <Button x-on:click="handleTrain()" x-bind:disabled="loading" className="w-full">
            <span x-text="loading ? 'Training...' : `Train ${quantity} ${troopInfo.name}`" />
          </Button>
        </div>
      </div>
    </div>
  )
}
