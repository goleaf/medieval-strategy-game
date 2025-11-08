import { AllianceMemberState, MapTileType } from "@prisma/client"
import { prisma } from "@/lib/db"
import { MapCoordinateService } from "./coordinate-service"
import {
  FogState,
  type MapScale,
  type TileState,
  type VisionQuery,
} from "./types"

interface VisionAggregatorOptions {
  coordinateService?: MapCoordinateService
}

type VillageSummary = {
  id: string
  name: string
  x: number
  y: number
  playerId: string
  playerName: string
  allianceId: string | null
  allianceTag: string | null
  population: number
  isCapital: boolean
  updatedAt: Date
}

export class VisionAggregator {
  private readonly coordinates: MapCoordinateService

  constructor(options?: VisionAggregatorOptions) {
    this.coordinates = options?.coordinateService ?? new MapCoordinateService()
  }

  async queryTiles(query: VisionQuery): Promise<TileState[]> {
    const radius = this.coordinates.getRadiusForScale(query.scale, query.radius)
    const range = this.coordinates.getBoundingRange(query.center, radius)
    const villages = await this.fetchVillages(range, query.gameWorldId)
    const occupied = new Map<string, VillageSummary>()
    villages.forEach((village) => {
      occupied.set(this.coordinates.formatCoordinate({ x: village.x, y: village.y }), village)
    })

    const tiles: TileState[] = []
    for (let x = range.minX; x <= range.maxX; x++) {
      for (let y = range.minY; y <= range.maxY; y++) {
        const coordinateKey = this.coordinates.formatCoordinate({ x, y })
        const occupant = occupied.get(coordinateKey)
        tiles.push(this.buildTileState({ x, y }, occupant, query.viewerPlayerId, query.viewerAllianceId))
      }
    }

    return tiles
  }

  private async fetchVillages(range: { minX: number; maxX: number; minY: number; maxY: number }, gameWorldId: string) {
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
        player: {
          select: {
            playerName: true,
            allianceMemberships: {
              select: {
                alliance: {
                  select: {
                    id: true,
                    tag: true,
                  },
                },
              },
              where: {
                state: AllianceMemberState.ACTIVE,
              },
              take: 1,
            },
          },
        },
        population: true,
        isCapital: true,
        updatedAt: true,
      },
    })

    return villages.map((village) => {
      const activeAlliance = village.player.allianceMemberships?.[0]?.alliance
      return {
        id: village.id,
        name: village.name,
        x: village.x,
        y: village.y,
        playerId: village.playerId,
        playerName: village.player.playerName,
        allianceId: activeAlliance?.id ?? null,
        allianceTag: activeAlliance?.tag ?? null,
        population: village.population,
        isCapital: village.isCapital,
        updatedAt: village.updatedAt,
      } satisfies VillageSummary
    })
  }

  private buildTileState(
    coordinate: { x: number; y: number },
    occupant: VillageSummary | undefined,
    viewerPlayerId?: string,
    viewerAllianceId?: string,
  ): TileState {
    if (!occupant) {
      return {
        tileId: this.coordinates.formatCoordinate(coordinate),
        coordinate,
        tileType: MapTileType.EMPTY,
        state: FogState.UNKNOWN,
        attributeFreshness: {},
        sourceClasses: [],
      }
    }

    const isViewerVillage = viewerPlayerId && occupant.playerId === viewerPlayerId
    const isAllianceVillage = Boolean(viewerAllianceId && occupant.allianceId === viewerAllianceId)
    const state = isViewerVillage ? FogState.FRESH : isAllianceVillage ? FogState.KNOWN_STALE : FogState.KNOWN_STALE
    const sourceClasses = [
      isViewerVillage ? "personal-passive" : isAllianceVillage ? "alliance-passive" : "stubbed-passive",
    ]

    return {
      tileId: occupant.id,
      coordinate,
      tileType: MapTileType.VILLAGE,
      state,
      lastSeenAt: occupant.updatedAt.toISOString(),
      attributeFreshness: {
        owner: occupant.updatedAt.toISOString(),
        population: occupant.updatedAt.toISOString(),
        wall: occupant.updatedAt.toISOString(),
      },
      sourceClasses,
      metadata: {
        villageName: occupant.name,
        ownerName: occupant.playerName,
        allianceTag: occupant.allianceTag,
        population: occupant.population,
        isCapital: occupant.isCapital,
      },
    }
  }
}
