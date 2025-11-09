import type { CombatResolution, MovementMission, UnitRole } from "@/lib/rally-point/types"
import type { ScoutingReportPayload } from "@/lib/game-services/scouting-service"

export type Direction = "sent" | "received"

export type Perspective = "attacker" | "defender"

export type Outcome = "attacker_victory" | "defender_victory" | "mutual_loss" | "unknown"

export interface ParticipantSummary {
  playerId?: string | null
  playerName?: string | null
  tribeTag?: string | null
  villageId?: string | null
  villageName?: string | null
  x?: number | null
  y?: number | null
}

export interface CombatReportListItem {
  id: string
  mission: MovementMission
  createdAt: string
  expiresAt: string
  direction: Direction
  perspective: Perspective
  outcome: Outcome
  subject: string
  attacker: ParticipantSummary
  defender: ParticipantSummary
  losses: { attacker: number; defender: number }
  tags: string[]
  isNew: boolean
  luck?: number
  morale?: number
  wallDrop?: number | null
  movementId: string
}

export interface SupportStackSummary {
  villageId: string
  villageName: string | null
  villageOwner: string | null
  ownerAccountId: string
  ownerName: string | null
  unitTypeId: string
  unitName: string
  count: number
  role: UnitRole | "unknown"
}

export interface SupportStatusPayload {
  stationedAbroad: SupportStackSummary[]
  supportReceived: Array<{
    villageId: string
    villageName: string | null
    totalTroops: number
    contributors: Array<{ ownerAccountId: string; ownerName: string | null; totalUnits: number }>
  }>
  returningMissions: Array<{
    movementId: string
    mission: MovementMission
    toVillageId: string | null
    toVillageName: string | null
    arriveAt: string
    units: Record<string, number>
  }>
}

export interface CombatReportDetail extends CombatReportListItem {
  summary: CombatResolution | null
  context: {
    totalCarryCapacity: number
    loot?: Record<string, number> | null
    attackerBefore: Record<string, number>
    attackerAfter: Record<string, number>
    defenderBefore: Record<string, number>
    defenderAfter: Record<string, number>
    defenderSupport: Record<
      string,
      {
        ownerAccountId: string
        ownerName?: string | null
        tribeTag?: string | null
        totals: Record<string, number>
      }
    >
    wall?: { before: number | null; after: number | null; drop: number | null; type?: string }
    loyalty?: { before?: number | null; after?: number | null; delta?: number | null }
    catapult?: CombatResolution["catapultDamage"]
    trap?: CombatResolution["trap"]
  }
}

export type ScoutReliability = "full" | "partial" | "failed"

export interface ScoutIntelReport {
  id: string
  attackId: string
  resolvedAt: string
  expiresAt: string
  reliability: ScoutReliability
  ratio: number
  attacker: ParticipantSummary
  defender: ParticipantSummary & { coordsLabel?: string }
  summary: {
    troopCount?: number | null
    resourceTotal?: number | null
    wallLevel?: number | null
  }
  deltas: {
    troopCount?: number | null
    resourceTotal?: number | null
    wallLevel?: number | null
  }
  actionSuggestion: string
  payload?: ScoutingReportPayload | null
  superseded: boolean
}
