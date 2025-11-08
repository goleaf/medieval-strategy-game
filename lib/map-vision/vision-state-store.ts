import { Prisma, TileVisionState as PrismaTileVisionState, TileVisionStateType, VisionSharingScope } from "@prisma/client"
import { prisma } from "@/lib/db"
import { FogState, type AttributeFreshnessEntry, type AttributeFreshnessMap, type AttributeKey } from "./types"
import { getTileMemoryExpiry } from "./config"

type VisionScope = "PLAYER" | "ALLIANCE"

const ATTRIBUTE_KEYS: AttributeKey[] = ["owner", "population", "wall", "oasis", "special"]

export interface TileVisionStateRecord {
  id: string
  tileId: string
  state: FogState
  lastSeenAt?: Date | null
  freshUntil?: Date | null
  memoryExpiresAt?: Date | null
  attributeFreshness: AttributeFreshnessMap
  sharingScope: VisionSharingScope
}

export interface VisionStateMutation {
  scope: VisionScope
  tileId: string
  nextState: FogState
  lastSeenAt?: Date
  freshUntil?: Date | null
  memoryExpiresAt?: Date | null
  attributeFreshness?: AttributeFreshnessMap
}

interface VisionStateStoreOptions {
  viewerPlayerId?: string
  viewerAllianceId?: string
}

export class VisionStateStore {
  private readonly viewerPlayerId?: string
  private readonly viewerAllianceId?: string
  private readonly personal = new Map<string, TileVisionStateRecord>()
  private readonly alliance = new Map<string, TileVisionStateRecord>()

  constructor(options: VisionStateStoreOptions) {
    this.viewerPlayerId = options.viewerPlayerId
    this.viewerAllianceId = options.viewerAllianceId
  }

  get personalStates() {
    return this.personal
  }

  get allianceStates() {
    return this.alliance
  }

  async load(tileIds: string[]) {
    await Promise.all([this.loadScope("PLAYER", tileIds), this.loadScope("ALLIANCE", tileIds)])
  }

  async persist(updates: VisionStateMutation[]) {
    const ops = updates
      .filter((update) => this.canPersist(update.scope))
      .map(async (update) => {
        const targetMap = this.mapForScope(update.scope)
        const existing = targetMap.get(update.tileId)
        const attributeFreshness = update.attributeFreshness ?? existing?.attributeFreshness ?? {}
        const data = this.buildPersistencePayload(update, attributeFreshness)

        if (existing) {
          const persisted = await prisma.tileVisionState.update({
            where: { id: existing.id },
            data,
          })
          targetMap.set(update.tileId, this.mapRecord(persisted))
        } else {
          const created = await prisma.tileVisionState.create({
            data: {
              ...data,
              tileId: update.tileId,
              viewerPlayerId: update.scope === "PLAYER" ? this.viewerPlayerId ?? null : null,
              viewerAllianceId: update.scope === "ALLIANCE" ? this.viewerAllianceId ?? null : null,
              sharingScope: update.scope === "PLAYER" ? VisionSharingScope.PERSONAL : VisionSharingScope.ALLIANCE,
            },
          })
          targetMap.set(update.tileId, this.mapRecord(created))
        }
      })

    await Promise.all(ops)
  }

  private canPersist(scope: VisionScope) {
    if (scope === "PLAYER") {
      return Boolean(this.viewerPlayerId)
    }
    return Boolean(this.viewerAllianceId)
  }

  private mapForScope(scope: VisionScope) {
    return scope === "PLAYER" ? this.personal : this.alliance
  }

  private async loadScope(scope: VisionScope, tileIds: string[]) {
    if (!this.canPersist(scope) || tileIds.length === 0) return
    const records = await prisma.tileVisionState.findMany({
      where: {
        tileId: { in: tileIds },
        viewerPlayerId: scope === "PLAYER" ? this.viewerPlayerId : null,
        viewerAllianceId: scope === "ALLIANCE" ? this.viewerAllianceId : null,
      },
    })
    const targetMap = this.mapForScope(scope)
    records.forEach((record) => {
      targetMap.set(record.tileId, this.mapRecord(record))
    })
  }

  private mapRecord(record: PrismaTileVisionState): TileVisionStateRecord {
    return {
      id: record.id,
      tileId: record.tileId,
      state: record.state as FogState,
      lastSeenAt: record.lastSeenAt,
      freshUntil: record.freshUntil,
      memoryExpiresAt: record.memoryExpiresAt,
      attributeFreshness: deserializeAttributeFreshness(record.attributeFreshness),
      sharingScope: record.sharingScope,
    }
  }

  private buildPersistencePayload(update: VisionStateMutation, attributes: AttributeFreshnessMap) {
    return {
      state: update.nextState as TileVisionStateType,
      lastSeenAt: update.lastSeenAt ?? null,
      freshUntil: update.freshUntil ?? null,
      memoryExpiresAt: update.memoryExpiresAt ?? getTileMemoryExpiry(update.lastSeenAt ?? new Date()),
      attributeFreshness: serializeAttributeFreshness(attributes),
    }
  }
}

function deserializeAttributeFreshness(raw: Prisma.JsonValue | null): AttributeFreshnessMap {
  if (!raw || typeof raw !== "object") return {}
  const map: AttributeFreshnessMap = {}
  ATTRIBUTE_KEYS.forEach((key) => {
    const entry = (raw as Record<string, AttributeFreshnessEntry | string | undefined>)[key]
    if (!entry) return
    if (typeof entry === "string") {
      map[key] = { seenAt: entry }
    } else if (typeof entry === "object" && entry !== null && "seenAt" in entry) {
      const seenAt = typeof entry.seenAt === "string" ? entry.seenAt : new Date(entry.seenAt as string).toISOString()
      map[key] = {
        seenAt,
        value: "value" in entry ? (entry as AttributeFreshnessEntry).value : undefined,
        source: "source" in entry ? (entry as AttributeFreshnessEntry).source : undefined,
      }
    }
  })
  return map
}

function serializeAttributeFreshness(map: AttributeFreshnessMap): Prisma.JsonValue {
  const payload: Record<string, AttributeFreshnessEntry> = {}
  ATTRIBUTE_KEYS.forEach((key) => {
    const entry = map[key]
    if (entry) {
      payload[key] = entry
    }
  })
  return payload
}
