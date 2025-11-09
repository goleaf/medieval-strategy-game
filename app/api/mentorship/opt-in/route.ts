import { type NextRequest, NextResponse } from "next/server"
import { MentorshipService } from "@/lib/game-services/mentorship-service"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const playerId = body.playerId as string | undefined
    const allow = Boolean(body.allow)
    if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 })
    const updated = await MentorshipService.setMentorOptIn(playerId, allow)
    return NextResponse.json({ success: true, data: { allowMentorship: updated.allowMentorship } }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update mentorship preference" }, { status: 500 })
  }
}
