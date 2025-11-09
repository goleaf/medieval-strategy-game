import { type NextRequest, NextResponse } from "next/server"
import { MentorshipService } from "@/lib/game-services/mentorship-service"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const playerId = body.playerId as string | undefined
    if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 })
    const preferred = body.preferredMentorId as string | undefined
    const record = await MentorshipService.requestMentor(playerId, preferred)
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Failed to request mentor" }, { status: 400 })
  }
}
