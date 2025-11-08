import { randomUUID } from "node:crypto"

import {
  getCancelGraceMs,
  getCatapultTargetingMode,
  getMissionConfig,
  getRallyPointConfig,
  getServerSpeed,
  getWavePrecisionMs,
} from "@/lib/config/rally-point"
import { SimpleCombatResolver } from "./combat"
import { computeSlowestSpeed, euclideanDistance, travelTimeMs } from "./math"
import type { RallyPointRepository, RallyPointTransaction } from "./repository"
import type {
  CombatResolver,
  GarrisonStack,
  MissionTarget,
  MissionType,
  MovementRecord,
  MovementResolutionResult,
  RallyPointEngineOptions,
  RallyPointState,
  RecallReinforcementsInput,
  SendMissionInput,
  SendMissionResult,
  UnitStats,
  UnitsComposition,
  VillageRecord,
  WaveGroupRecord,
  WaveGroupRequest,
  WaveGroupResult,
  WaveMemberRecord,
} from "./types"

interface TargetResolution {
  coords: { x: number; y: number }
  village: VillageRecord | null
}

interface PreparedMission {
  mission: MissionType
  units: UnitsComposition
  departAt: Date
  arriveAt: Date
  travelMs: number
  target: TargetResolution
  rpState: RallyPointState
  warnings: string[]
  payloadTargets: string[]
}

class GarrisonLedger {
  private readonly counts: Map<string, number>

  constructor(stacks: GarrisonStack[]) {
    this.counts = new Map<string, number>()
    for (const stack of stacks) {
      this.counts.set(stack.unitTypeId, stack.count)
    }
  }

  assertAvailability(units: UnitsComposition) {
    for (const [unitId, amount] of Object.entries(units)) {
      if (amount <= 0) continue
      const available = this.counts.get(unitId) ?? 0
      if (available < amount) {
        throw new Error(`Insufficient ${unitId}: requested ${amount}, available ${available}`)
      }
    }
  }

  consume(units: UnitsComposition) {
    this.assertAvailability(units)
    for (const [unitId, amount] of Object.entries(units)) {
      if (amount <= 0) continue
      const current = this.counts.get(unitId) ?? 0
      this.counts.set(unitId, current - amount)
    }
  }

  add(units: UnitsComposition) {
    for (const [unitId, amount] of Object.entries(units)) {
      if (amount <= 0) continue
      const current = this.counts.get(unitId) ?? 0
      this.counts.set(unitId, current + amount)
    }
  }

  entries() {
    return Array.from(this.counts.entries())
  }
}

export class RallyPointEngine {
  private readonly cancelGraceMs = getCancelGraceMs()
  private readonly serverSpeed = getServerSpeed()
  private readonly repo: RallyPointRepository
  private readonly unitCatalog: Record<string, UnitStats>
  private readonly combatResolver: CombatResolver
  private readonly options: RallyPointEngineOptions

  constructor(
    repo: RallyPointRepository,
    unitCatalog: Record<string, UnitStats>,
    combatResolver: CombatResolver = new SimpleCombatResolver(unitCatalog),
    options: RallyPointEngineOptions = {},
  ) {
    this.repo = repo
    this.unitCatalog = unitCatalog
    this.combatResolver = combatResolver
    this.options = options
  }

  private now() {
    return this.options.now?.() ?? new Date()
  }

  async sendMission(input: SendMissionInput): Promise<SendMissionResult> {
    if (!input.idempotencyKey) {
      throw new Error("idempotencyKey is required")
    }

    return this.repo.withTransaction(async (trx) => {
      const existing = await trx.findMovementsByIdempotency(input.idempotencyKey)
      if (existing.length > 0) {
        return { movement: existing[0], warnings: [] }
      }

      const sourceVillage = await this.requireVillage(trx, input.sourceVillageId)
      if (sourceVillage.ownerAccountId !== input.sourceAccountId) {
        throw new Error("Source village ownership mismatch")
      }

      const rpState = await this.ensureRallyPoint(trx, sourceVillage.id)
      const missionConfig = getMissionConfig(input.mission)
      const warnings: string[] = []

      const garrisonStacks = await trx.getOwnerGarrison(sourceVillage.id, input.sourceAccountId)
      const ledger = new GarrisonLedger(garrisonStacks)
      this.validateComposition(input.units)
      this.enforceMissionRoles(input.units, missionConfig)
      if (input.mission === "siege") {
        this.ensureSiegePresence(input.units)
      }

      const target = await this.resolveTarget(trx, input.target)
      this.validateTargetRules(sourceVillage, target, input.mission)

      const timing = this.computeMissionTiming(sourceVillage, target, input.units, input.arriveAt, input.departAt)
      const precisionMs = getWavePrecisionMs(rpState.level)
      if (timing.arriveAt.getTime() - timing.departAt.getTime() < 0) {
        throw new Error("Arrival must be after departure")
      }
      if (timing.departAt.getTime() < this.now().getTime() - precisionMs) {
        throw new Error("Depart time already elapsed beyond precision window")
      }

      ledger.consume(input.units)
      await this.persistGarrison(trx, sourceVillage.id, input.sourceAccountId, ledger)

      const catapultTargets = this.normalizeCatapultTargets(input.mission, rpState.level, input.catapultTargets, warnings)
      const movement = await trx.createMovement({
        id: randomUUID(),
        mission: input.mission,
        ownerAccountId: input.sourceAccountId,
        fromVillageId: sourceVillage.id,
        toVillageId: target.village?.id ?? null,
        toTileX: target.coords.x,
        toTileY: target.coords.y,
        departAt: timing.departAt,
        arriveAt: timing.arriveAt,
        payload: {
          units: input.units,
          catapultTargets,
          metadata: input.payload ?? {},
        },
        status: "en_route",
        createdBy: "player",
        createdAt: this.now(),
        updatedAt: this.now(),
        idempotencyKey: input.idempotencyKey,
      })

      return { movement, warnings }
    })
  }

  async sendWaveGroup(request: WaveGroupRequest): Promise<WaveGroupResult> {
    if (!request.members.length) {
      throw new Error("Wave group requires at least one member")
    }

    return this.repo.withTransaction(async (trx) => {
      const sourceVillage = await this.requireVillage(trx, request.sourceVillageId)
      const rpState = await this.ensureRallyPoint(trx, sourceVillage.id)
      const precision = getWavePrecisionMs(rpState.level)
      const waveWindow = Math.min(rpState.waveWindowMs, precision)
      const garrisonStacks = await trx.getOwnerGarrison(sourceVillage.id, request.sourceAccountId)
      const ledger = new GarrisonLedger(garrisonStacks)
      const warnings: string[] = []

      const prepared: PreparedMission[] = []
      for (const member of request.members) {
        const missionInput: SendMissionInput = {
          ...member,
          idempotencyKey: request.idempotencyKey,
          sourceVillageId: request.sourceVillageId,
          sourceAccountId: request.sourceAccountId,
        }
        const missionConfig = getMissionConfig(member.mission)
        this.validateComposition(member.units)
        this.enforceMissionRoles(member.units, missionConfig)
        if (member.mission === "siege") {
          this.ensureSiegePresence(member.units)
        }

        const target = await this.resolveTarget(trx, member.target)
        this.validateTargetRules(sourceVillage, target, member.mission)
        const timing = this.computeMissionTiming(sourceVillage, target, member.units, request.arriveAt, member.departAt)
        if (timing.departAt.getTime() < this.now().getTime()) {
          throw new Error("Wave member would depart in the past")
        }

        ledger.consume(member.units)
        const catapultTargets = this.normalizeCatapultTargets(member.mission, rpState.level, member.catapultTargets, warnings)
        prepared.push({
          mission: member.mission,
          units: member.units,
          departAt: timing.departAt,
          arriveAt: request.arriveAt,
          travelMs: timing.travelMs,
          target,
          rpState,
          warnings,
          payloadTargets: catapultTargets,
        })
      }

      await this.persistGarrison(trx, sourceVillage.id, request.sourceAccountId, ledger)

      const waveGroup: WaveGroupRecord = {
        id: randomUUID(),
        villageId: sourceVillage.id,
        tag: request.tag,
        arriveAt: request.arriveAt,
        jitterMs: request.jitterMs ?? waveWindow,
        createdAt: this.now(),
      }

      const members: WaveMemberRecord[] = prepared.map((item) => ({
        id: randomUUID(),
        waveGroupId: waveGroup.id,
        mission: item.mission,
        targetVillageId: item.target.village?.id ?? null,
        targetX: item.target.coords.x,
        targetY: item.target.coords.y,
        units: item.units,
        catapultTargets: item.payloadTargets,
        idempotencyKey: request.idempotencyKey,
        status: "sent",
        arriveAt: request.arriveAt,
        departAt: item.departAt,
        createdAt: this.now(),
      }))

      await trx.createWaveGroup(waveGroup, members)

      const movements: MovementRecord[] = []
      for (let idx = 0; idx < prepared.length; idx++) {
        const item = prepared[idx]
        const offset = this.computeWaveOffset(idx, prepared.length, waveWindow)
        const departAt = new Date(item.departAt.getTime() + offset)
        const arriveAt = new Date(item.arriveAt.getTime() + offset)
        const movement = await trx.createMovement({
          id: randomUUID(),
          mission: item.mission,
          ownerAccountId: request.sourceAccountId,
          fromVillageId: sourceVillage.id,
          toVillageId: item.target.village?.id ?? null,
          toTileX: item.target.coords.x,
          toTileY: item.target.coords.y,
          departAt,
          arriveAt,
          payload: {
            units: item.units,
            catapultTargets: item.payloadTargets,
            waveGroupId: waveGroup.id,
            waveMemberId: members[idx].id,
            jitterMs: offset,
            arriveWindowMs: waveWindow,
          },
          status: "en_route",
          createdBy: "player",
          createdAt: this.now(),
          updatedAt: this.now(),
          idempotencyKey: request.idempotencyKey,
          waveGroupId: waveGroup.id,
          waveMemberId: members[idx].id,
        })
        movements.push(movement)
      }

      return { waveGroup, members, movements, warnings }
    })
  }

  async cancelMovement(movementId: string, requesterAccountId: string): Promise<boolean> {
    const now = this.now()
    return this.repo.withTransaction(async (trx) => {
      const movement = await trx.findMovementById(movementId)
      if (!movement) {
        return false
      }
      if (movement.ownerAccountId !== requesterAccountId) {
        throw new Error("Only the owner can cancel a movement")
      }
      if (movement.status !== "en_route") {
        return false
      }
      if (now.getTime() - movement.createdAt.getTime() > this.cancelGraceMs) {
        return false
      }
      const stacks = await trx.getOwnerGarrison(movement.fromVillageId, requesterAccountId)
      const ledger = new GarrisonLedger(stacks)
      ledger.add(movement.payload.units)
      await this.persistGarrison(trx, movement.fromVillageId, requesterAccountId, ledger)
      await trx.updateMovement(movement.id, { status: "cancelled", updatedAt: now })
      return true
    })
  }

  async recallReinforcements(input: RecallReinforcementsInput): Promise<MovementRecord> {
    if (!input.idempotencyKey) {
      throw new Error("idempotencyKey is required for recalls")
    }

    return this.repo.withTransaction(async (trx) => {
      const existing = await trx.findMovementsByIdempotency(input.idempotencyKey)
      if (existing.length) {
        return existing[0]
      }

      const fromVillage = await this.requireVillage(trx, input.fromVillageId)
      const toVillage = await this.requireVillage(trx, input.toVillageId)

      const stacks = await trx.getOwnerGarrison(fromVillage.id, input.ownerAccountId)
      const ledger = new GarrisonLedger(stacks)
      ledger.consume(input.units)
      await this.persistGarrison(trx, fromVillage.id, input.ownerAccountId, ledger)

      const distance = euclideanDistance({ x: fromVillage.x, y: fromVillage.y }, { x: toVillage.x, y: toVillage.y })
      const slowestSpeed = computeSlowestSpeed(input.units, this.unitCatalog)
      const travelMs = travelTimeMs(distance, slowestSpeed, this.serverSpeed)
      const departAt = this.now()
      const arriveAt = new Date(departAt.getTime() + travelMs)

      return trx.createMovement({
        id: randomUUID(),
        mission: "return",
        ownerAccountId: input.ownerAccountId,
        fromVillageId: fromVillage.id,
        toVillageId: toVillage.id,
        toTileX: toVillage.x,
        toTileY: toVillage.y,
        departAt,
        arriveAt,
        payload: { units: input.units },
        status: "returning",
        createdBy: "player",
        createdAt: departAt,
        updatedAt: departAt,
        idempotencyKey: input.idempotencyKey,
      })
    })
  }

  async resolveDueMovements(limit = 200): Promise<MovementResolutionResult[]> {
    const dueMovements = await this.repo.listDueMovements({ beforeOrEqual: this.now(), limit })
    const results: MovementResolutionResult[] = []

    for (const movement of dueMovements) {
      const resolved = await this.repo.withTransaction(async (trx) => {
        const fresh = await trx.findMovementById(movement.id)
        if (!fresh || fresh.status !== "en_route") {
          return null
        }
        return this.resolveMovement(trx, fresh)
      })
      if (resolved) {
        results.push(resolved)
      }
    }

    return results
  }

  private async resolveMovement(trx: RallyPointTransaction, movement: MovementRecord): Promise<MovementResolutionResult> {
    if (movement.mission === "reinforce") {
      await this.mergeReinforcements(trx, movement)
      await trx.updateMovement(movement.id, { status: "done", updatedAt: this.now() })
      return { movement }
    }

    if (movement.mission === "return") {
      await this.mergeReturn(trx, movement)
      await trx.updateMovement(movement.id, { status: "done", updatedAt: this.now() })
      return { movement }
    }

    const attackerVillage = await trx.getVillageById(movement.fromVillageId)
    if (!attackerVillage) {
      throw new Error("Attacker village missing during resolution")
    }
    const attackerRp = await this.ensureRallyPoint(trx, attackerVillage.id)

    const defenderVillage = movement.toVillageId ? await trx.getVillageById(movement.toVillageId) : null
    const defenderStacks = movement.toVillageId ? await trx.getAllGarrisons(movement.toVillageId) : []

    const combatResult = await this.combatResolver.resolve({
      mission: movement.mission,
      attackerVillageId: movement.fromVillageId,
      defenderVillageId: movement.toVillageId,
      target: { x: movement.toTileX, y: movement.toTileY },
      attackerUnits: movement.payload.units,
      defenderGarrisons: defenderStacks,
      wallLevel: (movement.payload.metadata?.wallLevel as number | undefined) ?? undefined,
      wallType: (movement.payload.metadata?.wallType as string | undefined) ?? undefined,
      rallyPointLevel: attackerRp.level,
      catapultTargets: movement.payload.catapultTargets ?? [],
      timestamp: this.now(),
    })

    if (movement.toVillageId) {
      await this.applyDefenderOutcome(trx, movement.toVillageId, defenderStacks, combatResult)
    }

    const survivors = combatResult.attackerSurvivors
    let returnMovementId: string | undefined
    if (Object.values(survivors).some((value) => value > 0)) {
      returnMovementId = await this.scheduleReturn(trx, movement, survivors, attackerVillage)
    }

    await trx.updateMovement(movement.id, { status: "resolved", updatedAt: this.now() })

    await trx.saveBattleReport({
      id: randomUUID(),
      movementId: movement.id,
      mission: movement.mission,
      summary: combatResult as Record<string, unknown>,
      createdAt: this.now(),
    })

    return { movement, report: combatResult, createdReturnMovementId: returnMovementId }
  }

  private async mergeReinforcements(trx: RallyPointTransaction, movement: MovementRecord) {
    if (!movement.toVillageId) {
      return
    }
    const stacks = await trx.getOwnerGarrison(movement.toVillageId, movement.ownerAccountId)
    const ledger = new GarrisonLedger(stacks)
    ledger.add(movement.payload.units)
    await this.persistGarrison(trx, movement.toVillageId, movement.ownerAccountId, ledger)
  }

  private async mergeReturn(trx: RallyPointTransaction, movement: MovementRecord) {
    if (!movement.toVillageId) {
      throw new Error("Return movement missing destination village")
    }
    const stacks = await trx.getOwnerGarrison(movement.toVillageId, movement.ownerAccountId)
    const ledger = new GarrisonLedger(stacks)
    ledger.add(movement.payload.units)
    await this.persistGarrison(trx, movement.toVillageId, movement.ownerAccountId, ledger)
  }

  private async scheduleReturn(
    trx: RallyPointTransaction,
    movement: MovementRecord,
    survivors: UnitsComposition,
    attackerVillage: VillageRecord,
  ) {
    const travelMs = movement.arriveAt.getTime() - movement.departAt.getTime()
    const departAt = this.now()
    const arriveAt = new Date(departAt.getTime() + travelMs)
    const record = await trx.createMovement({
      id: randomUUID(),
      mission: "return",
      ownerAccountId: movement.ownerAccountId,
      fromVillageId: movement.toVillageId ?? movement.fromVillageId,
      toVillageId: movement.fromVillageId,
      toTileX: attackerVillage.x,
      toTileY: attackerVillage.y,
      departAt,
      arriveAt,
      payload: { units: survivors },
      status: "returning",
      createdBy: "system",
      createdAt: this.now(),
      updatedAt: this.now(),
    })
    return record.id
  }

  private async applyDefenderOutcome(
    trx: RallyPointTransaction,
    villageId: string,
    baselineStacks: GarrisonStack[],
    result: Awaited<ReturnType<CombatResolver["resolve"]>>,
  ) {
    const survivorMap = new Map<
      string,
      {
        ownerAccountId: string
        unitTypeId: string
        count: number
      }
    >()
    const survivorKeys = new Set<string>()
    for (const survivor of result.defenderRemaining) {
      const key = `${survivor.ownerAccountId}:${survivor.unitTypeId}`
      survivorMap.set(key, survivor)
      survivorKeys.add(key)
    }
    const baselineKeys = new Set(baselineStacks.map((stack) => `${stack.ownerAccountId}:${stack.unitTypeId}`))
    const keys = new Set<string>([...baselineKeys, ...survivorKeys])
    for (const key of keys) {
      const [ownerAccountId, unitTypeId] = key.split(":")
      const snapshot = survivorMap.get(key)
      const count = snapshot?.count ?? 0
      await trx.setOwnerGarrisonUnit(villageId, ownerAccountId, unitTypeId, count)
    }
  }

  private normalizeCatapultTargets(
    mission: MissionType,
    rpLevel: number,
    targets: string[] | undefined,
    warnings: string[],
  ): string[] {
    if (mission === "reinforce" || mission === "raid") {
      return []
    }
    const mode = getCatapultTargetingMode(rpLevel)
    if (mode === "random" || !targets?.length) {
      if (targets?.length) {
        warnings.push("Catapult targeting locked until Rally Point level 10")
      }
      return []
    }
    const allowed = mode === "one" ? 1 : 2
    if (targets.length > allowed) {
      warnings.push(`Only ${allowed} catapult targets allowed at current Rally Point level`)
    }
    return Array.from(new Set(targets.slice(0, allowed)))
  }

  private async ensureRallyPoint(trx: RallyPointTransaction, villageId: string): Promise<RallyPointState> {
    const existing = await trx.getRallyPoint(villageId)
    if (existing) {
      return existing
    }
    const state: RallyPointState = {
      villageId,
      level: 1,
      waveWindowMs: getRallyPointConfig().rallyPoint.waveWindowDefaultMs,
      options: {},
    }
    return trx.upsertRallyPoint(state)
  }

  private validateComposition(units: UnitsComposition) {
    const hasUnits = Object.values(units).some((count) => count > 0)
    if (!hasUnits) {
      throw new Error("At least one unit is required")
    }
  }

  private enforceMissionRoles(units: UnitsComposition, missionConfig: ReturnType<typeof getMissionConfig>) {
    for (const [unitId, count] of Object.entries(units)) {
      if (count <= 0) continue
      const stats = this.unitCatalog[unitId]
      if (!stats) {
        throw new Error(`Unknown unit type ${unitId}`)
      }
      if (!missionConfig.allowRoles.includes(stats.role)) {
        throw new Error(`Unit ${unitId} is not allowed for this mission`)
      }
    }
  }

  private ensureSiegePresence(units: UnitsComposition) {
    const hasSiege = Object.entries(units).some(([unitId, count]) => count > 0 && this.unitCatalog[unitId]?.siege)
    if (!hasSiege) {
      throw new Error("Siege missions require rams or catapults")
    }
  }

  private async resolveTarget(trx: RallyPointTransaction, target: MissionTarget): Promise<TargetResolution> {
    if (target.type === "village") {
      const village = await trx.getVillageById(target.villageId)
      if (!village) {
        throw new Error("Target village not found")
      }
      return { coords: { x: village.x, y: village.y }, village }
    }
    if (target.targetVillageId) {
      const village = await trx.getVillageById(target.targetVillageId)
      return { coords: { x: target.x, y: target.y }, village }
    }
    return { coords: { x: target.x, y: target.y }, village: null }
  }

  private validateTargetRules(source: VillageRecord, target: TargetResolution, mission: MissionType) {
    if (!target.village) {
      return
    }
    if (mission !== "reinforce" && target.village.id === source.id) {
      throw new Error("Cannot attack your own village")
    }
    if (target.village.beginnerProtected && mission !== "reinforce") {
      throw new Error("Target under beginner protection")
    }
  }

  private computeMissionTiming(
    source: VillageRecord,
    target: TargetResolution,
    units: UnitsComposition,
    arriveAt?: Date,
    departAt?: Date,
  ) {
    const distance = euclideanDistance({ x: source.x, y: source.y }, target.coords)
    const slowestSpeed = computeSlowestSpeed(units, this.unitCatalog)
    const travelMs = travelTimeMs(distance, slowestSpeed, this.serverSpeed)
    const now = this.now()

    if (arriveAt) {
      const depart = new Date(arriveAt.getTime() - travelMs)
      if (depart.getTime() < now.getTime()) {
        throw new Error("Cannot schedule arrival in the past")
      }
      return { distance, slowestSpeed, travelMs, departAt: depart, arriveAt }
    }

    if (departAt) {
      const arrive = new Date(departAt.getTime() + travelMs)
      return { distance, slowestSpeed, travelMs, departAt, arriveAt: arrive }
    }

    const depart = now
    const arrive = new Date(now.getTime() + travelMs)
    return { distance, slowestSpeed, travelMs, departAt: depart, arriveAt: arrive }
  }

  private async persistGarrison(
    trx: RallyPointTransaction,
    villageId: string,
    ownerAccountId: string,
    ledger: GarrisonLedger,
  ) {
    const entries = ledger.entries()
    for (const [unitTypeId, count] of entries) {
      await trx.setOwnerGarrisonUnit(villageId, ownerAccountId, unitTypeId, count)
    }
  }

  private computeWaveOffset(index: number, total: number, windowMs: number) {
    if (total <= 1) return 0
    const step = windowMs / Math.max(1, total - 1)
    return Math.round(index * step - windowMs / 2)
  }

  private async requireVillage(trx: RallyPointTransaction, villageId: string) {
    const village = await trx.getVillageById(villageId)
    if (!village) {
      throw new Error("Village not found")
    }
    return village
  }
}
