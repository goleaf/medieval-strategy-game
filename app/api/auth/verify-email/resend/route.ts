import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../middleware"
import { prisma } from "@/lib/db"
import { EmailVerificationService } from "@/lib/security/email-verification-service"

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

    if (user.emailVerifiedAt) {
      return NextResponse.json({ success: true, message: "Email already verified" }, { status: 200 })
    }

    await EmailVerificationService.sendVerificationEmail(user.id, user.email)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
