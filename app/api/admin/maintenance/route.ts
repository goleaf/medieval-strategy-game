import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

// GET maintenance status
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
    // Get maintenance mode status
    const maintenance = await prisma.maintenance.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // Get server health metrics
    const serverHealth = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform
    }

    // Get recent cleanup operations
    const recentCleanups = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['CLEANUP_INACTIVE_PLAYERS', 'CLEANUP_EMPTY_VILLAGES', 'CLEANUP_OLD_LOGS']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        admin: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        maintenance: maintenance ? {
          isActive: maintenance.isActive,
          message: maintenance.message,
          estimatedEndTime: maintenance.estimatedEndTime,
          createdAt: maintenance.createdAt,
          createdBy: maintenance.admin?.user?.displayName || 'System'
        } : null,
        server: {
          uptime: Math.round(serverHealth.uptime),
          memoryUsed: Math.round(serverHealth.memory.heapUsed / 1024 / 1024),
          memoryTotal: Math.round(serverHealth.memory.heapTotal / 1024 / 1024),
          nodeVersion: serverHealth.nodeVersion,
          platform: serverHealth.platform
        },
        cleanups: recentCleanups.map(cleanup => ({
          id: cleanup.id,
          action: cleanup.action,
          details: cleanup.details,
          timestamp: cleanup.createdAt.toISOString(),
          admin: cleanup.admin?.user?.displayName || 'System'
        }))
      }
    })

  } catch (error) {
    console.error("[v0] Maintenance status error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve maintenance status"
    }, { status: 500 })
  }
}

// POST maintenance mode toggle
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
    const { action, message, estimatedEndTime } = await req.json()

    if (action === 'enable') {
      if (!message) {
        return NextResponse.json({
          success: false,
          error: "Message is required for maintenance mode"
        }, { status: 400 })
      }

      // Create maintenance record
      const maintenance = await prisma.maintenance.create({
        data: {
          isActive: true,
          message,
          estimatedEndTime: estimatedEndTime ? new Date(estimatedEndTime) : null,
          adminId: adminAuth.adminId
        }
      })

      // Log action
      trackAction()
      await prisma.auditLog.create({
        data: {
          adminId: adminAuth.adminId,
          action: "MAINTENANCE_MODE_ENABLED",
          details: `Maintenance mode enabled: ${message}`,
          targetType: "SYSTEM",
          targetId: "maintenance"
        }
      })

      return NextResponse.json({
        success: true,
        message: "Maintenance mode enabled successfully",
        data: maintenance
      })

    } else if (action === 'disable') {
      // Find active maintenance
      const activeMaintenance = await prisma.maintenance.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })

      if (activeMaintenance) {
        // Update to inactive
        await prisma.maintenance.update({
          where: { id: activeMaintenance.id },
          data: { isActive: false }
        })

        // Log action
        trackAction()
        await prisma.auditLog.create({
          data: {
            adminId: adminAuth.adminId,
            action: "MAINTENANCE_MODE_DISABLED",
            details: "Maintenance mode disabled",
            targetType: "SYSTEM",
            targetId: "maintenance"
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: "Maintenance mode disabled successfully"
      })

    } else if (action === 'cleanup') {
      const cleanupResults = await performCleanup(adminAuth.adminId)
      return NextResponse.json({
        success: true,
        message: "Cleanup completed successfully",
        data: cleanupResults
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action. Use 'enable', 'disable', or 'cleanup'"
    }, { status: 400 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Maintenance action failed", errorMessage)
    console.error("[v0] Maintenance action error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to perform maintenance action"
    }, { status: 500 })
  }
}

async function performCleanup(adminId: string) {
  const results = {
    inactivePlayersCleaned: 0,
    emptyVillagesCleaned: 0,
    oldLogsCleaned: 0
  }

  try {
    // Clean inactive players (no villages, created > 90 days ago, never logged in)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const inactivePlayers = await prisma.player.findMany({
      where: {
        villages: { none: {} },
        createdAt: { lt: ninetyDaysAgo },
        user: null // No associated user account
      }
    })

    if (inactivePlayers.length > 0) {
      await prisma.player.deleteMany({
        where: {
          id: { in: inactivePlayers.map(p => p.id) }
        }
      })
      results.inactivePlayersCleaned = inactivePlayers.length
    }

    // Clean empty villages (no buildings, no population, created > 30 days ago)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const emptyVillages = await prisma.village.findMany({
      where: {
        population: 0,
        buildings: { none: {} },
        createdAt: { lt: thirtyDaysAgo },
        player: null // Abandoned villages
      }
    })

    if (emptyVillages.length > 0) {
      await prisma.village.deleteMany({
        where: {
          id: { in: emptyVillages.map(v => v.id) }
        }
      })
      results.emptyVillagesCleaned = emptyVillages.length
    }

    // Clean old audit logs (> 180 days)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: sixMonthsAgo }
      }
    })
    results.oldLogsCleaned = deletedLogs.count

    // Log cleanup actions
    trackAction()
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "SYSTEM_CLEANUP",
        details: `Cleanup completed: ${results.inactivePlayersCleaned} inactive players, ${results.emptyVillagesCleaned} empty villages, ${results.oldLogsCleaned} old logs`,
        targetType: "SYSTEM",
        targetId: "cleanup"
      }
    })

  } catch (error) {
    console.error("[v0] Cleanup error:", error)
    throw error
  }

  return results
}

