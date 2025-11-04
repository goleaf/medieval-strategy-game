import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

// GET messages
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
    const page = Number.parseInt(req.nextUrl.searchParams.get("page") || "1")
    const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") || "20")
    const playerId = req.nextUrl.searchParams.get("playerId")

    const where: any = {}
    if (playerId) {
      where.toPlayerId = playerId
    }

    // Get messages sent by this admin
    const messages = await prisma.adminMessage.findMany({
      where: {
        fromAdminId: adminAuth.adminId,
        ...where
      },
      include: {
        toPlayer: {
          select: {
            id: true,
            playerName: true,
            isDeleted: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await prisma.adminMessage.count({
      where: {
        fromAdminId: adminAuth.adminId,
        ...where
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg.id,
          subject: msg.subject,
          message: msg.message,
          isRead: msg.isRead,
          createdAt: msg.createdAt.toISOString(),
          toPlayer: {
            id: msg.toPlayer.id,
            name: msg.toPlayer.playerName,
            isDeleted: msg.toPlayer.isDeleted
          }
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error("[v0] Get messages error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve messages"
    }, { status: 500 })
  }
}

// POST send message
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
    const { playerId, subject, message } = await req.json()

    if (!playerId || !subject || !message) {
      return NextResponse.json({
        success: false,
        error: "Player ID, subject, and message are required"
      }, { status: 400 })
    }

    // Verify player exists and is not deleted
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        playerName: true,
        isDeleted: true,
        userId: true
      }
    })

    if (!player || player.isDeleted) {
      return NextResponse.json({
        success: false,
        error: "Player not found or deleted"
      }, { status: 404 })
    }

    // Create message
    const adminMessage = await prisma.adminMessage.create({
      data: {
        fromAdminId: adminAuth.adminId,
        toPlayerId: playerId,
        subject,
        message
      }
    })

    // Log action
    trackAction()
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "SEND_ADMIN_MESSAGE",
        details: `Sent message to player ${player.playerName}: ${subject}`,
        targetType: "PLAYER",
        targetId: playerId
      }
    })

    // Also create in-game message for the player (if they have a user account)
    if (player.userId) {
      await prisma.message.create({
        data: {
          fromPlayerId: null, // System message
          toPlayerId: playerId,
          subject: `Admin Message: ${subject}`,
          message: message,
          isRead: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      data: {
        id: adminMessage.id,
        subject: adminMessage.subject,
        message: adminMessage.message,
        createdAt: adminMessage.createdAt.toISOString(),
        toPlayer: {
          id: player.id,
          name: player.playerName
        }
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Send message failed", errorMessage)
    console.error("[v0] Send message error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to send message"
    }, { status: 500 })
  }
}
