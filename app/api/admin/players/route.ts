import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"
import { withMetrics } from "@/lib/utils/metrics"

// GET all players with pagination and search
export const GET = withMetrics("GET /api/admin/players", async (req: NextRequest) => {
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
    const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") || "50")
    const search = req.nextUrl.searchParams.get("search")

    const skip = (page - 1) * limit

    const where: any = { isDeleted: false }
    if (search) {
      where.OR = [
        { playerName: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ]
    }

    const players = await prisma.player.findMany({
      where,
      include: {
        villages: {
          select: {
            id: true,
            name: true,
            x: true,
            y: true,
          },
        },
      },
      orderBy: { totalPoints: "desc" },
      take: 100, // Limit for admin dashboard
    })

    return NextResponse.json({
      success: true,
      data: players.map(player => ({
        id: player.id,
        playerName: player.playerName,
        totalPoints: player.totalPoints,
        rank: player.rank,
        villages: player.villages,
        isDeleted: player.isDeleted,
        banReason: player.banReason,
      })),
    }, { status: 200 })
  } catch (error) {
    console.error("Get players error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
