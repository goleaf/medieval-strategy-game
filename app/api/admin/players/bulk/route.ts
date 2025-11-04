import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"

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
    const { operation, playerIds, reason } = await req.json()

    if (!operation || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Operation and player IDs are required"
      }, { status: 400 })
    }

    if (operation === 'ban' && !reason?.trim()) {
      return NextResponse.json({
        success: false,
        error: "Ban reason is required for bulk ban operations"
      }, { status: 400 })
    }

    // Validate all player IDs exist
    const existingPlayers = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
        isDeleted: false,
      },
      select: { id: true, playerName: true },
    })

    const foundIds = existingPlayers.map(p => p.id)
    const notFoundIds = playerIds.filter(id => !foundIds.includes(id))

    if (notFoundIds.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Players not found: ${notFoundIds.join(', ')}`
      }, { status: 404 })
    }

    let result
    const affectedPlayers = existingPlayers.map(p => p.playerName).join(', ')

    // Execute bulk operation
    switch (operation) {
      case 'ban':
        result = await prisma.player.updateMany({
          where: { id: { in: playerIds } },
          data: { banReason: reason },
        })
        break

      case 'unban':
        result = await prisma.player.updateMany({
          where: { id: { in: playerIds } },
          data: { banReason: null },
        })
        break

      case 'delete':
        // Soft delete - mark as deleted
        result = await prisma.player.updateMany({
          where: { id: { in: playerIds } },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        })
        break

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid operation. Supported: ban, unban, delete"
        }, { status: 400 })
    }

    // Track action
    trackAction()

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: `BULK_${operation.toUpperCase()}`,
        details: `${operation} applied to ${result.count} players: ${affectedPlayers}`,
        targetType: "PLAYER",
        targetId: "bulk-operation",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        operation,
        affectedCount: result.count,
        affectedPlayers: existingPlayers,
      },
      message: `Successfully ${operation}ned ${result.count} player(s)`,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Bulk player operation failed", errorMessage)
    console.error("Bulk player operation error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to execute bulk operation"
    }, { status: 500 })
  }
})
