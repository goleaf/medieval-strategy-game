import { getTroopSystemConfig } from "@/lib/troop-system/config"
import type { UnitRole, UnitStats } from "./types"

export function buildUnitCatalog(): Record<string, UnitStats> {
  const config = getTroopSystemConfig()
  const catalog: Record<string, UnitStats> = {}

  for (const [unitId, definition] of Object.entries(config.units)) {
    const role = definition.role as UnitRole
    catalog[unitId] = {
      id: unitId,
      role,
      speed: definition.speedTilesPerHour,
      carry: definition.carry,
      attack: definition.attack,
      defense: definition.defInf,
      defInf: definition.defInf,
      defCav: definition.defCav,
      siege: role === "ram" ? "ram" : role === "catapult" ? "catapult" : undefined,
      isAdministrator: role === "admin",
    }
  }

  return catalog
}
