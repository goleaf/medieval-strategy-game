import { processGameTick } from "@/lib/jobs/game-tick"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Manual game tick endpoint
 * Can be called by a cron job or manually triggered
 */
export async function POST(req: NextRequest) {
  try {
    // Verify API key or auth token
    const apiKey = req.headers.get("x-api-key")
    if (apiKey !== process.env.GAME_TICK_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await processGameTick()

    return NextResponse.json({ success: true, message: "Game tick processed" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Game tick error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
