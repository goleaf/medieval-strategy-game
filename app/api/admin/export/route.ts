import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

// GET available export types
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
    const exportTypes = [
      {
        id: 'players',
        name: 'Player Data',
        description: 'Complete player information including accounts, villages, and statistics',
        estimatedSize: 'Large',
        includes: ['Player profiles', 'User accounts', 'Village data', 'Game statistics']
      },
      {
        id: 'villages',
        name: 'Village Data',
        description: 'All village information including buildings, resources, and ownership',
        estimatedSize: 'Large',
        includes: ['Village details', 'Building information', 'Resource levels', 'Troop data']
      },
      {
        id: 'audit_logs',
        name: 'Audit Logs',
        description: 'Complete administrative action history',
        estimatedSize: 'Medium',
        includes: ['Admin actions', 'Timestamps', 'Target information', 'Action details']
      },
      {
        id: 'game_stats',
        name: 'Game Statistics',
        description: 'Aggregated game statistics and analytics data',
        estimatedSize: 'Small',
        includes: ['Player counts', 'Village statistics', 'Resource totals', 'Activity metrics']
      },
      {
        id: 'moderation',
        name: 'Moderation Data',
        description: 'Player reports, bans, and moderation actions',
        estimatedSize: 'Medium',
        includes: ['Moderation reports', 'Ban history', 'Admin actions', 'Resolution details']
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        exportTypes,
        formats: ['json', 'csv'],
        lastExports: [] // Could track recent exports here
      }
    })

  } catch (error) {
    console.error("[v0] Get export types error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve export options"
    }, { status: 500 })
  }
}

// POST initiate export
export async function POST(req: NextRequest) {
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
    const { type, format = 'json', filters = {} } = await req.json()

    if (!type) {
      return NextResponse.json({
        success: false,
        error: "Export type is required"
      }, { status: 400 })
    }

    // Log export initiation
    trackAction()
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "EXPORT_DATA",
        details: `Initiated ${type} export in ${format} format`,
        targetType: "EXPORT",
        targetId: type
      }
    })

    // Generate export data based on type
    let exportData: any
    let filename: string

    switch (type) {
      case 'players':
        exportData = await exportPlayers(filters)
        filename = `players_export_${new Date().toISOString().split('T')[0]}.${format}`
        break

      case 'villages':
        exportData = await exportVillages(filters)
        filename = `villages_export_${new Date().toISOString().split('T')[0]}.${format}`
        break

      case 'audit_logs':
        exportData = await exportAuditLogs(filters)
        filename = `audit_logs_export_${new Date().toISOString().split('T')[0]}.${format}`
        break

      case 'game_stats':
        exportData = await exportGameStats()
        filename = `game_stats_export_${new Date().toISOString().split('T')[0]}.${format}`
        break

      case 'moderation':
        exportData = await exportModerationData(filters)
        filename = `moderation_export_${new Date().toISOString().split('T')[0]}.${format}`
        break

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid export type"
        }, { status: 400 })
    }

    // Format data
    let formattedData: string
    let contentType: string

    if (format === 'csv') {
      formattedData = convertToCSV(exportData)
      contentType = 'text/csv'
    } else {
      formattedData = JSON.stringify(exportData, null, 2)
      contentType = 'application/json'
    }

    // Return file for download
    return new Response(formattedData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Export data failed", errorMessage)
    console.error("[v0] Export data error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to export data"
    }, { status: 500 })
  }
}

// Export helper functions
async function exportPlayers(filters: any) {
  const players = await prisma.player.findMany({
    include: {
      user: {
        select: {
          email: true,
          displayName: true,
          lastActiveAt: true,
          createdAt: true
        }
      },
      villages: {
        select: {
          name: true,
          x: true,
          y: true,
          totalPoints: true,
          population: true,
          wood: true,
          stone: true,
          iron: true,
          gold: true,
          food: true
        }
      },
      _count: {
        select: {
          villages: true
        }
      }
    },
    orderBy: { totalPoints: 'desc' }
  })

  return players.map(player => ({
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
      email: player.user.email,
      displayName: player.user.displayName,
      lastActiveAt: player.user.lastActiveAt.toISOString(),
      createdAt: player.user.createdAt.toISOString()
    } : null,
    villageCount: player._count.villages,
    villages: player.villages
  }))
}

async function exportVillages(filters: any) {
  const villages = await prisma.village.findMany({
    include: {
      player: {
        select: {
          playerName: true,
          isDeleted: true
        }
      },
      buildings: {
        select: {
          type: true,
          level: true,
          completionAt: true
        }
      },
      troops: {
        select: {
          type: true,
          count: true
        }
      }
    },
    orderBy: { totalPoints: 'desc' }
  })

  return villages.map(village => ({
    id: village.id,
    name: village.name,
    x: village.x,
    y: village.y,
    isCapital: village.isCapital,
    totalPoints: village.totalPoints,
    population: village.population,
    loyalty: village.loyalty,
    wood: village.wood,
    stone: village.stone,
    iron: village.iron,
    gold: village.gold,
    food: village.food,
    createdAt: village.createdAt.toISOString(),
    updatedAt: village.updatedAt.toISOString(),
    player: village.player ? {
      name: village.player.playerName,
      isDeleted: village.player.isDeleted
    } : null,
    buildings: village.buildings.map(b => ({
      type: b.type,
      level: b.level,
      completionAt: b.completionAt?.toISOString()
    })),
    troops: village.troops.map(t => ({
      type: t.type,
      count: t.count
    }))
  }))
}

async function exportAuditLogs(filters: any) {
  const logs = await prisma.auditLog.findMany({
    include: {
      admin: {
        include: {
          user: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10000 // Limit to prevent huge exports
  })

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    details: log.details,
    targetType: log.targetType,
    targetId: log.targetId,
    createdAt: log.createdAt.toISOString(),
    admin: log.admin ? {
      id: log.admin.id,
      username: log.admin.user.username,
      displayName: log.admin.user.displayName,
      role: log.admin.role
    } : null
  }))
}

async function exportGameStats() {
  const [
    totalPlayers,
    activePlayers,
    totalVillages,
    totalResources,
    topPlayers
  ] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { isDeleted: false } }),
    prisma.village.count(),
    prisma.village.aggregate({
      _sum: {
        wood: true,
        stone: true,
        iron: true,
        gold: true,
        food: true,
      }
    }),
    prisma.player.findMany({
      select: {
        playerName: true,
        totalPoints: true,
        _count: { select: { villages: true } }
      },
      orderBy: { totalPoints: 'desc' },
      take: 100
    })
  ])

  return {
    overview: {
      totalPlayers,
      activePlayers,
      totalVillages,
      totalResources: {
        wood: totalResources._sum.wood || 0,
        stone: totalResources._sum.stone || 0,
        iron: totalResources._sum.iron || 0,
        gold: totalResources._sum.gold || 0,
        food: totalResources._sum.food || 0
      }
    },
    topPlayers,
    exportDate: new Date().toISOString()
  }
}

async function exportModerationData(filters: any) {
  const reports = await prisma.moderationReport.findMany({
    include: {
      reporter: { select: { playerName: true } },
      reported: { select: { playerName: true, banReason: true } },
      admin: { include: { user: { select: { displayName: true, username: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return reports.map(report => ({
    id: report.id,
    reporter: report.reporter.playerName,
    reported: report.reported.playerName,
    reason: report.reason,
    description: report.description,
    status: report.status,
    resolution: report.resolution,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString(),
    admin: report.admin ? report.admin.user.displayName || report.admin.user.username : null,
    reportedIsBanned: !!report.reported.banReason
  }))
}

function convertToCSV(data: any[]): string {
  if (!data.length) return ''

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ]

  return csvRows.join('\n')
}
