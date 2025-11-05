import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../../../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"
import { prisma } from "@/lib/db"
import { z } from "zod"

// Validation schema for updates
const updateGameWorldSchema = z.object({
  worldName: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  isRegistrationOpen: z.boolean().optional(),
  availableTribes: z.array(z.enum(['ROMANS', 'TEUTONS', 'GAULS', 'HUNS', 'EGYPTIANS', 'SPARTANS', 'VIKINGS'])).optional()
})

// GET /api/admin/game-worlds/[id] - Get specific game world
export async function GET(
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
    const gameWorld = await prisma.gameWorld.findUnique({
      where: { id: params.id },
      include: {
        availableTribes: true,
        players: {
          select: {
            id: true,
            playerName: true,
            totalPoints: true,
            lastActiveAt: true,
            isDeleted: true
          },
          orderBy: {
            totalPoints: 'desc'
          },
          take: 10 // Top 10 players
        },
        worldConfig: true,
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

    trackAction()

    return NextResponse.json({
      success: true,
      data: gameWorld
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Get game world failed", errorMessage)
    console.error("[v0] Get game world error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch game world"
    }, { status: 500 })
  }
}

// PUT /api/admin/game-worlds/[id] - Update game world
export async function PUT(
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
    const body = await req.json()
    const validatedData = updateGameWorldSchema.parse(body)

    // Check if game world exists
    const existingWorld = await prisma.gameWorld.findUnique({
      where: { id: params.id }
    })

    if (!existingWorld) {
      return NextResponse.json({
        success: false,
        error: "Game world not found"
      }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    if (validatedData.worldName !== undefined) updateData.worldName = validatedData.worldName
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive
    if (validatedData.isRegistrationOpen !== undefined) updateData.isRegistrationOpen = validatedData.isRegistrationOpen

    // Handle tribe updates
    if (validatedData.availableTribes) {
      // Remove existing tribes
      await prisma.gameWorldTribe.deleteMany({
        where: { gameWorldId: params.id }
      })

      // Add new tribes
      updateData.availableTribes = {
        create: validatedData.availableTribes.map(tribe => ({ tribe }))
      }
    }

    const updatedWorld = await prisma.gameWorld.update({
      where: { id: params.id },
      data: updateData,
      include: {
        availableTribes: true
      }
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "UPDATE_GAME_WORLD",
        details: `Updated game world: ${updatedWorld.worldName}`,
        targetType: "GAME_WORLD",
        targetId: params.id,
      },
    })

    trackAction()

    return NextResponse.json({
      success: true,
      data: updatedWorld,
      message: `Game world "${updatedWorld.worldName}" updated successfully`
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Validation failed",
        details: error.errors
      }, { status: 400 })
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Update game world failed", errorMessage)
    console.error("[v0] Update game world error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to update game world"
    }, { status: 500 })
  }
}

// DELETE /api/admin/game-worlds/[id] - Delete game world
export async function DELETE(
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
    // Check if game world exists and has players
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

    // Prevent deletion if world has active players
    if (gameWorld._count.players > 0) {
      return NextResponse.json({
        success: false,
        error: "Cannot delete game world with active players. Move or delete all players first."
      }, { status: 400 })
    }

    // Delete the game world (cascade will handle related records)
    await prisma.gameWorld.delete({
      where: { id: params.id }
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "DELETE_GAME_WORLD",
        details: `Deleted game world: ${gameWorld.worldName} (${gameWorld.worldCode})`,
        targetType: "GAME_WORLD",
        targetId: params.id,
      },
    })

    trackAction()

    return NextResponse.json({
      success: true,
      message: `Game world "${gameWorld.worldName}" deleted successfully`
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Delete game world failed", errorMessage)
    console.error("[v0] Delete game world error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to delete game world"
    }, { status: 500 })
  }
}
