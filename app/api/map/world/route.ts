import { type NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { MapCoordinateService } from "@/lib/map-vision/coordinate-service"
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"

const coordinateService = new MapCoordinateService()

export const GET = withMetrics("GET /api/map/world", async (req: NextRequest) => {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const params = req.nextUrl.searchParams
    const requestedWorldId = params.get("gameWorldId")

    const player = await prisma.player.findUnique({
      where: { id: auth.playerId },
      select: { gameWorldId: true },
    })

    const gameWorldId = requestedWorldId ?? player?.gameWorldId
    if (!gameWorldId) {
      return errorResponse("gameWorldId is required", 400)
    }

    let requestedRanges: RequestedRange[]
    try {
      requestedRanges = getRequestedRanges(req.nextUrl.searchParams)
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid map window request"
      return errorResponse(message, 400)
    }
    // Bounds guard 0..999
    for (const r of requestedRanges) {
      if (
        r.range.minX < 0 || r.range.maxX > 999 || r.range.minY < 0 || r.range.maxY > 999 ||
        r.range.minX > r.range.maxX || r.range.minY > r.range.maxY
      ) {
        return errorResponse("Requested map bounds out of range", 400)
      }
    }
    const rangeFilters = requestedRanges.map((entry) => ({
      x: { gte: entry.range.minX, lte: entry.range.maxX },
      y: { gte: entry.range.minY, lte: entry.range.maxY },
    }))

    const { cache } = await import("@/lib/cache")
    const cacheKey = (() => {
      const base = [`w:${gameWorldId}`]
      requestedRanges.forEach((r) => base.push(`${r.range.minX}-${r.range.maxX}-${r.range.minY}-${r.range.maxY}`))
      return `map:world:${base.join('|')}`
    })()
    const villages = await cache.wrap(cacheKey, 60, async () => prisma.village.findMany({
      where: {
        player: {
          gameWorldId,
        },
        ...(rangeFilters.length > 0 ? { OR: rangeFilters } : {}),
      },
      select: {
        id: true,
        name: true,
        x: true,
        y: true,
        population: true,
        loyalty: true,
        playerId: true,
        player: {
          select: {
            playerName: true,
            tribe: {
              select: {
                id: true,
                name: true,
                tag: true,
              },
            },
          },
        },
        barbarians: {
          select: { id: true },
          take: 1,
        },
      },
    }))

    const payload = villages.map((village) => ({
      id: village.id,
      name: village.name,
      x: village.x,
      y: village.y,
      population: village.population,
      loyalty: village.loyalty,
      playerId: village.playerId,
      playerName: village.player.playerName,
      tribeId: village.player.tribe?.id ?? null,
      tribeTag: village.player.tribe?.tag ?? null,
      tribeName: village.player.tribe?.name ?? null,
      isBarbarian: village.barbarians.length > 0,
      blockId: coordinateService.toBlockId({ x: village.x, y: village.y }),
    }))

    const blockSummaries = buildBlockSummaries(requestedRanges)
    payload.forEach((entry) => {
      const blockId = entry.blockId
      const blockRange = resolveBlockRange(blockSummaries, blockId)
      blockRange.villageCount += 1
    })

    // ETag based on count + block ranges
    const etag = `W/"${payload.length}-${requestedRanges.length}"`
    const ifNoneMatch = req.headers.get('if-none-match')
    const body = {
      gameWorldId,
      villages: payload,
      blocks: Array.from(blockSummaries.values()),
      extent: coordinateService.extent,
      blockSize: coordinateService.blockSize,
      fetchedAt: new Date().toISOString(),
    }
    const headers: Record<string, string> = { 'Cache-Control': 'public, max-age=60', ETag: etag }
    if (auth.rotatedToken) headers['Authentication'] = `Bearer ${auth.rotatedToken}`
    if (ifNoneMatch === etag) {
      return new Response(null, { status: 304, headers })
    }
    return new Response(JSON.stringify({ success: true, data: body }), { status: 200, headers })
  } catch (error) {
    return serverErrorResponse(error)
  }
})

type RequestedRange = {
  blockId?: string
  range: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

function getRequestedRanges(params: URLSearchParams): RequestedRange[] {
  const blocks = collectBlockIds(params)
  const ranges: RequestedRange[] = []
  const seen = new Set<string>()

  blocks.forEach((blockId) => {
    if (seen.has(blockId)) return
    seen.add(blockId)
    ranges.push({ blockId, range: coordinateService.blockIdToRange(blockId) })
  })

  const bbox = parseBoundingBox(params)
  if (bbox) {
    ranges.push({ range: bbox })
  }

  return ranges
}

function collectBlockIds(params: URLSearchParams): string[] {
  const inputs = [...params.getAll("block")]
  const csv = params.get("blocks")
  if (csv) {
    inputs.push(...csv.split(","))
  }

  return inputs
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
}

function parseBoundingBox(params: URLSearchParams) {
  const minX = parseNullableInt(params.get("minX"))
  const maxX = parseNullableInt(params.get("maxX"))
  const minY = parseNullableInt(params.get("minY"))
  const maxY = parseNullableInt(params.get("maxY"))
  if ([minX, maxX, minY, maxY].some((value) => value === null)) {
    return null
  }
  return {
    minX: Math.min(minX!, maxX!),
    maxX: Math.max(minX!, maxX!),
    minY: Math.min(minY!, maxY!),
    maxY: Math.max(minY!, maxY!),
  }
}

function parseNullableInt(value: string | null) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

type BlockSummary = {
  id: string
  range: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  villageCount: number
  requested: boolean
}

function buildBlockSummaries(ranges: RequestedRange[]): Map<string, BlockSummary> {
  const summaries = new Map<string, BlockSummary>()
  ranges
    .filter((entry): entry is RequestedRange & { blockId: string } => Boolean(entry.blockId))
    .forEach((entry) => {
      summaries.set(entry.blockId, {
        id: entry.blockId,
        range: entry.range,
        villageCount: 0,
        requested: true,
      })
    })
  return summaries
}

function resolveBlockRange(map: Map<string, BlockSummary>, blockId: string): BlockSummary {
  let entry = map.get(blockId)
  if (!entry) {
    entry = {
      id: blockId,
      range: coordinateService.blockIdToRange(blockId),
      villageCount: 0,
      requested: false,
    }
    map.set(blockId, entry)
  }
  return entry
}
