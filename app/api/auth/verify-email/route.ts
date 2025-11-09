import { NextRequest, NextResponse } from "next/server"
import { EmailVerificationService } from "@/lib/security/email-verification-service"

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: "Verification token missing" }, { status: 400 })
    }

    const user = await EmailVerificationService.verify(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
