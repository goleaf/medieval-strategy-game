import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../../middleware"
import { TwoFactorService } from "@/lib/security/two-factor-service"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code } = await req.json()
    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 })
    }

    const verified = await TwoFactorService.confirmSmsEnrollment(auth.userId, code)
    if (!verified) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("SMS confirm error:", error)
    return NextResponse.json({ error: "Unable to confirm phone number" }, { status: 500 })
  }
}
