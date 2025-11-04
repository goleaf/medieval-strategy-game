import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// GET all players with pagination and search
export async function GET(req: NextRequest) {
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

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        include: { user: true, tribe: true },
        orderBy: { totalPoints: "desc" },
        skip,
        take: limit,
      }),
      prisma.player.count({ where }),
    ])

    return NextResponse.json(
      {
        players,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Get players error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
