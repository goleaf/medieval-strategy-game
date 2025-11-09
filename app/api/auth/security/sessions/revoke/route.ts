import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../../middleware"
import { SessionService } from "@/lib/security/session-service"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    await SessionService.revokeSession(sessionId)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Session revoke error:", error)
    return NextResponse.json({ error: "Unable to revoke session" }, { status: 500 })
  }
}
