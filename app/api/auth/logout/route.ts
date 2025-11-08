import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // In a more complex system, you might want to:
    // - Invalidate the token on the server side
    // - Log the logout event
    // - Clean up any session data

    // For now, we'll just return success since the client will handle clearing localStorage
    return NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
