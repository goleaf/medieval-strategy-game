import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../../middleware"
import { prisma } from "@/lib/db"
import { TwoFactorService } from "@/lib/security/two-factor-service"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await TwoFactorService.ensureSettings(auth.userId)
    await prisma.twoFactorSettings.update({
      where: { userId: auth.userId },
      data: {
        smsEnabled: false,
        smsPhoneNumber: null,
        pendingSmsPhoneNumber: null,
        pendingSmsCodeHash: null,
        pendingSmsExpiresAt: null,
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("SMS disable error:", error)
    return NextResponse.json({ error: "Unable to disable SMS" }, { status: 500 })
  }
}
