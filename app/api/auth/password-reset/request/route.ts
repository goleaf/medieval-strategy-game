import { NextRequest, NextResponse } from "next/server"
import { PasswordResetService } from "@/lib/security/password-reset-service"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    await PasswordResetService.requestReset(email, {
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Password reset request error:", error)
    return NextResponse.json({ error: (error as Error).message || "Failed to request reset" }, { status: 400 })
  }
}
