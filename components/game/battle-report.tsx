"use client"

import { TextTable } from "./text-table"

interface BattleReportProps {
  attack: {
    id: string
    type: string
    attackerWon: boolean | null
    lootWood: number
    lootStone: number
    lootIron: number
    lootGold: number
    lootFood: number
    fromVillage: { name: string; x: number; y: number }
    toVillage: { name: string; x: number; y: number } | null
    arrivalAt: string
    resolvedAt: string | null
    attackUnits: Array<{
      troop: { type: string; quantity: number }
      quantity: number
    }>
    defenseUnits?: Array<{
      troop: { type: string; quantity: number }
      quantity: number
    }>
    scoutingData?: string | null
  }
}

export function BattleReport({ attack }: BattleReportProps) {
  if (attack.type === "SCOUT") {
    const scoutingData = attack.scoutingData ? JSON.parse(attack.scoutingData) : null
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Scouting Report</h3>
        <div className="text-sm space-y-2">
          <div>Target: {attack.toVillage?.name || "Unknown"}</div>
          <div>Status: {attack.attackerWon ? "✅ Success" : "❌ Failed"}</div>
          {scoutingData && attack.attackerWon && (
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold">Revealed Information:</h4>
              {scoutingData.units && (
                <div>
                  <h5 className="font-semibold">Troops:</h5>
                  <TextTable
                    headers={["Type", "Quantity"]}
                    rows={scoutingData.units.map((u: any) => [u.type, u.quantity.toLocaleString()])}
                  />
                </div>
              )}
              {scoutingData.buildings && (
                <div>
                  <h5 className="font-semibold">Buildings:</h5>
                  <TextTable
                    headers={["Type", "Level"]}
                    rows={scoutingData.buildings.map((b: any) => [b.type, b.level.toString()])}
                  />
                </div>
              )}
              {scoutingData.storage && (
                <div>
                  <h5 className="font-semibold">Resources:</h5>
                  <div className="text-sm">
                    🪵 Wood: {scoutingData.storage.wood.toLocaleString()}
                    <br />
                    🧱 Stone: {scoutingData.storage.stone.toLocaleString()}
                    <br />
                    ⛓ Iron: {scoutingData.storage.iron.toLocaleString()}
                    <br />
                    🪙 Gold: {scoutingData.storage.gold.toLocaleString()}
                    <br />
                    🌾 Food: {scoutingData.storage.food.toLocaleString()}
                  </div>
                </div>
              )}
              {scoutingData.cranny && (
                <div>
                  <h5 className="font-semibold">Cranny Protection:</h5>
                  <div className="text-sm">
                    <div>🛡️ Cranny Count: {scoutingData.cranny.crannyCount}</div>
                    <div>🛡️ Total Capacity: {scoutingData.cranny.totalCapacity.toLocaleString()} per resource</div>
                    {scoutingData.cranny.tribeBonus && (
                      <div className="text-green-600">🎯 {scoutingData.cranny.tribeBonus}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Battle Report</h3>
      <div className="text-sm space-y-2">
        <div>
          <strong>Attack Type:</strong> {attack.type}
        </div>
        <div>
          <strong>From:</strong> {attack.fromVillage.name} ({attack.fromVillage.x}, {attack.fromVillage.y})
        </div>
        {attack.toVillage && (
          <div>
            <strong>To:</strong> {attack.toVillage.name} ({attack.toVillage.x}, {attack.toVillage.y})
          </div>
        )}
        <div>
          <strong>Result:</strong> {attack.attackerWon === null ? "Pending" : attack.attackerWon ? "✅ Victory" : "❌ Defeat"}
        </div>
        {attack.resolvedAt && (
          <div>
            <strong>Resolved:</strong> {new Date(attack.resolvedAt).toLocaleString()}
          </div>
        )}
      </div>

      {attack.attackUnits && attack.attackUnits.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Attacking Forces</h4>
          <TextTable
            headers={["Type", "Quantity"]}
            rows={attack.attackUnits.map((unit) => [
              unit.troop.type,
              unit.quantity.toLocaleString(),
            ])}
          />
        </div>
      )}

      {attack.defenseUnits && attack.defenseUnits.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Defending Forces</h4>
          <TextTable
            headers={["Type", "Quantity"]}
            rows={attack.defenseUnits.map((unit) => [
              unit.troop.type,
              unit.quantity.toLocaleString(),
            ])}
          />
        </div>
      )}

      {attack.attackerWon && (
        <div>
          <h4 className="font-semibold mb-2">Loot Gained</h4>
          <div className="text-sm space-y-1">
            {attack.lootWood > 0 && <div>🪵 Wood: {attack.lootWood.toLocaleString()}</div>}
            {attack.lootStone > 0 && <div>🧱 Stone: {attack.lootStone.toLocaleString()}</div>}
            {attack.lootIron > 0 && <div>⛓ Iron: {attack.lootIron.toLocaleString()}</div>}
            {attack.lootGold > 0 && <div>🪙 Gold: {attack.lootGold.toLocaleString()}</div>}
            {attack.lootFood > 0 && <div>🌾 Food: {attack.lootFood.toLocaleString()}</div>}
            {attack.lootWood === 0 && attack.lootStone === 0 && attack.lootIron === 0 && attack.lootGold === 0 && attack.lootFood === 0 && (
              <div className="text-muted-foreground">No resources looted</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
