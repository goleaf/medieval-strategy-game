import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../middleware"
import { TwoFactorService } from "@/lib/security/two-factor-service"
import { EmailService } from "@/lib/security/email-service"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const codes = await TwoFactorService.generateBackupCodes(auth.userId)
    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (user) {
      await EmailService.sendTwoFactorBackupCodes(user.email, codes)
    }

    return NextResponse.json({ success: true, codes }, { status: 200 })
  } catch (error) {
    console.error("Backup code error:", error)
    return NextResponse.json({ error: "Unable to generate backup codes" }, { status: 500 })
  }
}
