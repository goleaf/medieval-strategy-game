import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { MapCoordinateService } from "@/lib/map-vision/coordinate-service"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"

const coordinateService = new MapCoordinateService()

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const hoursParam = params.get("hours")
    const hours = hoursParam ? Number.parseInt(hoursParam, 10) : 48
    if (Number.isNaN(hours) || hours <= 0 || hours > 168) {
      return errorResponse("hours must be a positive integer up to 168", 400)
    }
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const [recentConquests, recentAbandoned] = await Promise.all([
      prisma.village.findMany({
        where: {
          createdAt: { gte: since },
          conqueredFromPlayerId: { not: null },
        },
        select: {
          id: true,
          name: true,
          x: true,
          y: true,
          population: true,
          playerId: true,
          player: { select: { id: true, playerName: true, tribe: { select: { id: true, tag: true, name: true } } } },
          conqueredFromPlayerId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.barbarian.findMany({
        where: { spawnedAt: { gte: since }, villageId: { not: null } },
        select: {
          id: true,
          x: true,
          y: true,
          villageId: true,
          spawnedAt: true,
          village: {
            select: {
              name: true,
              population: true,
              player: { select: { id: true, playerName: true, tribe: { select: { id: true, tag: true, name: true } } } },
            },
          },
        },
        orderBy: { spawnedAt: "desc" },
        take: 200,
      }),
    ])

    const payload = {
      recentlyConquered: recentConquests.map((v) => ({
        id: v.id,
        name: v.name,
        x: v.x,
        y: v.y,
        blockId: coordinateService.toBlockId({ x: v.x, y: v.y }),
        population: v.population,
        newOwner: { id: v.player.id, name: v.player.playerName, tribeTag: v.player.tribe?.tag ?? null },
        prevOwnerId: v.conqueredFromPlayerId,
      })),
      recentlyAbandoned: recentAbandoned.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        blockId: coordinateService.toBlockId({ x: b.x, y: b.y }),
        villageId: b.villageId,
        name: b.village?.name ?? null,
        population: b.village?.population ?? null,
        prevOwner: b.village?.player
          ? { id: b.village.player.id, name: b.village.player.playerName, tribeTag: b.village.player.tribe?.tag ?? null }
          : null,
        spawnedAt: b.spawnedAt.toISOString(),
      })),
    }

    return successResponse(payload)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

