import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { mapQuerySchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const params = {
      centerX: Number(req.nextUrl.searchParams.get("centerX")) || 50,
      centerY: Number(req.nextUrl.searchParams.get("centerY")) || 50,
      zoom: Number(req.nextUrl.searchParams.get("zoom")) || 1,
      playerId: req.nextUrl.searchParams.get("playerId"),
    }

    const validated = mapQuerySchema.safeParse(params)
    if (!validated.success) {
      return errorResponse(validated.error, 400)
    }

    const { centerX, centerY, zoom, playerId } = validated.data

    // Get world config for bounds
    const config = await prisma.worldConfig.findFirst()
    const maxX = config?.maxX || 100
    const maxY = config?.maxY || 100

    const viewSize = Math.floor(20 / zoom)
    const startX = Math.max(0, centerX - Math.floor(viewSize / 2))
    const startY = Math.max(0, centerY - Math.floor(viewSize / 2))
    const endX = Math.min(maxX, startX + viewSize)
    const endY = Math.min(maxY, startY + viewSize)

    // Get player's villages for fog of war
    let playerVillages: Array<{ x: number; y: number }> = []
    if (playerId) {
      const villages = await prisma.village.findMany({
        where: { playerId },
        select: { x: true, y: true },
      })
      playerVillages = villages
    }

    // Get all villages in view
    const villages = await prisma.village.findMany({
      where: {
        x: { gte: startX, lte: endX },
        y: { gte: startY, lte: endY },
      },
      select: {
        id: true,
        x: true,
        y: true,
        name: true,
        playerId: true,
        player: { select: { playerName: true } },
      },
    })

    // Get scouting data for fog of war
    const scoutedVillages = new Set<string>()
    if (playerId) {
      const scoutingAttacks = await prisma.attack.findMany({
        where: {
          fromVillage: { playerId },
          type: "SCOUT",
          status: "RESOLVED",
          attackerWon: true,
        },
        select: { toVillageId: true },
      })
      scoutingAttacks.forEach((a) => {
        if (a.toVillageId) scoutedVillages.add(a.toVillageId)
      })
    }

    const mapTiles = []
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const village = villages.find((v) => v.x === x && v.y === y)
        const isOwnVillage = playerId && village && village.playerId === playerId
        const isScouted = village && (isOwnVillage || scoutedVillages.has(village.id))
        const isVisible = !playerId || isOwnVillage || isScouted

        mapTiles.push({
          x,
          y,
          type: village ? "village" : "empty",
          village: village && isVisible
            ? {
                id: village.id,
                name: village.name,
                playerName: village.player.playerName,
                isOwn: isOwnVillage || false,
              }
            : village
              ? { id: village.id, name: "Unknown", playerName: "Unknown", isOwn: false }
              : null,
          fogOfWar: !isVisible,
        })
      }
    }

    return successResponse({
      tiles: mapTiles,
      bounds: { startX, startY, endX, endY },
      center: { x: centerX, y: centerY },
      zoom,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
