import { randomUUID } from "node:crypto"

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
} from "../types"
import type { DueMovementFilter, RallyPointRepository, RallyPointTransaction } from "../repository"
import type { VillageSiegeSnapshot } from "@/lib/combat/catapult/types"

interface StateSnapshot {
  villages: Map<string, VillageRecord>
  rallyPoints: Map<string, RallyPointState>
  garrisons: Map<string, GarrisonStack>
  movements: Map<string, MovementRecord>
  waveGroups: Map<string, WaveGroupRecord>
  waveMembers: Map<string, WaveMemberRecord>
  reports: Map<string, MovementReportRecord>
  trapPrisoners: Map<string, TrapPrisonerRecord>
}

function keyForGarrison(villageId: string, ownerAccountId: string, unitTypeId: string) {
  return `${villageId}:${ownerAccountId}:${unitTypeId}`
}

function cloneState(source: StateSnapshot): StateSnapshot {
  const cloneDate = (value: Date) => new Date(value.getTime())
  const cloneMovement = (movement: MovementRecord): MovementRecord => ({
    ...movement,
    departAt: cloneDate(movement.departAt),
    arriveAt: cloneDate(movement.arriveAt),
    createdAt: cloneDate(movement.createdAt),
    updatedAt: cloneDate(movement.updatedAt),
    payload: {
      ...movement.payload,
      units: { ...movement.payload.units },
      catapultTargets: movement.payload.catapultTargets ? [...movement.payload.catapultTargets] : undefined,
      techLevels: movement.payload.techLevels
        ? Object.fromEntries(Object.entries(movement.payload.techLevels).map(([unit, levels]) => [unit, { ...levels }]))
        : undefined,
      metadata: movement.payload.metadata ? { ...movement.payload.metadata } : undefined,
    },
  })

  return {
    villages: new Map([...source.villages].map(([id, village]) => [id, { ...village }])),
    rallyPoints: new Map([...source.rallyPoints].map(([id, rp]) => [id, { ...rp, options: { ...rp.options } }])),
    garrisons: new Map(
      [...source.garrisons].map(([key, stack]) => [key, { ...stack }]),
    ),
    movements: new Map([...source.movements].map(([id, mv]) => [id, cloneMovement(mv)])),
    waveGroups: new Map([...source.waveGroups].map(([id, group]) => [id, { ...group, arriveAt: cloneDate(group.arriveAt), createdAt: cloneDate(group.createdAt) }])),
    waveMembers: new Map(
      [...source.waveMembers].map(([id, member]) => [id, { ...member, arriveAt: cloneDate(member.arriveAt), departAt: cloneDate(member.departAt), createdAt: cloneDate(member.createdAt), units: { ...member.units }, catapultTargets: member.catapultTargets ? [...member.catapultTargets] : undefined }]),
    ),
    reports: new Map([...source.reports].map(([id, report]) => [id, { ...report, createdAt: cloneDate(report.createdAt), summary: { ...report.summary } }])),
    trapPrisoners: new Map(
      [...source.trapPrisoners].map(([id, prisoner]) => [
        id,
        { ...prisoner, capturedAt: cloneDate(prisoner.capturedAt) },
      ]),
    ),
  }
}

class InMemoryTransaction implements RallyPointTransaction {
  constructor(private readonly state: StateSnapshot) {}

  async getVillageById(id: string) {
    return this.state.villages.get(id) ?? null
  }

  async getVillageByCoords(x: number, y: number) {
    for (const village of this.state.villages.values()) {
      if (village.x === x && village.y === y) {
        return village
      }
    }
    return null
  }

  async getRallyPoint(villageId: string) {
    return this.state.rallyPoints.get(villageId) ?? null
  }

  async upsertRallyPoint(state: RallyPointState) {
    this.state.rallyPoints.set(state.villageId, { ...state, options: { ...state.options } })
    return state
  }

  async getOwnerGarrison(villageId: string, ownerAccountId: string) {
    const stacks: GarrisonStack[] = []
    for (const stack of this.state.garrisons.values()) {
      if (stack.villageId === villageId && stack.ownerAccountId === ownerAccountId) {
        stacks.push({ ...stack })
      }
    }
    return stacks
  }

  async setOwnerGarrisonUnit(villageId: string, ownerAccountId: string, unitTypeId: string, count: number) {
    const key = keyForGarrison(villageId, ownerAccountId, unitTypeId)
    if (count <= 0) {
      this.state.garrisons.delete(key)
    } else {
      this.state.garrisons.set(key, { villageId, ownerAccountId, unitTypeId, count })
    }
  }

  async getAllGarrisons(villageId: string) {
    const stacks: GarrisonStack[] = []
    for (const stack of this.state.garrisons.values()) {
      if (stack.villageId === villageId) {
        stacks.push({ ...stack })
      }
    }
    return stacks
  }

  async createMovement(record: MovementRecord) {
    this.state.movements.set(record.id, record)
    return record
  }

  async updateMovement(movementId: string, changes: Partial<MovementRecord>) {
    const movement = this.state.movements.get(movementId)
    if (!movement) return null
    const updated: MovementRecord = {
      ...movement,
      ...changes,
      payload: changes.payload ? { ...movement.payload, ...changes.payload } : movement.payload,
    }
    this.state.movements.set(movementId, updated)
    return updated
  }

  async findMovementById(id: string) {
    return this.state.movements.get(id) ?? null
  }

  async findMovementsByIdempotency(key: string) {
    const matches: MovementRecord[] = []
    for (const movement of this.state.movements.values()) {
      if (movement.idempotencyKey === key) {
        matches.push(movement)
      }
    }
    return matches
  }

  async createWaveGroup(group: WaveGroupRecord, members: WaveMemberRecord[]) {
    this.state.waveGroups.set(group.id, group)
    for (const member of members) {
      this.state.waveMembers.set(member.id, member)
    }
    return { group, members }
  }

  async listWaveMembersByGroup(groupId: string) {
    const members: WaveMemberRecord[] = []
    for (const member of this.state.waveMembers.values()) {
      if (member.waveGroupId === groupId) {
        members.push(member)
      }
    }
    return members
  }

  async updateWaveMember(memberId: string, changes: Partial<WaveMemberRecord>) {
    const member = this.state.waveMembers.get(memberId)
    if (!member) return
    this.state.waveMembers.set(memberId, { ...member, ...changes })
  }

  async saveBattleReport(report: MovementReportRecord) {
    this.state.reports.set(report.id, report)
  }

  async getVillageSiegeSnapshot(villageId: string): Promise<VillageSiegeSnapshot | null> {
    const village = this.state.villages.get(villageId)
    if (!village) return null
    return {
      villageId,
      isCapital: false,
      kind: "standard" as const,
      buildings: [],
      resourceFields: [],
    }
  }

  async listActiveTrapPrisoners(villageId: string): Promise<TrapPrisonerRecord[]> {
    const rows: TrapPrisonerRecord[] = []
    for (const prisoner of this.state.trapPrisoners.values()) {
      if (prisoner.defenderVillageId === villageId) {
        rows.push({ ...prisoner, capturedAt: new Date(prisoner.capturedAt.getTime()) })
      }
    }
    rows.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime())
    return rows
  }

  async createTrapPrisoners(records: TrapPrisonerCreateInput[]): Promise<void> {
    for (const record of records) {
      const id = randomUUID()
      this.state.trapPrisoners.set(id, {
        id,
        defenderVillageId: record.defenderVillageId,
        attackerVillageId: record.attackerVillageId,
        attackerAccountId: record.attackerAccountId,
        unitTypeId: record.unitTypeId,
        count: record.count,
        capturedAt: record.capturedAt ?? new Date(),
        sourceMovementId: record.sourceMovementId,
      })
    }
  }

  async updateTrapPrisonerCount(prisonerId: string, count: number): Promise<void> {
    const existing = this.state.trapPrisoners.get(prisonerId)
    if (!existing) return
    this.state.trapPrisoners.set(prisonerId, { ...existing, count })
  }

  async deleteTrapPrisoner(prisonerId: string): Promise<void> {
    this.state.trapPrisoners.delete(prisonerId)
  }

  async updateBuildingLevel(): Promise<void> {
    // no-op for tests
  }

  async updateResourceFieldLevel(): Promise<void> {
    // no-op for tests
  }
}

export class InMemoryRallyPointRepository implements RallyPointRepository {
  private state: StateSnapshot = {
    villages: new Map(),
    rallyPoints: new Map(),
    garrisons: new Map(),
    movements: new Map(),
    waveGroups: new Map(),
    waveMembers: new Map(),
    reports: new Map(),
    trapPrisoners: new Map(),
  }

  constructor(seed?: Partial<StateSnapshot>) {
    if (seed) {
      this.state = {
        villages: seed.villages ?? this.state.villages,
        rallyPoints: seed.rallyPoints ?? this.state.rallyPoints,
        garrisons: seed.garrisons ?? this.state.garrisons,
        movements: seed.movements ?? this.state.movements,
        waveGroups: seed.waveGroups ?? this.state.waveGroups,
        waveMembers: seed.waveMembers ?? this.state.waveMembers,
        reports: seed.reports ?? this.state.reports,
      }
    }
  }

  async withTransaction<T>(handler: (transaction: RallyPointTransaction) => Promise<T>): Promise<T> {
    const draft = cloneState(this.state)
    const transaction = new InMemoryTransaction(draft)
    const result = await handler(transaction)
    this.state = draft
    return result
  }

  async listDueMovements(filter: DueMovementFilter) {
    const movements = [...this.state.movements.values()].filter(
      (mv) => mv.status === "en_route" && mv.arriveAt.getTime() <= filter.beforeOrEqual.getTime(),
    )
    movements.sort((a, b) => {
      if (a.arriveAt.getTime() !== b.arriveAt.getTime()) {
        return a.arriveAt.getTime() - b.arriveAt.getTime()
      }
      const missionPriority = (mission: string) => (mission === "reinforce" ? 0 : 1)
      if (missionPriority(a.mission) !== missionPriority(b.mission)) {
        return missionPriority(a.mission) - missionPriority(b.mission)
      }
      return a.id.localeCompare(b.id)
    })
    if (filter.limit != null) {
      return movements.slice(0, filter.limit)
    }
    return movements
  }

  seedVillage(record?: Partial<VillageRecord>) {
    const village: VillageRecord = {
      id: record?.id ?? randomUUID(),
      ownerAccountId: record?.ownerAccountId ?? randomUUID(),
      x: record?.x ?? 0,
      y: record?.y ?? 0,
      allianceId: record?.allianceId ?? null,
      name: record?.name,
      beginnerProtected: record?.beginnerProtected ?? false,
    }
    this.state.villages.set(village.id, village)
    return village
  }

  seedRallyPoint(state: RallyPointState) {
    this.state.rallyPoints.set(state.villageId, state)
  }

  seedGarrison(stack: GarrisonStack) {
    this.state.garrisons.set(keyForGarrison(stack.villageId, stack.ownerAccountId, stack.unitTypeId), { ...stack })
  }

  getState() {
    return this.state
  }
}
