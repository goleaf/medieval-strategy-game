import { NextRequest, NextResponse } from "next/server"
import { PasswordResetService } from "@/lib/security/password-reset-service"

export async function POST(req: NextRequest) {
  try {
    const { token, password, securityAnswer } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: "Missing reset parameters" }, { status: 400 })
    }

    await PasswordResetService.completeReset(token, password, securityAnswer)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Password reset complete error:", error)
    return NextResponse.json({ error: (error as Error).message || "Unable to reset password" }, { status: 400 })
  }
}
