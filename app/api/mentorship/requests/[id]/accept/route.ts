import { type NextRequest, NextResponse } from "next/server"
import { MentorshipService } from "@/lib/game-services/mentorship-service"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { mentorId } = await req.json()
    if (!mentorId) return NextResponse.json({ error: "mentorId required" }, { status: 400 })
    const updated = await MentorshipService.accept(params.id, mentorId)
    return NextResponse.json({ success: true, data: updated }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Failed to accept" }, { status: 400 })
  }
}
