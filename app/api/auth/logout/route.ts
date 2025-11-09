import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../middleware"
import { SessionService } from "@/lib/security/session-service"

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "development",
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (auth.sessionId) {
      await SessionService.revokeSession(auth.sessionId)
    }

    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 },
    )

    response.cookies.set("session_token", "", { ...COOKIE_OPTIONS, maxAge: 0 })
    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
