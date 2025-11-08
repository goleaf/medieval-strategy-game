import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

// GET notifications
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
    // Get recent notifications (last 50)
    const notifications = await prisma.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        admin: {
          select: {
            user: {
              select: {
                displayName: true,
                username: true,
              }
            }
          }
        }
      }
    })

    // Get unread count
    const unreadCount = await prisma.adminNotification.count({
      where: { isRead: false }
    })

    const processedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      isRead: notification.isRead,
      targetId: notification.targetId,
      targetType: notification.targetType,
      createdAt: notification.createdAt.toISOString(),
      createdBy: notification.admin?.user?.displayName || notification.admin?.user?.username || 'System',
    }))

    return NextResponse.json({
      success: true,
      data: {
        notifications: processedNotifications,
        unreadCount,
        total: notifications.length,
      }
    })
  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve notifications"
    }, { status: 500 })
  }
}

// POST create notification
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
    const { type, title, message, severity = 'info', targetId, targetType } = await req.json()

    if (!type || !title || !message) {
      return NextResponse.json({
        success: false,
        error: "Type, title, and message are required"
      }, { status: 400 })
    }

    const notification = await prisma.adminNotification.create({
      data: {
        type,
        title,
        message,
        severity,
        targetId,
        targetType,
        adminId: adminAuth.adminId,
      }
    })

    // Track action
    trackAction()

    return NextResponse.json({
      success: true,
      data: notification,
      message: "Notification created successfully"
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Create notification failed", errorMessage)
    console.error("Create notification error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create notification"
    }, { status: 500 })
  }
}
