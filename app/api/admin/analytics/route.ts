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
    // Get comprehensive analytics data
    const [
      totalPlayers,
      activePlayers,
      bannedPlayers,
      totalVillages,
      activeVillages,
      emptyVillages,
      totalResources,
      resourceDistribution,
      playerActivity,
      villageDevelopment,
      barbarianStats,
      continentStats
    ] = await Promise.all([
      // Total players
      prisma.player.count(),

      // Active players (not banned and have villages)
      prisma.player.count({
        where: {
          isDeleted: false,
          villages: { some: {} }
        }
      }),

      // Banned players
      prisma.player.count({
        where: { isDeleted: true }
      }),

      // Village statistics
      prisma.village.count(),
      prisma.village.count({
        where: {
          player: {
            isDeleted: false
          }
        }
      }),
      prisma.village.count({
        where: {
          player: null
        }
      }),

      // Total resources in game
      prisma.village.aggregate({
        _sum: {
          wood: true,
          stone: true,
          iron: true,
          gold: true,
          food: true,
        }
      }),

      // Resource distribution by percentiles
      prisma.$queryRaw`
        SELECT
          percentile,
          AVG(wood) as avg_wood,
          AVG(stone) as avg_stone,
          AVG(iron) as avg_iron,
          AVG(gold) as avg_gold,
          AVG(food) as avg_food
        FROM (
          SELECT
            NTILE(10) OVER (ORDER BY (wood + stone + iron + gold + food) DESC) as percentile,
            wood, stone, iron, gold, food
          FROM Village
          WHERE playerId IS NOT NULL
        ) percentiles
        GROUP BY percentile
        ORDER BY percentile
      `,

      // Player activity patterns (last 30 days)
      prisma.player.findMany({
        select: {
          id: true,
          playerName: true,
          totalPoints: true,
          createdAt: true,
          lastActiveAt: true,
          _count: {
            select: {
              villages: true,
              user: true
            }
          }
        },
        orderBy: { totalPoints: 'desc' },
        take: 100
      }),

      // Village development statistics
      prisma.village.groupBy({
        by: ['playerId'],
        where: {
          playerId: { not: null }
        },
        _count: {
          id: true
        },
        _sum: {
          population: true,
          wood: true,
          stone: true,
          iron: true,
          gold: true,
          food: true,
        }
      }),

      // Barbarian statistics
      prisma.barbarian.aggregate({
        _count: { id: true },
        _sum: {
          warriors: true,
          spearmen: true,
          bowmen: true,
          horsemen: true,
        }
      }),

      // Continent statistics
      prisma.continent.findMany({
        include: {
          _count: {
            select: {
              villages: true
            }
          }
        }
      })
    ])

    // Process player activity data
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const processedPlayerActivity = playerActivity.map(player => ({
      id: player.id,
      name: player.playerName,
      totalPoints: player.totalPoints,
      villageCount: player._count.villages,
      createdAt: player.createdAt.toISOString(),
      lastActiveAt: player.lastActiveAt?.toISOString(),
      daysSinceActive: player.lastActiveAt
        ? Math.floor((now.getTime() - player.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      isActiveRecently: player.lastActiveAt && player.lastActiveAt > thirtyDaysAgo,
      hasUserAccount: player._count.user > 0
    }))

    // Process village development data
    const processedVillageDevelopment = villageDevelopment.map(dev => ({
      playerId: dev.playerId,
      villageCount: dev._count.id,
      totalPopulation: dev._sum.population || 0,
      totalResources: (dev._sum.wood || 0) + (dev._sum.stone || 0) + (dev._sum.iron || 0) + (dev._sum.gold || 0) + (dev._sum.food || 0),
      averagePopulationPerVillage: dev._count.id > 0 ? Math.round((dev._sum.population || 0) / dev._count.id) : 0,
      averageResourcesPerVillage: dev._count.id > 0
        ? Math.round(((dev._sum.wood || 0) + (dev._sum.stone || 0) + (dev._sum.iron || 0) + (dev._sum.gold || 0) + (dev._sum.food || 0)) / dev._count.id)
        : 0
    }))

    // Calculate activity metrics
    const activeInLast30Days = processedPlayerActivity.filter(p => p.isActiveRecently).length
    const inactivePlayers = processedPlayerActivity.filter(p => p.daysSinceActive && p.daysSinceActive > 30).length
    const newPlayersThisMonth = processedPlayerActivity.filter(p => new Date(p.createdAt) > thirtyDaysAgo).length

    // Resource distribution analysis
    const resourcePercentiles = Array.isArray(resourceDistribution) ? resourceDistribution : []

    // Continent analysis
    const continentAnalysis = continentStats.map(continent => ({
      id: continent.id,
      name: continent.name,
      villageCount: continent._count.villages,
      size: continent.size,
      density: continent.size > 0 ? continent._count.villages / continent.size : 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalPlayers,
          activePlayers,
          bannedPlayers,
          totalVillages,
          activeVillages,
          emptyVillages,
          barbarianVillages: barbarianStats._count.id,
          totalBarbarianTroops: (barbarianStats._sum.warriors || 0) + (barbarianStats._sum.spearmen || 0) + (barbarianStats._sum.bowmen || 0) + (barbarianStats._sum.horsemen || 0),
          totalResources: {
            wood: totalResources._sum.wood || 0,
            stone: totalResources._sum.stone || 0,
            iron: totalResources._sum.iron || 0,
            gold: totalResources._sum.gold || 0,
            food: totalResources._sum.food || 0,
          },
          totalResourceValue: (totalResources._sum.wood || 0) + (totalResources._sum.stone || 0) + (totalResources._sum.iron || 0) + (totalResources._sum.gold || 0) + (totalResources._sum.food || 0)
        },

        activity: {
          activeInLast30Days,
          inactivePlayers,
          newPlayersThisMonth,
          topPlayers: processedPlayerActivity.slice(0, 10),
          playerActivity: processedPlayerActivity
        },

        development: {
          villageDevelopment: processedVillageDevelopment,
          resourceDistribution: resourcePercentiles,
          averageVillagesPerPlayer: activePlayers > 0 ? (activeVillages / activePlayers).toFixed(2) : 0,
          averagePointsPerPlayer: activePlayers > 0 ? Math.round(processedPlayerActivity.reduce((sum, p) => sum + p.totalPoints, 0) / activePlayers) : 0
        },

        geography: {
          continents: continentAnalysis,
          continentCount: continentStats.length,
          mostPopulatedContinent: continentAnalysis.reduce((max, c) => c.villageCount > max.villageCount ? c : max, continentAnalysis[0] || null)
        },

        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("[v0] Analytics error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve analytics data"
    }, { status: 500 })
  }
}


