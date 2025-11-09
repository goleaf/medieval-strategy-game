import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../../middleware"
import { TwoFactorService } from "@/lib/security/two-factor-service"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phoneNumber } = await req.json()
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 })
    }

    await TwoFactorService.requestSmsEnrollment(auth.userId, phoneNumber)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("SMS setup error:", error)
    return NextResponse.json({ error: "Unable to send verification code" }, { status: 500 })
  }
}
