import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../middleware"
import { prisma } from "@/lib/db"

export async function authenticatePlayer(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth || !auth.playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if player exists and is not deleted
    const player = await prisma.player.findUnique({
      where: { id: auth.playerId },
      include: { hero: true }
    })

    if (!player || player.isDeleted) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return { userId: auth.userId, playerId: auth.playerId, player }
  } catch (error) {
    return NextResponse.json({ error: "Authentication error" }, { status: 500 })
  }
}
