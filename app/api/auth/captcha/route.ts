import { NextRequest, NextResponse } from "next/server"
import { CaptchaService } from "@/lib/security/captcha-service"

export async function POST(req: NextRequest) {
  try {
    const challenge = await CaptchaService.createChallenge({
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    })
    return NextResponse.json({ success: true, challenge }, { status: 200 })
  } catch (error) {
    console.error("Captcha error:", error)
    return NextResponse.json({ error: "Unable to create captcha" }, { status: 500 })
  }
}
