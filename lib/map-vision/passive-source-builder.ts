import { AllianceMemberState } from "@prisma/client"
import { prisma } from "@/lib/db"
import { MapCoordinateService } from "./coordinate-service"
import { MAX_PASSIVE_RADIUS, VISION_DEFAULTS, calculateWatchtowerBonus } from "./config"
import type { CoordinateRange, VisionQuery, VisionSourceInput } from "./types"

interface PassiveSourceBuilderOptions {
  coordinateService?: MapCoordinateService
}

interface PassiveSourceResult {
  personal: VisionSourceInput[]
  alliance: VisionSourceInput[]
}

const WATCHTOWER_KEY = "WATCHTOWER"
const WALL_TYPES = ["WALL", "EARTH_WALL"]

export class PassiveSourceBuilder {
  private readonly coordinates: MapCoordinateService

  constructor(options?: PassiveSourceBuilderOptions) {
    this.coordinates = options?.coordinateService ?? new MapCoordinateService()
  }

  async build(query: VisionQuery, viewportRange: CoordinateRange): Promise<PassiveSourceResult> {
    if (!query.viewerPlayerId && !query.viewerAllianceId) {
      return { personal: [], alliance: [] }
    }

    const fetchRange = this.expandRange(viewportRange)
    const [villages, garrisons] = await Promise.all([
      this.fetchRelevantVillages(query, fetchRange),
      this.fetchReinforcementStacks(query, fetchRange),
    ])

    const personalSources: VisionSourceInput[] = []
    const allianceSources: VisionSourceInput[] = []

    for (const village of villages) {
      const watchtowerLevel = village.buildings.find((b) => b.type === WATCHTOWER_KEY)?.level ?? 0
      const radius = VISION_DEFAULTS.villagePassiveRadius + calculateWatchtowerBonus(watchtowerLevel)

      if (query.viewerPlayerId && village.playerId === query.viewerPlayerId) {
        personalSources.push({
          sourceType: "VILLAGE",
          ownerPlayerId: query.viewerPlayerId,
          center: { x: village.x, y: village.y },
          radius,
          sharingScope: "PERSONAL",
          metadata: {
            villageId: village.id,
            sourceClass: VISION_DEFAULTS.passiveSourceClassPersonal,
            watchtowerLevel,
          },
        })
      }

      if (query.viewerAllianceId && village.activeAllianceId === query.viewerAllianceId) {
        allianceSources.push({
          sourceType: "VILLAGE",
          ownerAllianceId: query.viewerAllianceId,
          center: { x: village.x, y: village.y },
          radius,
          sharingScope: "ALLIANCE",
          metadata: {
            villageId: village.id,
            sourceClass: VISION_DEFAULTS.passiveSourceClassAlliance,
            watchtowerLevel,
          },
        })
      }
    }

    if (query.viewerPlayerId) {
      garrisons.forEach((stack) => {
        personalSources.push({
          sourceType: "REINFORCEMENT",
          ownerPlayerId: query.viewerPlayerId,
          center: { x: stack.village.x, y: stack.village.y },
          radius: VISION_DEFAULTS.reinforcementPassiveRadius,
          sharingScope: "PERSONAL",
          metadata: {
            villageId: stack.village.id,
            sourceClass: VISION_DEFAULTS.reinforcementSourceClass,
          },
        })
      })
    }

    return { personal: personalSources, alliance: allianceSources }
  }

  private expandRange(range: CoordinateRange): CoordinateRange {
    const extent = this.coordinates.extent
    return {
      minX: Math.max(extent.minX, range.minX - MAX_PASSIVE_RADIUS),
      maxX: Math.min(extent.maxX, range.maxX + MAX_PASSIVE_RADIUS),
      minY: Math.max(extent.minY, range.minY - MAX_PASSIVE_RADIUS),
      maxY: Math.min(extent.maxY, range.maxY + MAX_PASSIVE_RADIUS),
    }
  }

  private async fetchRelevantVillages(query: VisionQuery, range: CoordinateRange) {
    const clauses: object[] = []
    if (query.viewerPlayerId) {
      clauses.push({ playerId: query.viewerPlayerId })
    }
    if (query.viewerAllianceId) {
      clauses.push({
        player: {
          allianceMemberships: {
            some: {
              allianceId: query.viewerAllianceId,
              state: AllianceMemberState.ACTIVE,
            },
          },
        },
      })
    }

    if (clauses.length === 0) return []

    return prisma.village.findMany({
      where: {
        x: { gte: range.minX, lte: range.maxX },
        y: { gte: range.minY, lte: range.maxY },
        player: {
          gameWorldId: query.gameWorldId,
        },
        OR: clauses,
      },
      select: {
        id: true,
        playerId: true,
        x: true,
        y: true,
        isCapital: true,
        player: {
          select: {
            allianceMemberships: {
              where: {
                state: AllianceMemberState.ACTIVE,
              },
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
              in: [WATCHTOWER_KEY, ...WALL_TYPES],
            },
          },
          select: {
            type: true,
            level: true,
          },
        },
      },
    }).then((villages) =>
      villages.map((village) => {
        const alliance = village.player.allianceMemberships?.[0]?.alliance
        return {
          id: village.id,
          playerId: village.playerId,
          x: village.x,
          y: village.y,
          isCapital: village.isCapital,
          activeAllianceId: alliance?.id ?? null,
          allianceTag: alliance?.tag ?? null,
          buildings: village.buildings,
        }
      }),
    )
  }

  private async fetchReinforcementStacks(query: VisionQuery, range: CoordinateRange) {
    if (!query.viewerPlayerId) return []
    return prisma.garrisonStack.findMany({
      where: {
        ownerAccountId: query.viewerPlayerId,
        village: {
          x: { gte: range.minX, lte: range.maxX },
          y: { gte: range.minY, lte: range.maxY },
          player: {
            gameWorldId: query.gameWorldId,
          },
        },
      },
      select: {
        village: {
          select: {
            id: true,
            x: true,
            y: true,
          },
        },
      },
    }).then((stacks) => {
      const seen = new Set<string>()
      return stacks.filter((stack) => {
        if (seen.has(stack.village.id)) return false
        seen.add(stack.village.id)
        return true
      })
    })
  }
}
