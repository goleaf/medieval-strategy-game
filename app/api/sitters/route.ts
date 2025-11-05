import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current player's sitters
    const sitters = await prisma.sitter.findMany({
      where: {
        ownerId: session.user.id,
        isActive: true
      },
      include: {
        sitter: {
          select: {
            id: true,
            playerName: true,
            lastActiveAt: true
          }
        }
      }
    })

    // Get current player's inactivity allowance
    const player = await prisma.player.findUnique({
      where: { id: session.user.id },
      select: {
        inactivityAllowanceDays: true,
        lastOwnerActivityAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sitters: sitters.map(s => ({
          id: s.id,
          sitterId: s.sitterId,
          sitterName: s.sitter.playerName,
          lastActiveAt: s.sitter.lastActiveAt,
          permissions: {
            canSendRaids: s.canSendRaids,
            canUseResources: s.canUseResources,
            canBuyAndSpendGold: s.canBuyAndSpendGold
          },
          addedAt: s.addedAt
        })),
        inactivityAllowance: player?.inactivityAllowanceDays ?? 14,
        lastOwnerActivity: player?.lastOwnerActivityAt
      }
    })
  } catch (error) {
    console.error("Error fetching sitters:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { sitterId, permissions } = body

    if (!sitterId || !permissions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate permissions structure
    const requiredPermissions = ['canSendRaids', 'canUseResources', 'canBuyAndSpendGold']
    for (const perm of requiredPermissions) {
      if (typeof permissions[perm] !== 'boolean') {
        return NextResponse.json({ error: `Invalid permission: ${perm}` }, { status: 400 })
      }
    }

    const sitter = await SitterDualService.addSitter(session.user.id, sitterId, permissions)

    return NextResponse.json({
      success: true,
      data: {
        id: sitter.id,
        sitterId: sitter.sitterId,
        permissions: {
          canSendRaids: sitter.canSendRaids,
          canUseResources: sitter.canUseResources,
          canBuyAndSpendGold: sitter.canBuyAndSpendGold
        },
        addedAt: sitter.addedAt
      }
    })
  } catch (error) {
    console.error("Error adding sitter:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
