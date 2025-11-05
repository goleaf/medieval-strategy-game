import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find all sitters where the current user is the sitter
    const sitters = await prisma.sitter.findMany({
      where: {
        sitterId: session.user.id,
        isActive: true,
        owner: {
          inactivityAllowanceDays: { gt: 0 } // Only show accounts with remaining allowance
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            playerName: true,
            lastActiveAt: true,
            inactivityAllowanceDays: true
          }
        }
      }
    })

    const accounts = sitters.map(sitter => ({
      id: sitter.owner.id,
      playerName: sitter.owner.playerName,
      lastActiveAt: sitter.owner.lastActiveAt,
      inactivityAllowance: sitter.owner.inactivityAllowanceDays
    }))

    return NextResponse.json({
      success: true,
      data: { accounts }
    })
  } catch (error) {
    console.error("Error fetching sitter accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

