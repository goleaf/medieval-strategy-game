import { prisma } from "@/lib/db"
import type {
  Prisma,
  RallyPoint as PrismaRallyPoint,
  RallyPointMovement as PrismaMovement,
  RallyPointWaveGroup as PrismaWaveGroup,
  RallyPointWaveMember as PrismaWaveMember,
  GarrisonStack as PrismaGarrisonStack,
  Player,
  Village,
} from "@prisma/client"

import type {
  GarrisonStack,
  MovementCreatedBy,
  MovementMission,
  MovementPayload,
  MovementRecord,
  MovementStatus,
  MovementReportRecord,
  RallyPointState,
  TrapPrisonerCreateInput,
  TrapPrisonerRecord,
  VillageRecord,
  WaveGroupRecord,
  WaveMemberRecord,
} from "./types"
import type { DueMovementFilter, RallyPointRepository, RallyPointTransaction } from "./repository"
import type { VillageSiegeSnapshot } from "@/lib/combat/catapult/types"
import { syncHomeUnitCount } from "@/lib/game-services/unit-ledger"

const missionToDomain: Record<PrismaMovement["mission"], MovementMission> = {
  ATTACK: "attack",
  RAID: "raid",
  REINFORCE: "reinforce",
  SIEGE: "siege",
  RETURN: "return",
}

const missionToPrisma: Record<MovementMission, PrismaMovement["mission"]> = {
  attack: "ATTACK",
  raid: "RAID",
  reinforce: "REINFORCE",
  siege: "SIEGE",
  return: "RETURN",
}

const statusToDomain: Record<PrismaMovement["status"], MovementStatus> = {
  SCHEDULED: "scheduled",
  EN_ROUTE: "en_route",
  RESOLVED: "resolved",
  RETURNING: "returning",
  DONE: "done",
  CANCELLED: "cancelled",
}

const statusToPrisma: Record<MovementStatus, PrismaMovement["status"]> = {
  scheduled: "SCHEDULED",
  en_route: "EN_ROUTE",
  resolved: "RESOLVED",
  returning: "RETURNING",
  done: "DONE",
  cancelled: "CANCELLED",
}

const createdByToDomain: Record<PrismaMovement["createdBy"], MovementCreatedBy> = {
  PLAYER: "player",
  ROUTE: "route",
  SYSTEM: "system",
}

const createdByToPrisma: Record<MovementCreatedBy, PrismaMovement["createdBy"]> = {
  player: "PLAYER",
  route: "ROUTE",
  system: "SYSTEM",
}

type TransactionClient = Prisma.TransactionClient

type VillageWithPlayer = Village & { player: Pick<Player, "id" | "tribeId" | "beginnerProtectionUntil"> }

type RallyPointStateRecord = PrismaRallyPoint

type PrismaJson = Prisma.JsonValue

type PrismaWaveMemberWithTargets = PrismaWaveMember

type PrismaGarrison = PrismaGarrisonStack

type PrismaMovementWithRelations = PrismaMovement

function toTrapPrisonerRecord(row: Prisma.TrapperPrisoner): TrapPrisonerRecord {
  return {
    id: row.id,
    defenderVillageId: row.defenderVillageId,
    attackerVillageId: row.attackerVillageId,
    attackerAccountId: row.attackerAccountId,
    unitTypeId: row.unitTypeId,
    count: row.count,
    capturedAt: row.capturedAt,
    sourceMovementId: row.sourceMovementId ?? undefined,
  }
}

function parseJsonObject<T>(value: PrismaJson | null): T | null {
  if (!value || typeof value !== "object") return null
  return value as T
}

function ensureMovementPayload(value: PrismaJson | null): MovementPayload {
  const parsed = parseJsonObject<MovementPayload>(value) ?? { units: {} }
  return {
    units: parsed.units ?? {},
    hero: parsed.hero,
    catapultTargets: parsed.catapultTargets,
    techLevels: parsed.techLevels ?? undefined,
    waveGroupId: parsed.waveGroupId,
    waveMemberId: parsed.waveMemberId,
    arriveWindowMs: parsed.arriveWindowMs,
    jitterMs: parsed.jitterMs,
    metadata: parsed.metadata ?? {},
  }
}

function ensureUnitsJson(value: PrismaJson | null): Record<string, number> {
  const parsed = parseJsonObject<Record<string, number>>(value)
  return parsed ?? {}
}

function toVillageRecord(record: VillageWithPlayer): VillageRecord {
  const beginnerProtectionUntil = record.player.beginnerProtectionUntil
  return {
    id: record.id,
    ownerAccountId: record.playerId,
    allianceId: record.player.tribeId,
    x: record.x,
    y: record.y,
    name: record.name,
    beginnerProtected: Boolean(beginnerProtectionUntil && beginnerProtectionUntil > new Date()),
  }
}

function toRallyPointState(record: RallyPointStateRecord): RallyPointState {
  return {
    villageId: record.villageId,
    level: record.level,
    waveWindowMs: record.waveWindowMs,
    options: (record.optionsJson ?? {}) as Record<string, unknown>,
  }
}

function toGarrisonStack(
  record: PrismaGarrison,
  tech?: { attack: number; defense: number },
): GarrisonStack {
  return {
    villageId: record.villageId,
    ownerAccountId: record.ownerAccountId,
    unitTypeId: record.unitTypeId,
    count: record.count,
    smithyAttackLevel: tech?.attack,
    smithyDefenseLevel: tech?.defense,
  }
}

function toWaveGroup(record: PrismaWaveGroup): WaveGroupRecord {
  return {
    id: record.id,
    villageId: record.villageId,
    tag: record.tag,
    arriveAt: record.arriveAt,
    jitterMs: record.jitterMs,
    createdAt: record.createdAt,
  }
}

function toWaveMember(record: PrismaWaveMemberWithTargets): WaveMemberRecord {
  return {
    id: record.id,
    waveGroupId: record.waveGroupId,
    mission: missionToDomain[record.mission],
    targetVillageId: record.targetVillageId,
    targetX: record.targetX,
    targetY: record.targetY,
    units: ensureUnitsJson(record.unitsJson),
    catapultTargets: parseJsonObject<string[]>(record.catapultTargetsJson) ?? undefined,
    idempotencyKey: record.idempotencyKey,
    status: record.status === "SENT" ? "sent" : record.status === "FAILED" ? "failed" : "scheduled",
    arriveAt: record.arriveAt,
    departAt: record.departAt,
    createdAt: record.createdAt,
  }
}

function toMovementRecord(record: PrismaMovementWithRelations): MovementRecord {
  return {
    id: record.id,
    mission: missionToDomain[record.mission],
    ownerAccountId: record.ownerAccountId,
    fromVillageId: record.fromVillageId,
    toVillageId: record.toVillageId ?? null,
    toTileX: record.toTileX,
    toTileY: record.toTileY,
    departAt: record.departAt,
    arriveAt: record.arriveAt,
    payload: ensureMovementPayload(record.payload),
    status: statusToDomain[record.status],
    createdBy: createdByToDomain[record.createdBy],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    idempotencyKey: record.idempotencyKey ?? undefined,
    waveGroupId: record.waveGroupId ?? undefined,
    waveMemberId: record.waveMemberId ?? undefined,
  }
}

class PrismaRallyPointTransaction implements RallyPointTransaction {
  constructor(private readonly tx: TransactionClient) {}

  private async attachTechLevels(records: PrismaGarrison[]): Promise<Map<string, { attack: number; defense: number }>> {
    if (!records.length) {
      return new Map()
    }
    const ownerIds = Array.from(new Set(records.map((stack) => stack.ownerAccountId)))
    const unitTypeIds = Array.from(new Set(records.map((stack) => stack.unitTypeId)))
    if (!ownerIds.length || !unitTypeIds.length) {
      return new Map()
    }
    const techRows = await this.tx.unitTech.findMany({
      where: {
        playerId: { in: ownerIds },
        unitTypeId: { in: unitTypeIds },
      },
      select: {
        playerId: true,
        unitTypeId: true,
        attackLevel: true,
        defenseLevel: true,
      },
    })
    const map = new Map<string, { attack: number; defense: number }>()
    for (const row of techRows) {
      map.set(`${row.playerId}:${row.unitTypeId}`, {
        attack: row.attackLevel,
        defense: row.defenseLevel,
      })
    }
    return map
  }

  private async mapGarrisons(records: PrismaGarrison[]): Promise<GarrisonStack[]> {
    if (!records.length) return []
    const techMap = await this.attachTechLevels(records)
    return records.map((record) => {
      const tech = techMap.get(`${record.ownerAccountId}:${record.unitTypeId}`)
      return toGarrisonStack(record, tech)
    })
  }

  async getVillageById(id: string): Promise<VillageRecord | null> {
    const village = await this.tx.village.findUnique({
      where: { id },
      include: { player: { select: { id: true, tribeId: true, beginnerProtectionUntil: true } } },
    })
    if (!village) return null
    return toVillageRecord(village)
  }

  async getVillageByCoords(x: number, y: number): Promise<VillageRecord | null> {
    const village = await this.tx.village.findUnique({
      where: { x_y: { x, y } },
      include: { player: { select: { id: true, tribeId: true, beginnerProtectionUntil: true } } },
    })
    if (!village) return null
    return toVillageRecord(village)
  }

  async getRallyPoint(villageId: string): Promise<RallyPointState | null> {
    const state = await this.tx.rallyPoint.findUnique({ where: { villageId } })
    return state ? toRallyPointState(state) : null
  }

  async upsertRallyPoint(state: RallyPointState): Promise<RallyPointState> {
    const record = await this.tx.rallyPoint.upsert({
      where: { villageId: state.villageId },
      update: { level: state.level, waveWindowMs: state.waveWindowMs, optionsJson: state.options },
      create: {
        villageId: state.villageId,
        level: state.level,
        waveWindowMs: state.waveWindowMs,
        optionsJson: state.options,
      },
    })
    return toRallyPointState(record)
  }

  async getOwnerGarrison(villageId: string, ownerAccountId: string): Promise<GarrisonStack[]> {
    const stacks = await this.tx.garrisonStack.findMany({ where: { villageId, ownerAccountId } })
    return this.mapGarrisons(stacks)
  }

  async setOwnerGarrisonUnit(villageId: string, ownerAccountId: string, unitTypeId: string, count: number): Promise<void> {
    const villageOwner = await this.tx.village.findUnique({
      where: { id: villageId },
      select: { playerId: true },
    })

    if (villageOwner?.playerId === ownerAccountId) {
      await syncHomeUnitCount(this.tx, { villageId, ownerAccountId, unitTypeId, count })
      return
    }

    if (count <= 0) {
      await this.tx.garrisonStack.deleteMany({ where: { villageId, ownerAccountId, unitTypeId } })
      return
    }

    await this.tx.garrisonStack.upsert({
      where: { villageId_ownerAccountId_unitTypeId: { villageId, ownerAccountId, unitTypeId } },
      update: { count },
      create: { villageId, ownerAccountId, unitTypeId, count },
    })
  }

  async getAllGarrisons(villageId: string): Promise<GarrisonStack[]> {
    const stacks = await this.tx.garrisonStack.findMany({ where: { villageId } })
    return this.mapGarrisons(stacks)
  }

  async createMovement(record: MovementRecord): Promise<MovementRecord> {
    const created = await this.tx.rallyPointMovement.create({
      data: {
        id: record.id,
        mission: missionToPrisma[record.mission],
        ownerAccountId: record.ownerAccountId,
        fromVillageId: record.fromVillageId,
        toVillageId: record.toVillageId ?? null,
        toTileX: record.toTileX,
        toTileY: record.toTileY,
        departAt: record.departAt,
        arriveAt: record.arriveAt,
        payload: record.payload as Prisma.JsonObject,
        status: statusToPrisma[record.status],
        createdBy: createdByToPrisma[record.createdBy],
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        idempotencyKey: record.idempotencyKey,
        waveGroupId: record.waveGroupId,
        waveMemberId: record.waveMemberId,
      },
    })
    return toMovementRecord(created)
  }

  async updateMovement(movementId: string, changes: Partial<MovementRecord>): Promise<MovementRecord | null> {
    const data: Prisma.RallyPointMovementUpdateInput = {}
    if (changes.status) data.status = statusToPrisma[changes.status]
    if (changes.payload) data.payload = changes.payload as Prisma.JsonObject
    if (changes.arriveAt) data.arriveAt = changes.arriveAt
    if (changes.departAt) data.departAt = changes.departAt
    if (changes.updatedAt) data.updatedAt = changes.updatedAt
    if (changes.waveGroupId !== undefined) data.waveGroupId = changes.waveGroupId
    if (changes.waveMemberId !== undefined) data.waveMemberId = changes.waveMemberId
    if (changes.toVillageId !== undefined) data.toVillageId = changes.toVillageId
    if (Object.keys(data).length === 0) {
      const current = await this.tx.rallyPointMovement.findUnique({ where: { id: movementId } })
      return current ? toMovementRecord(current) : null
    }
    const updated = await this.tx.rallyPointMovement.update({ where: { id: movementId }, data })
    return toMovementRecord(updated)
  }

  async findMovementById(id: string): Promise<MovementRecord | null> {
    const movement = await this.tx.rallyPointMovement.findUnique({ where: { id } })
    return movement ? toMovementRecord(movement) : null
  }

  async findMovementsByIdempotency(key: string): Promise<MovementRecord[]> {
    const movements = await this.tx.rallyPointMovement.findMany({ where: { idempotencyKey: key } })
    return movements.map(toMovementRecord)
  }

  async createWaveGroup(
    group: WaveGroupRecord,
    members: WaveMemberRecord[],
  ): Promise<{ group: WaveGroupRecord; members: WaveMemberRecord[] }> {
    const createdGroup = await this.tx.rallyPointWaveGroup.create({
      data: {
        id: group.id,
        villageId: group.villageId,
        tag: group.tag,
        arriveAt: group.arriveAt,
        jitterMs: group.jitterMs,
        createdAt: group.createdAt,
      },
    })

    const createdMembers: PrismaWaveMember[] = []
    for (const member of members) {
      const created = await this.tx.rallyPointWaveMember.create({
        data: {
          id: member.id,
          waveGroupId: group.id,
          mission: missionToPrisma[member.mission],
          targetVillageId: member.targetVillageId,
          targetX: member.targetX,
          targetY: member.targetY,
          unitsJson: member.units,
          catapultTargetsJson: member.catapultTargets,
          idempotencyKey: member.idempotencyKey,
          status: member.status === "sent" ? "SENT" : member.status === "failed" ? "FAILED" : "SCHEDULED",
          arriveAt: member.arriveAt,
          departAt: member.departAt,
          createdAt: member.createdAt,
        },
      })
      createdMembers.push(created)
    }

    return { group: toWaveGroup(createdGroup), members: createdMembers.map(toWaveMember) }
  }

  async listWaveMembersByGroup(groupId: string): Promise<WaveMemberRecord[]> {
    const members = await this.tx.rallyPointWaveMember.findMany({ where: { waveGroupId: groupId } })
    return members.map(toWaveMember)
  }

  async updateWaveMember(memberId: string, changes: Partial<WaveMemberRecord>): Promise<void> {
    const data: Prisma.RallyPointWaveMemberUpdateInput = {}
    if (changes.status) {
      data.status = changes.status === "sent" ? "SENT" : changes.status === "failed" ? "FAILED" : "SCHEDULED"
    }
    if (changes.arriveAt) data.arriveAt = changes.arriveAt
    if (changes.departAt) data.departAt = changes.departAt
    if (changes.catapultTargets) data.catapultTargetsJson = changes.catapultTargets
    if (Object.keys(data).length === 0) return
    await this.tx.rallyPointWaveMember.update({ where: { id: memberId }, data })
  }

  async saveBattleReport(report: MovementReportRecord): Promise<void> {
    await this.tx.rallyPointMovementReport.create({
      data: {
        id: report.id,
        movementId: report.movementId,
        mission: missionToPrisma[report.mission],
        summary: report.summary as Prisma.JsonObject,
        createdAt: report.createdAt,
      },
    })
  }

  async getVillageSiegeSnapshot(villageId: string): Promise<VillageSiegeSnapshot | null> {
    const village = await this.tx.village.findUnique({
      where: { id: villageId },
      select: {
        id: true,
        isCapital: true,
        buildings: { select: { id: true, type: true, level: true, slot: true } },
        resourceFields: { select: { id: true, resourceType: true, slot: true, level: true } },
      },
    })
    if (!village) return null
    const resourceMap: Record<string, "wood" | "clay" | "iron" | "crop"> = {
      WOOD: "wood",
      CLAY: "clay",
      IRON: "iron",
      CROP: "crop",
    }

    const hasWonder = village.buildings.some((b) => b.type === "WORLD_WONDER")
    return {
      villageId: village.id,
      isCapital: village.isCapital,
      kind: hasWonder ? "world_wonder" : "standard",
      buildings: village.buildings.map((building) => ({
        id: building.id,
        type: building.type,
        level: building.level,
        slot: building.slot,
      })),
      resourceFields: village.resourceFields.map((field) => ({
        id: field.id,
        resource: resourceMap[field.resourceType] ?? "wood",
        slot: field.slot,
        level: field.level,
      })),
    }
  }

  async updateBuildingLevel(buildingId: string, level: number): Promise<void> {
    const nextLevel = Math.max(0, level)
    try {
      await this.tx.building.update({ where: { id: buildingId }, data: { level: nextLevel } })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025") {
        throw error
      }
    }
  }

  async updateResourceFieldLevel(fieldId: string, level: number): Promise<void> {
    const nextLevel = Math.max(0, level)
    try {
      await this.tx.villageResourceField.update({ where: { id: fieldId }, data: { level: nextLevel } })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025") {
        throw error
      }
    }
  }

  async listActiveTrapPrisoners(villageId: string): Promise<TrapPrisonerRecord[]> {
    const rows = await this.tx.trapperPrisoner.findMany({
      where: { defenderVillageId: villageId },
      orderBy: { capturedAt: "asc" },
    })
    return rows.map(toTrapPrisonerRecord)
  }

  async createTrapPrisoners(records: TrapPrisonerCreateInput[]): Promise<void> {
    if (!records.length) return
    await this.tx.trapperPrisoner.createMany({
      data: records.map((record) => ({
        defenderVillageId: record.defenderVillageId,
        attackerVillageId: record.attackerVillageId,
        attackerAccountId: record.attackerAccountId,
        unitTypeId: record.unitTypeId,
        count: record.count,
        capturedAt: record.capturedAt ?? new Date(),
        sourceMovementId: record.sourceMovementId,
        metadata: record.metadata as Prisma.JsonValue | undefined,
      })),
    })
  }

  async updateTrapPrisonerCount(prisonerId: string, count: number): Promise<void> {
    await this.tx.trapperPrisoner.update({
      where: { id: prisonerId },
      data: { count: Math.max(0, count) },
    })
  }

  async deleteTrapPrisoner(prisonerId: string): Promise<void> {
    try {
      await this.tx.trapperPrisoner.delete({ where: { id: prisonerId } })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025") {
        throw error
      }
    }
  }
}

export class PrismaRallyPointRepository implements RallyPointRepository {
  constructor(private readonly db = prisma) {}

  async withTransaction<T>(handler: (transaction: RallyPointTransaction) => Promise<T>): Promise<T> {
    return this.db.$transaction(async (tx) => {
      const trx = new PrismaRallyPointTransaction(tx)
      return handler(trx)
    })
  }

  async listDueMovements(filter: DueMovementFilter): Promise<MovementRecord[]> {
    const movements = await this.db.rallyPointMovement.findMany({
      where: {
        status: Prisma.RallyPointMovementStatus.EN_ROUTE,
        arriveAt: { lte: filter.beforeOrEqual },
      },
      orderBy: [{ arriveAt: "asc" }, { id: "asc" }],
      take: filter.limit,
    })

    const mapped = movements.map(toMovementRecord)
    mapped.sort((a, b) => {
      if (a.arriveAt.getTime() !== b.arriveAt.getTime()) {
        return a.arriveAt.getTime() - b.arriveAt.getTime()
      }
      if (a.mission === "reinforce" && b.mission !== "reinforce") return -1
      if (a.mission !== "reinforce" && b.mission === "reinforce") return 1
      return a.id.localeCompare(b.id)
    })
    return mapped
  }
}

export function mapPrismaMovement(record: PrismaMovement): MovementRecord {
  return toMovementRecord(record)
}
