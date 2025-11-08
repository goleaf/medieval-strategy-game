import type {
  GarrisonStack,
  MovementRecord,
  MovementReportRecord,
  RallyPointState,
  TrapPrisonerCreateInput,
  TrapPrisonerRecord,
  VillageRecord,
  WaveGroupRecord,
  WaveMemberRecord,
} from "./types"
import type { VillageSiegeSnapshot } from "@/lib/combat/catapult/types"

export interface RallyPointTransaction {
  getVillageById(id: string): Promise<VillageRecord | null>
  getVillageByCoords(x: number, y: number): Promise<VillageRecord | null>
  getRallyPoint(villageId: string): Promise<RallyPointState | null>
  upsertRallyPoint(state: RallyPointState): Promise<RallyPointState>
  getOwnerGarrison(villageId: string, ownerAccountId: string): Promise<GarrisonStack[]>
  setOwnerGarrisonUnit(villageId: string, ownerAccountId: string, unitTypeId: string, count: number): Promise<void>
  getAllGarrisons(villageId: string): Promise<GarrisonStack[]>
  createMovement(record: MovementRecord): Promise<MovementRecord>
  updateMovement(movementId: string, changes: Partial<MovementRecord>): Promise<MovementRecord | null>
  findMovementById(id: string): Promise<MovementRecord | null>
  findMovementsByIdempotency(key: string): Promise<MovementRecord[]>
  createWaveGroup(group: WaveGroupRecord, members: WaveMemberRecord[]): Promise<{ group: WaveGroupRecord; members: WaveMemberRecord[] }>
  listWaveMembersByGroup(groupId: string): Promise<WaveMemberRecord[]>
  updateWaveMember(memberId: string, changes: Partial<WaveMemberRecord>): Promise<void>
  saveBattleReport(report: MovementReportRecord): Promise<void>
  getVillageSiegeSnapshot(villageId: string): Promise<VillageSiegeSnapshot | null>
  updateBuildingLevel(buildingId: string, level: number): Promise<void>
  updateResourceFieldLevel(fieldId: string, level: number): Promise<void>
  listActiveTrapPrisoners(villageId: string): Promise<TrapPrisonerRecord[]>
  createTrapPrisoners(records: TrapPrisonerCreateInput[]): Promise<void>
  updateTrapPrisonerCount(prisonerId: string, count: number): Promise<void>
  deleteTrapPrisoner(prisonerId: string): Promise<void>
}

export interface DueMovementFilter {
  beforeOrEqual: Date
  limit?: number
}

export interface RallyPointRepository {
  withTransaction<T>(handler: (transaction: RallyPointTransaction) => Promise<T>): Promise<T>
  listDueMovements(filter: DueMovementFilter): Promise<MovementRecord[]>
}
