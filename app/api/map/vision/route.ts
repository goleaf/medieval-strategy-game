import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { MapCoordinateService } from "@/lib/map-vision/coordinate-service"
import { VisionAggregator } from "@/lib/map-vision/vision-aggregator"
import type { MapScale } from "@/lib/map-vision/types"

const coordinateService = new MapCoordinateService()
const aggregator = new VisionAggregator({ coordinateService })
const SCALE_SET = new Set<MapScale>(["REGION", "PROVINCE", "WORLD"])

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const gameWorldId = params.get("gameWorldId")
    if (!gameWorldId) {
      return errorResponse("gameWorldId is required", 400)
    }

    const centerParam = params.get("center") ?? buildCoordinateString(params.get("x"), params.get("y"))
    if (!centerParam) {
      return errorResponse("center coordinate is required", 400)
    }

    const center = coordinateService.parseCoordinate(centerParam)
    const scale = normalizeScale(params.get("scale"))
    const radiusOverride = params.get("radius")
    const parsedRadius = radiusOverride ? Number.parseInt(radiusOverride, 10) : undefined
    if (parsedRadius && (Number.isNaN(parsedRadius) || parsedRadius <= 0)) {
      return errorResponse("radius must be a positive integer", 400)
    }

    const radius = coordinateService.getRadiusForScale(scale, parsedRadius)
    if (radius > 150) {
      return errorResponse("radius too large for this endpoint", 422)
    }

    const viewerPlayerId = params.get("viewerPlayerId") ?? undefined
    const viewerAllianceId = params.get("viewerAllianceId") ?? undefined

    const tiles = await aggregator.queryTiles({
      gameWorldId,
      viewerPlayerId,
      viewerAllianceId,
      center,
      radius,
      scale,
    })

    return successResponse({
      center,
      radius,
      scale,
      extent: coordinateService.extent,
      block: coordinateService.toBlockId(center),
      tiles,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

function normalizeScale(raw: string | null): MapScale {
  if (!raw) return "REGION"
  const upper = raw.toUpperCase() as MapScale
  return SCALE_SET.has(upper) ? upper : "REGION"
}

function buildCoordinateString(x: string | null, y: string | null) {
  if (!x || !y) return null
  return `${x}|${y}`
}
