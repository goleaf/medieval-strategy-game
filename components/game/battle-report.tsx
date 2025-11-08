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
    const summary = scoutingData?.summary
    const formatHours = (value?: number | null) => {
      if (value === null || value === undefined) return "—"
      if (value === 0) return "now"
      return `≈ ${value.toFixed(1)}h`
    }
    const formatBandOrLevel = (entry?: { level?: number; band?: { min: number; max: number } }) => {
      if (!entry) return "—"
      if (entry.level !== undefined) return entry.level
      if (entry.band) return `${entry.band.min}–${entry.band.max}`
      return "—"
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Scouting Report</h3>
        <div className="text-sm space-y-2">
          <div>Target: {attack.toVillage?.name || "Unknown"}</div>
          {summary ? (
            <>
              <div>Outcome: {summary.success ? "✅ Success" : "❌ Failed"} ({summary.band})</div>
              <div>
                Scouts sent: {summary.attackersSent} | Survived: {summary.attackersSurvived} | Defending scouts:{" "}
                {summary.defenderScouts}
              </div>
              <div>
                Ratio: {summary.ratio.toFixed(2)} | Fidelity: {summary.fidelity} | Tiers unlocked:{" "}
                {summary.unlockedTiers.length ? summary.unlockedTiers.join(", ") : "None"}
              </div>
            </>
          ) : (
            <div>Status: Pending</div>
          )}
          {scoutingData?.notes && <div className="text-xs text-yellow-600">{scoutingData.notes}</div>}
          {scoutingData?.metadata?.night && (
            <div className="text-xs text-muted-foreground">
              Night policy: {scoutingData.metadata.night.active ? "active" : "inactive"} (
              {scoutingData.metadata.night.mode}){" "}
              {scoutingData.metadata.night.windowLabel && `• window ${scoutingData.metadata.night.windowLabel}`}
            </div>
          )}
          {summary?.success && (
            <div className="mt-4 space-y-3">
              {scoutingData?.presence && (
                <div>
                  <h4 className="font-semibold">Presence & Loyalty</h4>
                  <div className="text-sm">
                    Occupied: {scoutingData.presence.occupied ? "Yes" : "No"}
                    {scoutingData.presence.playerName && <> • Player: {scoutingData.presence.playerName}</>}
                    {scoutingData.presence.tribe && <> • Tribe: {scoutingData.presence.tribe}</>}
                    <br />
                    Population: {scoutingData.presence.population.toLocaleString()} • Loyalty:{" "}
                    {scoutingData.presence.loyalty}
                  </div>
                </div>
              )}

              {scoutingData?.economy?.stocks && (
                <div>
                  <h4 className="font-semibold">Economy</h4>
                  <TextTable
                    headers={["Resource", "Amount/Band", "Capacity", "Time to full", "Time to empty"]}
                    rows={Object.entries(scoutingData.economy.stocks).map(([resource, entry]: [string, any]) => [
                      resource.toUpperCase(),
                      entry.amount !== undefined ? entry.amount.toLocaleString() : entry.band?.label ?? "—",
                      entry.capacity.toLocaleString(),
                      formatHours(entry.timeToFullHours),
                      formatHours(entry.timeToEmptyHours),
                    ])}
                  />
                </div>
              )}

              {scoutingData?.defenses && (
                <div>
                  <h4 className="font-semibold">Defenses</h4>
                  <div className="text-sm space-y-1">
                    {scoutingData.defenses.wall && (
                      <div>
                        Wall ({scoutingData.defenses.wall.type || "unknown"}):{" "}
                        {formatBandOrLevel(scoutingData.defenses.wall)}
                      </div>
                    )}
                    {scoutingData.defenses.watchtower && (
                      <div>Watchtower: {formatBandOrLevel(scoutingData.defenses.watchtower)}</div>
                    )}
                    {scoutingData.defenses.cranny && (
                      <div>
                        Cranny capacity: {scoutingData.defenses.cranny.totalCapacity.toLocaleString()} (count{" "}
                        {scoutingData.defenses.cranny.crannyCount})
                      </div>
                    )}
                  </div>
                </div>
              )}

              {scoutingData?.garrison && (
                <div>
                  <h4 className="font-semibold">Garrison</h4>
                  <div className="text-sm mb-2">
                    Hero present: {scoutingData.garrison.heroPresent ? "Yes" : "No"}
                  </div>
                  <TextTable
                    headers={["Class", "Count/Band"]}
                    rows={scoutingData.garrison.classes.map((cls: any) => [
                      cls.class,
                      cls.band ? cls.band.label : cls.count.toLocaleString(),
                    ])}
                  />
                  {scoutingData.garrison.units && (
                    <div className="mt-2">
                      <TextTable
                        headers={["Unit", "Quantity"]}
                        rows={scoutingData.garrison.units.map((unit: any) => [
                          unit.type,
                          unit.quantity.toLocaleString(),
                        ])}
                      />
                    </div>
                  )}
                </div>
              )}

              {scoutingData?.reinforcements?.entries?.length > 0 && (
                <div>
                  <h4 className="font-semibold">Reinforcements</h4>
                  <TextTable
                    headers={["Owner", "Total", "Breakdown"]}
                    rows={scoutingData.reinforcements.entries.map((entry: any) => [
                      entry.ownerName,
                      entry.total.toLocaleString(),
                      entry.classes.map((cls: any) =>
                        cls.band ? `${cls.class}: ${cls.band.label}` : `${cls.class}: ${cls.count.toLocaleString()}`,
                      ).join(", "),
                    ])}
                  />
                </div>
              )}

              {scoutingData?.infrastructure?.buildings?.length > 0 && (
                <div>
                  <h4 className="font-semibold">Infrastructure Snapshot</h4>
                  <TextTable
                    headers={["Building", "Level/Band"]}
                      rows={scoutingData.infrastructure.buildings.map((building: any) => [
                        building.type,
                        formatBandOrLevel(building),
                      ])}
                  />
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
