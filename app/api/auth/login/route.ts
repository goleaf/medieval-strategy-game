import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"
import { type NextRequest, NextResponse } from "next/server"
import { generateToken } from "@/lib/auth"
import { VillageService } from "@/lib/game-services/village-service"
import { ensureDemoEnvironment } from "@/lib/setup/demo-data"

export async function POST(req: NextRequest) {
  try {
    await ensureDemoEnvironment()

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const passwordValid = await compare(password, user.password)
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = generateToken(user.id)
    let player = await prisma.player.findFirst({ where: { userId: user.id } })

    // Create player if doesn't exist
    if (!player) {
      player = await prisma.player.create({
        data: {
          userId: user.id,
          playerName: user.username,
        },
      })

      // Initialize beginner protection
      const { ProtectionService } = await import("@/lib/game-services/protection-service")
      await ProtectionService.initializeProtection(player.id)
    }

    // Ensure player has a village
    await VillageService.ensurePlayerHasVillage(player.id)

    return NextResponse.json(
      {
        token,
        user: { id: user.id, email: user.email, username: user.username },
        player: player ? { id: player.id, playerName: player.playerName } : null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
