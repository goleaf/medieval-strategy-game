"use client"

import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import type { AttackType } from "@prisma/client"
import type { Troop } from "@prisma/client"
import { TextTable } from "./text-table"

interface AttackPlannerProps {
  villageId: string
  troops: Troop[]
  onLaunchAttack: (toX: number, toY: number, selection: Record<string, number>, type: AttackType) => Promise<void>
}

type Mode = "inactive" | "coordinates" | "troops"

export function AttackPlanner({ villageId, troops, onLaunchAttack }: AttackPlannerProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__attackLaunchHandler = onLaunchAttack
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__attackLaunchHandler
      }
    }
  }, [onLaunchAttack])

  return (
    <div
      x-data={`{
        mode: 'inactive',
        targetX: '',
        targetY: '',
        attackType: 'RAID',
        troopSelection: {},
        loading: false,
        handleTroopChange(troopId, value) {
          if (value <= 0) {
            delete this.troopSelection[troopId];
          } else {
            this.troopSelection[troopId] = value;
          }
        },
        async handleLaunch() {
          if (!this.targetX || !this.targetY || Object.keys(this.troopSelection).length === 0) return;
          this.loading = true;
          try {
            if (window.__attackLaunchHandler) {
              await window.__attackLaunchHandler(
                parseInt(this.targetX),
                parseInt(this.targetY),
                this.troopSelection,
                this.attackType
              );
              this.mode = 'inactive';
              this.targetX = '';
              this.targetY = '';
              this.troopSelection = {};
            }
          } catch (error) {
            console.error('Failed to launch attack:', error);
          } finally {
            this.loading = false;
          }
        }
      }`}
      className="w-full space-y-4"
    >
      <div x-show="mode === 'inactive'">
        <Button x-on:click="mode = 'coordinates'" className="w-full">
          Plan Attack
        </Button>
      </div>

      <div x-show="mode === 'coordinates'">
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
                x-model="targetX"
                className="flex-1 p-2 border border-border rounded bg-background"
              />
              <input
                id="target-y"
                type="number"
                placeholder="Y"
                x-model="targetY"
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
              x-model="attackType"
              className="w-full p-2 border border-border rounded bg-background"
            >
              <option value="RAID">Raid (steal resources)</option>
              <option value="CONQUEST">Conquest (take village)</option>
              <option value="SUPPRESSION">Suppression</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              x-on:click="mode = 'troops'"
              x-bind:disabled="!targetX || !targetY"
              className="flex-1"
            >
              Select Troops
            </Button>
            <Button x-on:click="mode = 'inactive'" variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <div x-show="mode === 'troops'">
        <div className="space-y-4">
          <div className="p-3 border border-border rounded bg-secondary">
            <p className="font-bold" x-text="`Target: (${targetX}, ${targetY})`" />
            <p className="text-sm text-muted-foreground" x-text="`Type: ${attackType}`" />
          </div>

          <TextTable
            headers={["Troop Type", "Available", "Send"]}
            rows={troops.length === 0 ? [] : troops.map((troop) => [
              troop.type,
              <span key={`available-${troop.id}`} className="font-mono text-right block">{troop.quantity.toLocaleString()}</span>,
              <input
                key={`input-${troop.id}`}
                type="number"
                min="0"
                max={troop.quantity}
                x-model.number={`troopSelection['${troop.id}']`}
                x-on:input={`handleTroopChange('${troop.id}', parseInt($event.target.value) || 0)`}
                className="w-full p-2 border border-border rounded bg-background text-foreground"
                aria-label={`Send ${troop.type}`}
              />,
            ])}
          />

          <div className="flex gap-2">
            <Button
              x-on:click="handleLaunch()"
              x-bind:disabled="loading || Object.keys(troopSelection).length === 0"
              className="flex-1"
            >
              <span x-show="loading">Launching...</span>
              <span x-show="!loading">Launch Attack</span>
            </Button>
            <Button x-on:click="mode = 'coordinates'" variant="outline" className="flex-1">
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
