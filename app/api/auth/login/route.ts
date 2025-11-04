import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"
import { type NextRequest, NextResponse } from "next/server"
import { generateToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
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
    const player = await prisma.player.findFirst({ where: { userId: user.id } })

    return NextResponse.json(
      {
        token,
        user: { id: user.id, email: user.email, username: user.username },
        player: player ? { id: player.id, playerName: player.playerName } : null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
