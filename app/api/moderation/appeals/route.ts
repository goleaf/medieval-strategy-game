import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { message } = await req.json()
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message required" }, { status: 400 })
    }
    const appeal = await prisma.moderationAppeal.create({
      data: { userId: auth.userId, playerId: auth.playerId ?? null, message },
    })
    return NextResponse.json({ success: true, data: appeal }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit appeal" }, { status: 500 })
  }
}
