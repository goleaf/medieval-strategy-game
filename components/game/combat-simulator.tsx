"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextTable } from "./text-table"
import { Swords, Target, Shield, Calculator, RotateCcw } from "lucide-react"
import type { AttackType } from "@prisma/client"

interface TroopInput {
  type: string
  quantity: number
}

interface SimulationResult {
  attackerWon: boolean
  attackerCasualties: Record<string, number>
  defenderCasualties: Record<string, number>
  lootWood: number
  lootStone: number
  lootIron: number
  lootGold: number
  lootFood: number
  wallDamage?: number
  attackerOffense: number
  defenderDefense: number
  carryCapacity: number
}

interface DefenderResources {
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
}

// Available troop types for simulation
const TROOP_TYPES = [
  "WARRIOR", "SPEARMAN", "BOWMAN", "HORSEMAN", "PALADIN", "EAGLE_KNIGHT",
  "RAM", "CATAPULT", "KNIGHT", "NOBLEMAN",
  // Viking units
  "BERSERKER", "VALKYRIES_BLESSING", "JARL",
  // Roman units
  "LEGIONNAIRE", "PRAETORIAN", "IMPERIAN", "SENATOR",
  // Teutonic units
  "CLUBSWINGER", "SPEARMAN_TEUTONIC", "AXEMAN", "SCOUT", "PALADIN_TEUTONIC", "TEUTONIC_KNIGHT", "CHIEF"
]

export function CombatSimulator() {
  const [attackType, setAttackType] = useState<AttackType>("RAID")
  const [wallLevel, setWallLevel] = useState(0)
  const [heroBonus, setHeroBonus] = useState(0)

  const [attackerTroops, setAttackerTroops] = useState<TroopInput[]>(
    TROOP_TYPES.map(type => ({ type, quantity: 0 }))
  )
  const [defenderTroops, setDefenderTroops] = useState<TroopInput[]>(
    TROOP_TYPES.map(type => ({ type, quantity: 0 }))
  )

  const [defenderResources, setDefenderResources] = useState<DefenderResources>({
    wood: 1000,
    stone: 1000,
    iron: 1000,
    gold: 1000,
    food: 1000,
  })

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const updateTroopQuantity = (
    side: "attacker" | "defender",
    type: string,
    quantity: number
  ) => {
    const setter = side === "attacker" ? setAttackerTroops : setDefenderTroops
    setter(prev => prev.map(troop =>
      troop.type === type ? { ...troop, quantity: Math.max(0, quantity) } : troop
    ))
  }

  const runSimulation = async () => {
    setLoading(true)
    try {
      const payload = {
        attackType,
        attackerTroops: attackerTroops.filter(t => t.quantity > 0),
        defenderTroops: defenderTroops.filter(t => t.quantity > 0),
        wallLevel,
        heroBonus,
        defenderResources,
      }

      const response = await fetch("/api/combat/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (result.success) {
        setSimulationResult(result.data)
      } else {
        console.error("Simulation failed:", result.error)
      }
    } catch (error) {
      console.error("Failed to run simulation:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetSimulator = () => {
    setAttackerTroops(TROOP_TYPES.map(type => ({ type, quantity: 0 })))
    setDefenderTroops(TROOP_TYPES.map(type => ({ type, quantity: 0 })))
    setSimulationResult(null)
    setWallLevel(0)
    setHeroBonus(0)
    setDefenderResources({
      wood: 1000,
      stone: 1000,
      iron: 1000,
      gold: 1000,
      food: 1000,
    })
  }

  const renderTroopInputs = (side: "attacker" | "defender", troops: TroopInput[]) => (
    <div className="space-y-2">
      {troops.map((troop) => (
        <div key={`${side}-${troop.type}`} className="flex items-center gap-2">
          <Label htmlFor={`${side}-${troop.type}`} className="w-32 text-sm">
            {troop.type.replace(/_/g, " ")}
          </Label>
          <Input
            id={`${side}-${troop.type}`}
            type="number"
            min="0"
            value={troop.quantity}
            onChange={(e) => updateTroopQuantity(side, troop.type, parseInt(e.target.value) || 0)}
            className="flex-1"
            placeholder="0"
          />
        </div>
      ))}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Combat Simulator
        </h2>
        <Button onClick={resetSimulator} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="results" disabled={!simulationResult}>Results</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attack Configuration */}
            <div className="space-y-4">
              <div className="p-3 border border-border rounded bg-secondary">
                <h3 className="font-bold flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" />
                  Attack Setup
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="attack-type">Attack Type</Label>
                    <select
                      id="attack-type"
                      value={attackType}
                      onChange={(e) => setAttackType(e.target.value as AttackType)}
                      className="w-full p-2 border border-border rounded bg-background mt-1"
                    >
                      <option value="RAID">Raid (steal resources)</option>
                      <option value="CONQUEST">Conquest (take village)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="wall-level">Defender Wall Level</Label>
                    <Input
                      id="wall-level"
                      type="number"
                      min="0"
                      max="20"
                      value={wallLevel}
                      onChange={(e) => setWallLevel(parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hero-bonus">Hero Bonus (%)</Label>
                    <Input
                      id="hero-bonus"
                      type="number"
                      min="0"
                      max="100"
                      value={heroBonus}
                      onChange={(e) => setHeroBonus(parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Defender Resources */}
              <div className="p-3 border border-border rounded bg-secondary">
                <h3 className="font-bold mb-3">Defender Resources</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(defenderResources).map(([resource, amount]) => (
                    <div key={resource}>
                      <Label htmlFor={`resource-${resource}`} className="text-sm capitalize">
                        {resource}
                      </Label>
                      <Input
                        id={`resource-${resource}`}
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(e) => setDefenderResources(prev => ({
                          ...prev,
                          [resource]: parseInt(e.target.value) || 0
                        }))}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Troop Inputs */}
            <div className="space-y-4">
              <div className="p-3 border border-border rounded bg-secondary">
                <h3 className="font-bold flex items-center gap-2 mb-3">
                  <Swords className="w-4 h-4" />
                  Attacker Troops
                </h3>
                {renderTroopInputs("attacker", attackerTroops)}
              </div>

              <div className="p-3 border border-border rounded bg-secondary">
                <h3 className="font-bold flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4" />
                  Defender Troops
                </h3>
                {renderTroopInputs("defender", defenderTroops)}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={runSimulation} disabled={loading} size="lg">
              <Calculator className="w-4 h-4 mr-2" />
              {loading ? "Simulating..." : "Run Simulation"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4">
          {simulationResult ? (
            <div className="space-y-4">
              <div className="p-4 border border-border rounded bg-secondary">
                <h3 className="font-bold text-lg mb-2">
                  Battle Result: {simulationResult.attackerWon ? "Attacker Wins" : "Defender Wins"}
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Attacker Offense:</strong> {simulationResult.attackerOffense.toLocaleString()}</p>
                    <p><strong>Carry Capacity:</strong> {simulationResult.carryCapacity.toLocaleString()}</p>
                  </div>
                  <div>
                    <p><strong>Defender Defense:</strong> {simulationResult.defenderDefense.toLocaleString()}</p>
                    {simulationResult.wallDamage && (
                      <p><strong>Wall Damage:</strong> {simulationResult.wallDamage} levels</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border border-border rounded bg-secondary">
                  <h4 className="font-bold mb-2">Attacker Casualties</h4>
                  <TextTable
                    headers={["Troop Type", "Lost"]}
                    rows={Object.entries(simulationResult.attackerCasualties).map(([id, casualties]) => [
                      id.replace(/^attacker-/, "").replace(/-\d+$/, "").replace(/_/g, " "),
                      <span key={id} className="text-red-500 font-mono">{casualties.toLocaleString()}</span>
                    ])}
                  />
                </div>

                <div className="p-3 border border-border rounded bg-secondary">
                  <h4 className="font-bold mb-2">Defender Casualties</h4>
                  <TextTable
                    headers={["Troop Type", "Lost"]}
                    rows={Object.entries(simulationResult.defenderCasualties).map(([id, casualties]) => [
                      id.replace(/^defender-/, "").replace(/-\d+$/, "").replace(/_/g, " "),
                      <span key={id} className="text-red-500 font-mono">{casualties.toLocaleString()}</span>
                    ])}
                  />
                </div>
              </div>

              {simulationResult.attackerWon && (
                <div className="p-3 border border-border rounded bg-secondary">
                  <h4 className="font-bold mb-2">Loot Captured</h4>
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Wood</p>
                      <p className="font-bold text-green-600">{simulationResult.lootWood.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stone</p>
                      <p className="font-bold text-green-600">{simulationResult.lootStone.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Iron</p>
                      <p className="font-bold text-green-600">{simulationResult.lootIron.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gold</p>
                      <p className="font-bold text-green-600">{simulationResult.lootGold.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Food</p>
                      <p className="font-bold text-green-600">{simulationResult.lootFood.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Run a simulation to see the results here
            </div>
          )}
        </TabsContent>

        <TabsContent value="results">
          {/* This tab is just a duplicate of simulation for now */}
          <div className="text-center py-8 text-muted-foreground">
            Switch to the Simulation tab to view results
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}


