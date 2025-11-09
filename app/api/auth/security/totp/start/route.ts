import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../../middleware"
import { TwoFactorService } from "@/lib/security/two-factor-service"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const setup = await TwoFactorService.startTotpSetup(user.id, user.email)
    return NextResponse.json({ success: true, setup }, { status: 200 })
  } catch (error) {
    console.error("TOTP setup error:", error)
    return NextResponse.json({ error: "Unable to start TOTP setup" }, { status: 500 })
  }
}
