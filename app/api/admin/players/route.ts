import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuth } from "../middleware"

// GET all players with pagination and search
export const GET = requireAdminAuth(async (req: NextRequest, context) => {
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
    console.error("[v0] Get players error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
