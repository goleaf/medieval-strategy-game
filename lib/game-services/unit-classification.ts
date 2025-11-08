import type { UnitRole } from "@/lib/combat"
import type { TroopType } from "@prisma/client"

const TROOP_ROLE_MAP: Partial<Record<TroopType, UnitRole>> = {
  WARRIOR: "inf",
  SPEARMAN: "inf",
  BOWMAN: "inf",
  HORSEMAN: "cav",
  PALADIN: "cav",
  EAGLE_KNIGHT: "cav",
  RAM: "ram",
  CATAPULT: "catapult",
  KNIGHT: "cav",
  NOBLEMAN: "admin",
  BERSERKER: "inf",
  VALKYRIES_BLESSING: "cav",
  JARL: "inf",
  STEPPE_ARCHER: "cav",
  HUN_WARRIOR: "inf",
  LOGADES: "inf",
  LEGIONNAIRE: "inf",
  PRAETORIAN: "inf",
  IMPERIAN: "inf",
  SENATOR: "admin",
  NUBIAN: "inf",
  MUMMY: "inf",
  ANUBITE: "inf",
  PHARAOH: "inf",
  NOMARCH: "admin",
  CLUBSWINGER: "inf",
  SPEARMAN_TEUTONIC: "inf",
  AXEMAN: "inf",
  SCOUT: "scout",
  PALADIN_TEUTONIC: "cav",
  TEUTONIC_KNIGHT: "cav",
  CHIEF: "admin",
  SETTLER: "settler",
}

const DEFAULT_ROLE: UnitRole = "inf"

export function resolveUnitRole(type?: TroopType | string): UnitRole {
  if (!type) return DEFAULT_ROLE
  const normalized = type as TroopType
  return TROOP_ROLE_MAP[normalized] ?? DEFAULT_ROLE
}

export function isScoutUnit(type?: TroopType | string): boolean {
  if (!type) return false
  if (typeof type === "string" && type.toUpperCase().includes("SCOUT")) {
    return true
  }
  return resolveUnitRole(type) === "scout"
}
