export type UUID = string

export type MissionType = "attack" | "raid" | "reinforce" | "siege"
export type MovementMission = MissionType | "return"

export type UnitRole = "inf" | "cav" | "ram" | "catapult" | "admin" | "settler"

export interface UnitsComposition {
  [unitId: string]: number
}

export interface UnitStats {
  id: string
  name?: string
  role: UnitRole
  speed: number // tiles per hour
  carry: number
  attack: number
  defense: number
  siege?: "ram" | "catapult"
  isAdministrator?: boolean
}

export interface VillageRecord {
  id: string
  ownerAccountId: string
  allianceId?: string | null
  x: number
  y: number
  name?: string
  beginnerProtected?: boolean
}

export interface RallyPointState {
  villageId: string
  level: number
  waveWindowMs: number
  options: Record<string, unknown>
}

export type MissionTarget =
  | { type: "village"; villageId: string }
  | { type: "coords"; x: number; y: number; targetVillageId?: string }

export interface SendMissionInput {
  sourceVillageId: string
  sourceAccountId: string
  mission: MissionType
  target: MissionTarget
  units: UnitsComposition
  catapultTargets?: string[]
  arriveAt?: Date
  departAt?: Date
  idempotencyKey: UUID
  payload?: Record<string, unknown>
}

export interface WaveMemberInput extends Omit<SendMissionInput, "idempotencyKey"> {
  tag?: string
  waveMemberId?: string
}

export interface WaveGroupRequest {
  sourceVillageId: string
  sourceAccountId: string
  arriveAt: Date
  tag: string
  jitterMs?: number
  members: WaveMemberInput[]
  idempotencyKey: UUID
}

export interface RecallReinforcementsInput {
  fromVillageId: string
  toVillageId: string
  ownerAccountId: string
  units: UnitsComposition
  idempotencyKey: UUID
}

export interface GarrisonStack {
  villageId: string
  ownerAccountId: string
  unitTypeId: string
  count: number
}

export interface MovementPayload {
  units: UnitsComposition
  hero?: boolean
  catapultTargets?: string[]
  waveGroupId?: string
  waveMemberId?: string
  arriveWindowMs?: number
  jitterMs?: number
  metadata?: Record<string, unknown>
}

export interface MovementRecord {
  id: string
  mission: MovementMission
  ownerAccountId: string
  fromVillageId: string
  toVillageId: string | null
  toTileX: number
  toTileY: number
  departAt: Date
  arriveAt: Date
  payload: MovementPayload
  status: MovementStatus
  createdBy: MovementCreatedBy
  createdAt: Date
  updatedAt: Date
  idempotencyKey?: string
  waveGroupId?: string
  waveMemberId?: string
}

export type MovementStatus = "scheduled" | "en_route" | "resolved" | "returning" | "done" | "cancelled"
export type MovementCreatedBy = "player" | "route" | "system"

export interface WaveGroupRecord {
  id: string
  villageId: string
  tag: string
  arriveAt: Date
  jitterMs: number
  createdAt: Date
}

export interface WaveMemberRecord {
  id: string
  waveGroupId: string
  mission: MissionType
  targetVillageId: string | null
  targetX: number
  targetY: number
  units: UnitsComposition
  catapultTargets?: string[] | null
  idempotencyKey: string
  status: WaveMemberStatus
  arriveAt: Date
  departAt: Date
  createdAt: Date
}

export type WaveMemberStatus = "scheduled" | "sent" | "failed"

export interface CombatResolver {
  resolve(input: CombatResolutionInput): Promise<CombatResolution>
}

export interface CombatResolutionInput {
  mission: MissionType
  attackerVillageId: string
  defenderVillageId: string | null
  target: { x: number; y: number }
  attackerUnits: UnitsComposition
  defenderGarrisons: GarrisonStack[]
  wallType?: string
  wallLevel?: number
  rallyPointLevel: number
  catapultTargets: string[]
  timestamp: Date
}

export interface CombatResolution {
  attackerSurvivors: UnitsComposition
  defenderRemaining: GarrisonStack[]
  attackerCasualties: UnitsComposition
  defenderCasualties: GarrisonStack[]
  loot?: Record<string, number>
  wallDrop?: number
  buildingHits?: Array<{ target: string; drop: number }>
  loyaltyDrop?: number
}

export interface MovementResolutionResult {
  movement: MovementRecord
  report?: CombatResolution
  createdReturnMovementId?: string
}

export interface RallyPointEngineOptions {
  now?: () => Date
}

export interface MovementReportRecord {
  id: string
  movementId: string
  mission: MovementMission
  summary: Record<string, unknown>
  createdAt: Date
}

export interface SendMissionResult {
  movement: MovementRecord
  warnings: string[]
}

export interface WaveGroupResult {
  waveGroup: WaveGroupRecord
  members: WaveMemberRecord[]
  movements: MovementRecord[]
  warnings: string[]
}
