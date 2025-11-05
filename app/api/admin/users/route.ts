import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"

// GET all users with pagination and search
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
    const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") || "50")
    const search = req.nextUrl.searchParams.get("search")

    const skip = (page - 1) * limit

    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          players: {
            select: {
              id: true,
              playerName: true,
              totalPoints: true,
            },
          },
          admin: {
            select: {
              id: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
        players: user.players,
        isAdmin: !!user.admin,
        adminRole: user.admin?.role || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Get users error:", error)
    return NextResponse.json({ 
      success: false,
      error: "Internal server error" 
    }, { status: 500 })
  }
}

