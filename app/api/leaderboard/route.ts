import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") || "players"
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 100

    // Check cache first
    const cache = await prisma.leaderboardCache.findUnique({
      where: { type: type.toUpperCase() as any },
    })

    if (cache && cache.updatedAt && Date.now() - cache.updatedAt.getTime() < 5 * 60 * 1000) {
      // Cache is less than 5 minutes old
      return successResponse(JSON.parse(cache.data))
    }

    let leaderboard: any[]

    if (type === "players") {
      leaderboard = await prisma.player.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          playerName: true,
          totalPoints: true,
          rank: true,
          tribe: { select: { name: true, tag: true } },
        },
        orderBy: { rank: "asc" },
        take: limit,
      })
    } else if (type === "tribes") {
      leaderboard = await prisma.tribe.findMany({
        select: {
          id: true,
          name: true,
          tag: true,
          totalPoints: true,
          memberCount: true,
          leader: { select: { playerName: true } },
        },
        orderBy: { totalPoints: "desc" },
        take: limit,
      })
    } else if (type === "villages") {
      leaderboard = await prisma.village.findMany({
        select: {
          id: true,
          name: true,
          x: true,
          y: true,
          player: { select: { playerName: true } },
          buildings: {
            select: { level: true },
          },
        },
        take: limit,
      })

      // Calculate points for each village
      leaderboard = leaderboard.map((v) => ({
        ...v,
        points: v.buildings.reduce((sum: number, b: any) => sum + b.level, 0) + 1,
      }))

      leaderboard.sort((a, b) => b.points - a.points)
    } else {
      return errorResponse("Invalid leaderboard type", 400)
    }

    // Update cache
    await prisma.leaderboardCache.upsert({
      where: { type: type.toUpperCase() as any },
      create: {
        type: type.toUpperCase() as any,
        data: JSON.stringify(leaderboard),
      },
      update: {
        data: JSON.stringify(leaderboard),
        updatedAt: new Date(),
      },
    })

    return successResponse(leaderboard)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
