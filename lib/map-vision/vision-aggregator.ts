import {
  AllianceMemberState,
  MapTile,
  MapTileType,
  VisionSharingScope,
  VisionSourceType,
} from "@prisma/client"
import { prisma } from "@/lib/db"
import { MapCoordinateService } from "./coordinate-service"
import { PassiveSourceBuilder } from "./passive-source-builder"
import { type AttributeStatus, VISION_DEFAULTS, getAttributeStatus, getTileMemoryExpiry, populationToBand, wallLevelToBand } from "./config"
import {
  FogState,
  type AttributeFreshnessMap,
  type AttributeKey,
  type Coordinate,
  type CoordinateRange,
  type CoverageHit,
  type TileState,
  type VisionQuery,
  type VisionSourceInput,
} from "./types"
import { VisionStateStore, type TileVisionStateRecord, type VisionStateMutation } from "./vision-state-store"

interface VisionAggregatorOptions {
  coordinateService?: MapCoordinateService
  passiveSourceBuilder?: PassiveSourceBuilder
}

interface CoverageSnapshot {
  hits: CoverageHit[]
  expiresAt?: Date | null
  sourceClasses: Set<string>
}

interface CoverageMaps {
  personal: Map<string, CoverageSnapshot>
  alliance: Map<string, CoverageSnapshot>
}

type VisionScope = "PLAYER" | "ALLIANCE"

interface ViewportCoordinate {
  coordinate: Coordinate
  key: string
  tile: MapTile
}

interface VillageSummary {
  id: string
  name: string
  x: number
  y: number
  playerId: string
  playerName: string
  allianceId: string | null
  allianceTag: string | null
  population: number
  populationBandId: string | null
  populationBandLabel: string | null
  wallLevel: number | null
  wallBandId: string | null
  wallBandLabel: string | null
  isCapital: boolean
  updatedAt: Date
}

export class VisionAggregator {
  private readonly coordinates: MapCoordinateService
  private readonly passiveSources: PassiveSourceBuilder

  constructor(options?: VisionAggregatorOptions) {
    this.coordinates = options?.coordinateService ?? new MapCoordinateService()
    this.passiveSources = options?.passiveSourceBuilder ?? new PassiveSourceBuilder({ coordinateService: this.coordinates })
  }

  async queryTiles(query: VisionQuery): Promise<TileState[]> {
    const now = new Date()
    const radius = this.coordinates.getRadiusForScale(query.scale, query.radius)
    const viewportRange = this.coordinates.getBoundingRange(query.center, radius)
    const viewportCoords = await this.buildViewport(query.gameWorldId, viewportRange)
    const tileIds = viewportCoords.map((entry) => entry.tile.id)

    const [villages, stateStore, coverage] = await Promise.all([
      this.fetchVillages(viewportRange, query.gameWorldId),
      this.loadStateStore(tileIds, query),
      this.buildCoverageMaps(query, viewportRange, viewportCoords, now),
    ])

    const villageByKey = new Map<string, VillageSummary>()
    villages.forEach((village) => {
      villageByKey.set(this.coordinates.formatCoordinate({ x: village.x, y: village.y }), village)
    })

    const tileStates: TileState[] = []
    const mutations: VisionStateMutation[] = []

    for (const entry of viewportCoords) {
      const occupant = villageByKey.get(entry.key)
      const personalCoverage = coverage.personal.get(entry.key)
      const allianceCoverage = coverage.alliance.get(entry.key)
      const personalRecord = stateStore.personalStates.get(entry.tile.id)
      const allianceRecord = stateStore.allianceStates.get(entry.tile.id)

      const personalProjection = this.projectState({
        scope: "PLAYER",
        tileId: entry.tile.id,
        record: personalRecord,
        coverage: personalCoverage,
        occupant,
        now,
        mutations,
        canPersist: Boolean(query.viewerPlayerId),
      })

      const allianceProjection = this.projectState({
        scope: "ALLIANCE",
        tileId: entry.tile.id,
        record: allianceRecord,
        coverage: allianceCoverage,
        occupant,
        now,
        mutations,
        canPersist: Boolean(query.viewerAllianceId),
      })

      const resolved = this.composeTileState(entry, occupant, {
        personalCoverage,
        allianceCoverage,
        personalProjection,
        allianceProjection,
      })

      tileStates.push(resolved)
    }

    await stateStore.persist(mutations)

    return tileStates
  }

  private async buildCoverageMaps(
    query: VisionQuery,
    viewportRange: CoordinateRange,
    viewportCoords: ViewportCoordinate[],
    now: Date,
  ): Promise<CoverageMaps> {
    const passiveSources = await this.passiveSources.build(query, viewportRange)
    const activeSources = await this.fetchActiveSources(query, now)

    const personalSources = [...passiveSources.personal, ...activeSources.personal]
    const allianceSources = [...passiveSources.alliance, ...activeSources.alliance]

    const personalMap = this.buildCoverageMap(personalSources, viewportCoords, now)
    const allianceMap = this.buildCoverageMap(allianceSources, viewportCoords, now)

    return { personal: personalMap, alliance: allianceMap }
  }

  private buildCoverageMap(sources: VisionSourceInput[], coords: ViewportCoordinate[], now: Date) {
    const map = new Map<string, CoverageSnapshot>()
    sources.forEach((source) => {
      if (source.freshUntil && source.freshUntil.getTime() <= now.getTime()) {
        return
      }
      coords.forEach((entry) => {
        const distance = this.coordinates.distanceBetween(entry.coordinate, source.center)
        if (distance <= source.radius) {
          const snapshot = map.get(entry.key) ?? { hits: [], sourceClasses: new Set<string>(), expiresAt: null }
          const sourceClass =
            typeof source.metadata?.sourceClass === "string"
              ? (source.metadata.sourceClass as string)
              : `active-${source.sourceType.toLowerCase()}`
          snapshot.hits.push({
            sourceId: source.id,
            sourceType: source.sourceType as VisionSourceType,
            sharingScope: source.sharingScope,
            expiresAt: source.freshUntil?.toISOString() ?? null,
            sourceClass,
          })
          snapshot.sourceClasses.add(sourceClass)
          if (source.freshUntil) {
            if (!snapshot.expiresAt || source.freshUntil.getTime() > snapshot.expiresAt.getTime()) {
              snapshot.expiresAt = source.freshUntil
            }
          } else {
            snapshot.expiresAt = null
          }
          map.set(entry.key, snapshot)
        }
      })
    })
    return map
  }

  private async fetchActiveSources(query: VisionQuery, now: Date) {
    const clauses = []
    if (query.viewerPlayerId) {
      clauses.push({ ownerPlayerId: query.viewerPlayerId })
    }
    if (query.viewerAllianceId) {
      clauses.push({ ownerAllianceId: query.viewerAllianceId })
    }
    clauses.push({ sharingScope: VisionSharingScope.WORLD })

    const sources = await prisma.visionSource.findMany({
      where: {
        gameWorldId: query.gameWorldId,
        sourceType: { in: ["PATROL", "PROBE", "BEACON"] },
        ...(clauses.length ? { OR: clauses } : {}),
        AND: [
          {
            OR: [
              { freshUntil: null },
              { freshUntil: { gt: now } },
            ],
          },
        ],
      },
    })

    const personal: VisionSourceInput[] = []
    const alliance: VisionSourceInput[] = []

    sources.forEach((source) => {
      const sourceInput: VisionSourceInput = {
        id: source.id,
        ownerPlayerId: source.ownerPlayerId ?? undefined,
        ownerAllianceId: source.ownerAllianceId ?? undefined,
        sourceType: source.sourceType,
        center: { x: source.centerX, y: source.centerY },
        radius: source.radius,
        freshUntil: source.freshUntil ?? undefined,
        sharingScope: source.sharingScope,
        metadata: { sourceClass: `active-${source.sourceType.toLowerCase()}` },
      }

      if (source.sharingScope === "PERSONAL" && source.ownerPlayerId === query.viewerPlayerId) {
        personal.push(sourceInput)
      } else if (source.sharingScope === "ALLIANCE" && source.ownerAllianceId === query.viewerAllianceId) {
        alliance.push(sourceInput)
      } else if (source.sharingScope === "WORLD") {
        personal.push(sourceInput)
        alliance.push(sourceInput)
      } else if (source.sharingScope === "TREATY") {
        if (source.ownerPlayerId === query.viewerPlayerId) {
          personal.push(sourceInput)
        } else if (source.ownerAllianceId === query.viewerAllianceId) {
          alliance.push(sourceInput)
        }
      }
    })

    return { personal, alliance }
  }

  private composeTileState(
    entry: ViewportCoordinate,
    occupant: VillageSummary | undefined,
    context: {
      personalCoverage?: CoverageSnapshot
      allianceCoverage?: CoverageSnapshot
      personalProjection?: TileVisionStateRecord
      allianceProjection?: TileVisionStateRecord
    },
  ): TileState {
    const { personalCoverage, allianceCoverage, personalProjection, allianceProjection } = context
    const stateResolution = this.resolveFogState(personalCoverage, allianceCoverage, personalProjection, allianceProjection)
    const attributeFreshness = stateResolution.attributeSource?.attributeFreshness ?? {}
    const sourceClasses = [
      ...(personalCoverage ? Array.from(personalCoverage.sourceClasses) : []),
      ...(allianceCoverage ? Array.from(allianceCoverage.sourceClasses) : []),
    ]

    const metadata = this.buildMetadata(stateResolution.state, occupant, attributeFreshness, stateResolution.attributeSource)

    return {
      tileId: entry.tile.id,
      coordinate: entry.coordinate,
      tileType: occupant ? MapTileType.VILLAGE : entry.tile.tileType,
      state: stateResolution.state,
      lastSeenAt: stateResolution.attributeSource?.lastSeenAt?.toISOString(),
      freshUntil: stateResolution.freshUntil?.toISOString() ?? undefined,
      memoryExpiresAt: stateResolution.attributeSource?.memoryExpiresAt?.toISOString(),
      attributeFreshness,
      sourceClasses,
      metadata,
    }
  }

  private resolveFogState(
    personalCoverage?: CoverageSnapshot,
    allianceCoverage?: CoverageSnapshot,
    personalProjection?: TileVisionStateRecord,
    allianceProjection?: TileVisionStateRecord,
  ) {
    if (personalCoverage) {
      return {
        state: FogState.FRESH,
        attributeSource: personalProjection ?? allianceProjection,
        freshUntil: personalCoverage.expiresAt ?? null,
      }
    }
    if (allianceCoverage) {
      return {
        state: FogState.FRESH,
        attributeSource: allianceProjection ?? personalProjection,
        freshUntil: allianceCoverage.expiresAt ?? null,
      }
    }

    if (personalProjection && personalProjection.state !== FogState.UNKNOWN) {
      return { state: personalProjection.state, attributeSource: personalProjection, freshUntil: personalProjection.freshUntil ?? null }
    }

    if (allianceProjection && allianceProjection.state !== FogState.UNKNOWN) {
      return { state: allianceProjection.state, attributeSource: allianceProjection, freshUntil: allianceProjection.freshUntil ?? null }
    }

    return { state: FogState.UNKNOWN, attributeSource: undefined, freshUntil: null }
  }

  private buildMetadata(
    state: FogState,
    occupant: VillageSummary | undefined,
    attributeFreshness: AttributeFreshnessMap,
    record?: TileVisionStateRecord,
  ) {
    if (!occupant && state === FogState.UNKNOWN) {
      return undefined
    }

    const ownerEntry = attributeFreshness.owner
    const populationEntry = attributeFreshness.population
    const wallEntry = attributeFreshness.wall

    return {
      occupantType: occupant ? "VILLAGE" : "EMPTY",
      villageId: occupant?.id ?? (ownerEntry?.value as Record<string, unknown> | undefined)?.villageId ?? null,
      villageName: occupant?.name ?? (ownerEntry?.value as Record<string, unknown> | undefined)?.villageName ?? null,
      ownerName: state === FogState.FRESH ? occupant?.playerName : (ownerEntry?.value as Record<string, unknown> | undefined)?.playerName ?? null,
      allianceTag:
        state === FogState.FRESH ? occupant?.allianceTag : (ownerEntry?.value as Record<string, unknown> | undefined)?.allianceTag ?? null,
      isCapital: state === FogState.FRESH ? occupant?.isCapital ?? false : Boolean((ownerEntry?.value as Record<string, unknown> | undefined)?.isCapital),
      population: state === FogState.FRESH ? occupant?.population ?? null : null,
      populationBand:
        state === FogState.FRESH
          ? occupant?.populationBandLabel ?? null
          : (populationEntry?.value as Record<string, unknown> | undefined)?.bandLabel ?? null,
      wallLevel: state === FogState.FRESH ? occupant?.wallLevel ?? null : null,
      wallBand:
        state === FogState.FRESH ? occupant?.wallBandLabel ?? null : (wallEntry?.value as Record<string, unknown> | undefined)?.bandLabel ?? null,
      lastSeenAt: record?.lastSeenAt?.toISOString(),
      attributeStates: {
        owner: this.describeAttributeStatus("owner", attributeFreshness.owner),
        population: this.describeAttributeStatus("population", attributeFreshness.population),
        wall: this.describeAttributeStatus("wall", attributeFreshness.wall),
      },
    }
  }

  private describeAttributeStatus(
    key: AttributeKey,
    entry?: AttributeFreshnessMap[keyof AttributeFreshnessMap],
  ): { status: AttributeStatus; seenAt?: string } | undefined {
    if (!entry) return undefined
    const status = getAttributeStatus(entry, key)
    return {
      status,
      seenAt: entry.seenAt,
    }
  }

  private projectState(input: {
    scope: VisionScope
    tileId: string
    record?: TileVisionStateRecord
    coverage?: CoverageSnapshot
    occupant?: VillageSummary
    now: Date
    mutations: VisionStateMutation[]
    canPersist: boolean
  }): TileVisionStateRecord | undefined {
    if (!input.canPersist) return input.record
    const { record, coverage, occupant, now, scope, tileId, mutations } = input

    if (coverage) {
      const attributeFreshness = this.buildAttributeSnapshot(occupant, record)
      const memoryExpiresAt = getTileMemoryExpiry(now)
      const mutation: VisionStateMutation = {
        scope,
        tileId,
        nextState: FogState.FRESH,
        lastSeenAt: now,
        freshUntil: coverage.expiresAt ?? null,
        memoryExpiresAt,
        attributeFreshness,
      }
      mutations.push(mutation)
      return {
        id: record?.id ?? `${scope}-${tileId}`,
        tileId,
        state: FogState.FRESH,
        lastSeenAt: now,
        freshUntil: coverage.expiresAt ?? null,
        memoryExpiresAt,
        attributeFreshness,
        sharingScope: scope === "PLAYER" ? VisionSharingScope.PERSONAL : VisionSharingScope.ALLIANCE,
      }
    }

    if (!record) return undefined

    const memoryExpired = Boolean(record.memoryExpiresAt && record.memoryExpiresAt.getTime() <= now.getTime())
    if (memoryExpired && record.state !== FogState.UNKNOWN) {
      mutations.push({
        scope,
        tileId,
        nextState: FogState.UNKNOWN,
        lastSeenAt: record.lastSeenAt ?? undefined,
        freshUntil: null,
        memoryExpiresAt: record.memoryExpiresAt ?? undefined,
        attributeFreshness: {},
      })
      return { ...record, state: FogState.UNKNOWN, attributeFreshness: {} }
    }

    if (record.state === FogState.FRESH) {
      mutations.push({
        scope,
        tileId,
        nextState: FogState.KNOWN_STALE,
        lastSeenAt: record.lastSeenAt ?? undefined,
        freshUntil: null,
        memoryExpiresAt: record.memoryExpiresAt ?? undefined,
        attributeFreshness: record.attributeFreshness,
      })
      return { ...record, state: FogState.KNOWN_STALE, freshUntil: null }
    }

    return record
  }

  private buildAttributeSnapshot(occupant: VillageSummary | undefined, record?: TileVisionStateRecord): AttributeFreshnessMap {
    const next: AttributeFreshnessMap = cloneAttributeMap(record?.attributeFreshness)
    if (!occupant) return next
    const seenAt = new Date().toISOString()
    next.owner = {
      seenAt,
      value: {
        playerId: occupant.playerId,
        playerName: occupant.playerName,
        allianceId: occupant.allianceId,
        allianceTag: occupant.allianceTag,
        isCapital: occupant.isCapital,
        villageId: occupant.id,
        villageName: occupant.name,
      },
    }
    next.population = {
      seenAt,
      value: {
        exact: occupant.population,
        bandId: occupant.populationBandId,
        bandLabel: occupant.populationBandLabel,
      },
    }
    next.wall = {
      seenAt,
      value: {
        level: occupant.wallLevel,
        bandId: occupant.wallBandId,
        bandLabel: occupant.wallBandLabel,
      },
    }
    return next
  }

  private async loadStateStore(tileIds: string[], query: VisionQuery) {
    const store = new VisionStateStore({
      viewerPlayerId: query.viewerPlayerId,
      viewerAllianceId: query.viewerAllianceId,
    })
    await store.load(tileIds)
    return store
  }

  private async buildViewport(gameWorldId: string, range: CoordinateRange): Promise<ViewportCoordinate[]> {
    let tiles = await prisma.mapTile.findMany({
      where: {
        gameWorldId,
        x: { gte: range.minX, lte: range.maxX },
        y: { gte: range.minY, lte: range.maxY },
      },
    })

    const existingKeys = new Set(tiles.map((tile) => this.coordinates.formatCoordinate({ x: tile.x, y: tile.y })))
    const missing: { gameWorldId: string; x: number; y: number; tileType: MapTileType }[] = []

    for (let x = range.minX; x <= range.maxX; x++) {
      for (let y = range.minY; y <= range.maxY; y++) {
        const key = this.coordinates.formatCoordinate({ x, y })
        if (!existingKeys.has(key)) {
          missing.push({ gameWorldId, x, y, tileType: MapTileType.EMPTY })
        }
      }
    }

    if (missing.length > 0) {
      await prisma.mapTile.createMany({ data: missing, skipDuplicates: true })
      tiles = await prisma.mapTile.findMany({
        where: {
          gameWorldId,
          x: { gte: range.minX, lte: range.maxX },
          y: { gte: range.minY, lte: range.maxY },
        },
      })
    }

    const tilesByCoord = new Map<string, MapTile>()
    tiles.forEach((tile) => {
      tilesByCoord.set(this.coordinates.formatCoordinate({ x: tile.x, y: tile.y }), tile)
    })

    const viewport: ViewportCoordinate[] = []
    for (let x = range.minX; x <= range.maxX; x++) {
      for (let y = range.minY; y <= range.maxY; y++) {
        const coordinate = { x, y }
        const key = this.coordinates.formatCoordinate(coordinate)
        const tile = tilesByCoord.get(key)
        if (!tile) continue
        viewport.push({ coordinate, key, tile })
      }
    }
    return viewport
  }

  private async fetchVillages(range: CoordinateRange, gameWorldId: string): Promise<VillageSummary[]> {
    const villages = await prisma.village.findMany({
      where: {
        x: { gte: range.minX, lte: range.maxX },
        y: { gte: range.minY, lte: range.maxY },
        player: {
          gameWorldId,
        },
      },
      select: {
        id: true,
        name: true,
        x: true,
        y: true,
        playerId: true,
        population: true,
        isCapital: true,
        updatedAt: true,
        player: {
          select: {
            playerName: true,
            allianceMemberships: {
              where: { state: AllianceMemberState.ACTIVE },
              select: {
                alliance: {
                  select: {
                    id: true,
                    tag: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        buildings: {
          where: {
            type: {
              in: ["WALL", "EARTH_WALL"],
            },
          },
          select: {
            type: true,
            level: true,
          },
        },
      },
    })

    return villages.map((village) => {
      const alliance = village.player.allianceMemberships?.[0]?.alliance
      const wallLevel = village.buildings[0]?.level ?? null
      const populationBand = populationToBand(village.population)
      const wallBand = wallLevelToBand(wallLevel)
      return {
        id: village.id,
        name: village.name,
        x: village.x,
        y: village.y,
        playerId: village.playerId,
        playerName: village.player.playerName,
        allianceId: alliance?.id ?? null,
        allianceTag: alliance?.tag ?? null,
        population: village.population,
        populationBandId: populationBand?.id ?? null,
        populationBandLabel: populationBand?.label ?? null,
        wallLevel,
        wallBandId: wallBand?.id ?? null,
        wallBandLabel: wallBand?.label ?? null,
        isCapital: village.isCapital,
        updatedAt: village.updatedAt,
      } satisfies VillageSummary
    })
  }
}

function cloneAttributeMap(source?: AttributeFreshnessMap): AttributeFreshnessMap {
  if (!source) return {}
  const clone: AttributeFreshnessMap = {}
  ;(Object.keys(source) as AttributeKey[]).forEach((key) => {
    const entry = source[key]
    if (!entry) return
    clone[key] = {
      seenAt: entry.seenAt,
      source: entry.source,
      value: entry.value ? JSON.parse(JSON.stringify(entry.value)) : entry.value,
    }
  })
  return clone
}
