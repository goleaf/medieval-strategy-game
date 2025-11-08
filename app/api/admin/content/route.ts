import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

// GET content
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
    const contentType = req.nextUrl.searchParams.get("type") || "announcement"
    const page = Number.parseInt(req.nextUrl.searchParams.get("page") || "1")
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50)

    let content
    let total

    switch (contentType) {
      case "announcement":
        ;[content, total] = await Promise.all([
          prisma.announcement.findMany({
            include: {
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
          }),
          prisma.announcement.count()
        ])
        break

      case "tutorial":
        ;[content, total] = await Promise.all([
          prisma.tutorial.findMany({
            include: {
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
            orderBy: { order: 'asc' },
            skip: (page - 1) * limit,
            take: limit
          }),
          prisma.tutorial.count()
        ])
        break

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid content type. Use 'announcement' or 'tutorial'"
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        content: content.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          isPublished: item.isPublished,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          author: item.admin?.user?.displayName || item.admin?.user?.username || 'Unknown',
          ...(contentType === 'tutorial' && { order: item.order }),
          ...(contentType === 'announcement' && {
            priority: item.priority,
            expiresAt: item.expiresAt?.toISOString()
          })
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        type: contentType
      }
    })

  } catch (error) {
    console.error("Get content error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve content"
    }, { status: 500 })
  }
}

// POST create content
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
    const { type, title, content, isPublished = false, order, priority, expiresAt } = await req.json()

    if (!type || !title || !content) {
      return NextResponse.json({
        success: false,
        error: "Type, title, and content are required"
      }, { status: 400 })
    }

    let result

    if (type === 'announcement') {
      result = await prisma.announcement.create({
        data: {
          title,
          content,
          isPublished,
          priority: priority || 'normal',
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          adminId: adminAuth.adminId
        }
      })
    } else if (type === 'tutorial') {
      result = await prisma.tutorial.create({
        data: {
          title,
          content,
          isPublished,
          order: order || 0,
          adminId: adminAuth.adminId
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid content type. Use 'announcement' or 'tutorial'"
      }, { status: 400 })
    }

    // Log action
    trackAction()
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: `CREATE_${type.toUpperCase()}`,
        details: `Created ${type}: ${title}`,
        targetType: type.toUpperCase(),
        targetId: result.id
      }
    })

    return NextResponse.json({
      success: true,
      message: `${type} created successfully`,
      data: result
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Create content failed", errorMessage)
    console.error("Create content error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create content"
    }, { status: 500 })
  }
}


