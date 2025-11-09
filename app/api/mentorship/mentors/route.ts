import { NextResponse } from "next/server"
import { MentorshipService } from "@/lib/game-services/mentorship-service"

export async function GET() {
  try {
    const mentors = await MentorshipService.listMentors()
    return NextResponse.json({ success: true, data: mentors }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch mentors" }, { status: 500 })
  }
}
