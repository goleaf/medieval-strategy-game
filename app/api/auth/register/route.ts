import { prisma } from "@/lib/db"
import { hash } from "bcryptjs"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { email, username, password, displayName } = await req.json()

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        displayName: displayName || username,
      },
    })

    // Create initial player
    const continents = await prisma.continent.findMany()
    const randomContinent = continents[Math.floor(Math.random() * continents.length)]

    const player = await prisma.player.create({
      data: {
        userId: user.id,
        playerName: username,
      },
    })

    // Initialize beginner protection
    const { ProtectionService } = await import("@/lib/game-services/protection-service")
    await ProtectionService.initializeProtection(player.id)

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, username: user.username },
        player: { id: player.id, playerName: player.playerName },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Register error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
