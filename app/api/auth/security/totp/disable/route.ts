import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../../middleware"
import { TwoFactorService } from "@/lib/security/two-factor-service"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await TwoFactorService.disableTotp(auth.userId)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Disable TOTP error:", error)
    return NextResponse.json({ error: "Unable to disable TOTP" }, { status: 500 })
  }
}
