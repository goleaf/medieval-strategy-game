import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"

export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return new Response(JSON.stringify({
      success: false,
      error: "Admin authentication required"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    })
  }

  try {
    const searchParams = req.nextUrl.searchParams

    // Parse search parameters
    const query = searchParams.get("q") || ""
    const playerName = searchParams.get("playerName") || ""
    const email = searchParams.get("email") || ""
    const minPoints = searchParams.get("minPoints") ? parseInt(searchParams.get("minPoints")!) : undefined
    const maxPoints = searchParams.get("maxPoints") ? parseInt(searchParams.get("maxPoints")!) : undefined
    const hasUserAccount = searchParams.get("hasUserAccount") === "true" ? true : searchParams.get("hasUserAccount") === "false" ? false : undefined
    const isBanned = searchParams.get("isBanned") === "true" ? true : undefined
    const isDeleted = searchParams.get("isDeleted") === "true" ? true : searchParams.get("isDeleted") === "false" ? false : undefined
    const villageCount = searchParams.get("villageCount") ? parseInt(searchParams.get("villageCount")!) : undefined
    const villageMinPoints = searchParams.get("villageMinPoints") ? parseInt(searchParams.get("villageMinPoints")!) : undefined
    const villageMaxPoints = searchParams.get("villageMaxPoints") ? parseInt(searchParams.get("villageMaxPoints")!) : undefined
    const createdAfter = searchParams.get("createdAfter") ? new Date(searchParams.get("createdAfter")!) : undefined
    const createdBefore = searchParams.get("createdBefore") ? new Date(searchParams.get("createdBefore")!) : undefined
    const lastActiveAfter = searchParams.get("lastActiveAfter") ? new Date(searchParams.get("lastActiveAfter")!) : undefined
    const lastActiveBefore = searchParams.get("lastActiveBefore") ? new Date(searchParams.get("lastActiveBefore")!) : undefined

    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200) // Max 200 per page
    const sortBy = searchParams.get("sortBy") || "totalPoints"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc"

    // Build where clause
    const where: any = {}

    // Text search
    if (query) {
      where.OR = [
        { playerName: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { user: { displayName: { contains: query, mode: "insensitive" } } }
      ]
    }

    // Specific filters
    if (playerName) {
      where.playerName = { contains: playerName, mode: "insensitive" }
    }

    if (email) {
      where.user = { email: { contains: email, mode: "insensitive" } }
    }

    if (minPoints !== undefined || maxPoints !== undefined) {
      where.totalPoints = {}
      if (minPoints !== undefined) where.totalPoints.gte = minPoints
      if (maxPoints !== undefined) where.totalPoints.lte = maxPoints
    }

    if (hasUserAccount !== undefined) {
      where.user = hasUserAccount ? { isNot: null } : { is: null }
    }

    if (isBanned) {
      where.banReason = { not: null }
    }

    if (isDeleted !== undefined) {
      where.isDeleted = isDeleted
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {}
      if (createdAfter) where.createdAt.gte = createdAfter
      if (createdBefore) where.createdAt.lte = createdBefore
    }

    if (lastActiveAfter || lastActiveBefore) {
      where.lastActiveAt = {}
      if (lastActiveAfter) where.lastActiveAt.gte = lastActiveAfter
      if (lastActiveBefore) where.lastActiveAt.lte = lastActiveBefore
    }

    // Village-based filters
    if (villageCount !== undefined || villageMinPoints !== undefined || villageMaxPoints !== undefined) {
      where.villages = {}

      if (villageCount !== undefined) {
        if (villageCount === 0) {
          where.villages.none = {}
        } else {
          where.villages.some = {}
          // For exact count, we'd need a more complex query
        }
      }

      if (villageMinPoints !== undefined || villageMaxPoints !== undefined) {
        where.villages.some = {
          ...where.villages.some,
          totalPoints: {}
        }
        if (villageMinPoints !== undefined) where.villages.some.totalPoints.gte = villageMinPoints
        if (villageMaxPoints !== undefined) where.villages.some.totalPoints.lte = villageMaxPoints
      }
    }

    // Execute search
    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              lastActiveAt: true
            }
          },
          villages: {
            select: {
              id: true,
              name: true,
              x: true,
              y: true,
              totalPoints: true,
              population: true,
              buildings: {
                select: {
                  type: true,
                  level: true
                }
              }
            },
            orderBy: { totalPoints: 'desc' }
          },
          _count: {
            select: {
              villages: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.player.count({ where })
    ])

    // Process results
    const processedPlayers = players.map(player => ({
      id: player.id,
      playerName: player.playerName,
      totalPoints: player.totalPoints,
      rank: player.rank,
      wavesSurvived: player.wavesSurvived,
      troopsKilled: player.troopsKilled,
      troopsLost: player.troopsLost,
      isDeleted: player.isDeleted,
      deletedAt: player.deletedAt?.toISOString(),
      banReason: player.banReason,
      beginnerProtectionUntil: player.beginnerProtectionUntil?.toISOString(),
      createdAt: player.createdAt.toISOString(),
      updatedAt: player.updatedAt.toISOString(),
      lastActiveAt: player.lastActiveAt.toISOString(),
      hasUserAccount: !!player.user,
      user: player.user ? {
        id: player.user.id,
        email: player.user.email,
        displayName: player.user.displayName,
        lastActiveAt: player.user.lastActiveAt.toISOString()
      } : null,
      villageCount: player._count.villages,
      villages: player.villages.map(village => ({
        id: village.id,
        name: village.name,
        x: village.x,
        y: village.y,
        totalPoints: village.totalPoints,
        population: village.population,
        buildingCount: village.buildings.length,
        totalBuildingLevels: village.buildings.reduce((sum, b) => sum + b.level, 0)
      }))
    }))

    return NextResponse.json({
      success: true,
      data: {
        players: processedPlayers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: {
          query,
          playerName,
          email,
          minPoints,
          maxPoints,
          hasUserAccount,
          isBanned,
          isDeleted,
          villageCount,
          villageMinPoints,
          villageMaxPoints,
          createdAfter: createdAfter?.toISOString(),
          createdBefore: createdBefore?.toISOString(),
          lastActiveAfter: lastActiveAfter?.toISOString(),
          lastActiveBefore: lastActiveBefore?.toISOString(),
          sortBy,
          sortOrder
        }
      }
    })

  } catch (error) {
    console.error("[v0] Advanced search error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to perform advanced search"
    }, { status: 500 })
  }
}

