import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

// GET moderation reports
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
    const status = req.nextUrl.searchParams.get("status") || "pending"
    const page = Number.parseInt(req.nextUrl.searchParams.get("page") || "1")
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50)

    const reports = await prisma.moderationReport.findMany({
      where: {
        status: status as any
      },
      include: {
        reporter: {
          select: {
            id: true,
            playerName: true,
            isDeleted: true
          }
        },
        reported: {
          select: {
            id: true,
            playerName: true,
            isDeleted: true,
            banReason: true
          }
        },
        admin: {
          select: {
            user: {
              select: {
                displayName: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await prisma.moderationReport.count({
      where: {
        status: status as any
      }
    })

    // Get statistics
    const stats = await prisma.moderationReport.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        reports: reports.map(report => ({
          id: report.id,
          reporter: {
            id: report.reporter.id,
            name: report.reporter.playerName,
            isDeleted: report.reporter.isDeleted
          },
          reported: {
            id: report.reported.id,
            name: report.reported.playerName,
            isDeleted: report.reported.isDeleted,
            isBanned: !!report.reported.banReason
          },
          reason: report.reason,
          description: report.description,
          status: report.status,
          resolution: report.resolution,
          createdAt: report.createdAt.toISOString(),
          resolvedAt: report.resolvedAt?.toISOString(),
          admin: report.admin ? {
            name: report.admin.user.displayName || report.admin.user.username
          } : null
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        stats: {
          pending: statsMap.pending || 0,
          investigating: statsMap.investigating || 0,
          resolved: statsMap.resolved || 0,
          dismissed: statsMap.dismissed || 0,
          total: (statsMap.pending || 0) + (statsMap.investigating || 0) + (statsMap.resolved || 0) + (statsMap.dismissed || 0)
        }
      }
    })

  } catch (error) {
    console.error("Get moderation reports error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve moderation reports"
    }, { status: 500 })
  }
}

// POST resolve report
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
    const { reportId, action, resolution } = await req.json()

    if (!reportId || !action) {
      return NextResponse.json({
        success: false,
        error: "Report ID and action are required"
      }, { status: 400 })
    }

    let newStatus: string
    switch (action) {
      case 'resolve':
        newStatus = 'resolved'
        break
      case 'dismiss':
        newStatus = 'dismissed'
        break
      case 'investigate':
        newStatus = 'investigating'
        break
      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action. Use 'resolve', 'dismiss', or 'investigate'"
        }, { status: 400 })
    }

    const updatedReport = await prisma.moderationReport.update({
      where: { id: reportId },
      data: {
        status: newStatus as any,
        adminId: adminAuth.adminId,
        resolution,
        resolvedAt: new Date()
      },
      include: {
        reporter: {
          select: {
            playerName: true
          }
        },
        reported: {
          select: {
            playerName: true
          }
        }
      }
    })

    // Log action
    trackAction()
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: `MODERATION_${action.toUpperCase()}`,
        details: `${action} report ${reportId}: ${updatedReport.reporter.playerName} reported ${updatedReport.reported.playerName} for ${updatedReport.reason}`,
        targetType: "MODERATION_REPORT",
        targetId: reportId
      }
    })

    return NextResponse.json({
      success: true,
      message: `Report ${action}d successfully`,
      data: {
        id: updatedReport.id,
        status: updatedReport.status,
        resolution: updatedReport.resolution,
        resolvedAt: updatedReport.resolvedAt?.toISOString()
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Resolve moderation report failed", errorMessage)
    console.error("Resolve moderation report error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to resolve moderation report"
    }, { status: 500 })
  }
}


