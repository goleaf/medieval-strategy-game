import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../../../../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"
import { prisma } from "@/lib/db"

// POST /api/admin/game-worlds/[id]/start - Start a game world
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return NextResponse.json({
      success: false,
      error: "Admin authentication required"
    }, { status: 401 })
  }

  try {
    // Check if game world exists
    const gameWorld = await prisma.gameWorld.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            players: true
          }
        }
      }
    })

    if (!gameWorld) {
      return NextResponse.json({
        success: false,
        error: "Game world not found"
      }, { status: 404 })
    }

    if (gameWorld.startedAt) {
      return NextResponse.json({
        success: false,
        error: "Game world has already been started"
      }, { status: 400 })
    }

    if (gameWorld._count.players === 0) {
      return NextResponse.json({
        success: false,
        error: "Cannot start game world with no players"
      }, { status: 400 })
    }

    // Start the game world
    const startTime = new Date()
    const updatedWorld = await prisma.gameWorld.update({
      where: { id: params.id },
      data: {
        isActive: true,
        isRegistrationOpen: false, // Close registration when game starts
        startedAt: startTime
      }
    })

    // Update associated WorldConfig
    await prisma.worldConfig.updateMany({
      where: { gameWorldId: params.id },
      data: {
        isRunning: true,
        startedAt: startTime
      }
    })

    // Calculate event timestamps based on speed-scaled values
    const eventTimestamps = {
      registrationClosesAt: new Date(startTime.getTime() + (gameWorld.registrationClosesAfterDays * 24 * 60 * 60 * 1000)),
      artefactsIntroducedAt: new Date(startTime.getTime() + (gameWorld.artefactsIntroducedAfterDays * 24 * 60 * 60 * 1000)),
      constructionPlansAt: new Date(startTime.getTime() + (gameWorld.constructionPlansAfterDays * 24 * 60 * 60 * 1000)),
      natarWonderFinishesAt: new Date(startTime.getTime() + (gameWorld.natarWonderFinishesAfterDays * 24 * 60 * 60 * 1000)),
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "START_GAME_WORLD",
        details: `Started game world: ${updatedWorld.worldName} with ${gameWorld._count.players} players`,
        targetType: "GAME_WORLD",
        targetId: params.id,
      },
    })

    // Create admin notification
    await prisma.adminNotification.create({
      data: {
        adminId: adminAuth.adminId,
        type: "SYSTEM",
        title: "Game World Started",
        message: `Game world "${updatedWorld.worldName}" has been started successfully. ${gameWorld._count.players} players are now active.`,
        severity: "info"
      }
    })

    trackAction()

    return NextResponse.json({
      success: true,
      data: {
        ...updatedWorld,
        eventTimestamps
      },
      message: `Game world "${updatedWorld.worldName}" started successfully`,
      eventSchedule: {
        registrationClosed: eventTimestamps.registrationClosesAt.toISOString(),
        artefactsIntroduced: eventTimestamps.artefactsIntroducedAt.toISOString(),
        constructionPlansAvailable: eventTimestamps.constructionPlansAt.toISOString(),
        gameEnds: eventTimestamps.natarWonderFinishesAt.toISOString()
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Start game world failed", errorMessage)
    console.error("Start game world error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to start game world"
    }, { status: 500 })
  }
}

