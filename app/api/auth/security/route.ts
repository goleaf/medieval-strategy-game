import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../middleware"
import { prisma } from "@/lib/db"
import { SECURITY_QUESTIONS } from "@/lib/security/security-questions"
import { SessionService } from "@/lib/security/session-service"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        twoFactorSettings: true,
        securityQuestions: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const [sessions, trustedDevices, recoveryRequests] = await Promise.all([
      SessionService.listActiveSessions(user.id),
      prisma.trustedDevice.findMany({
        where: { userId: user.id, expiresAt: { gt: new Date() } },
        orderBy: { lastUsedAt: "desc" },
      }),
      prisma.accountRecoveryRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ])

    const twoFactorSettings = user.twoFactorSettings
    const maskedPhone = twoFactorSettings?.smsPhoneNumber
      ? maskPhone(twoFactorSettings.smsPhoneNumber)
      : null

    return NextResponse.json(
      {
        emailVerified: Boolean(user.emailVerifiedAt),
        securityQuestions: user.securityQuestions.map(question => question.questionKey),
        availableQuestions: SECURITY_QUESTIONS,
        twoFactor: {
          totpEnabled: Boolean(twoFactorSettings?.totpEnabled),
          smsEnabled: Boolean(twoFactorSettings?.smsEnabled),
          smsPhone: maskedPhone,
          backupCodesRemaining: Array.isArray(twoFactorSettings?.backupCodes)
            ? twoFactorSettings.backupCodes.length
            : 0,
        },
        sessions: sessions.map(session => ({
          id: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          lastSeenAt: session.lastSeenAt,
          expiresAt: session.expiresAt,
          isTrusted: session.isTrusted,
        })),
        trustedDevices: trustedDevices.map(device => ({
          id: device.id,
          label: device.label,
          lastUsedAt: device.lastUsedAt,
          expiresAt: device.expiresAt,
          ipAddress: device.ipAddress,
          userAgent: device.userAgent,
        })),
        recoveryRequests: recoveryRequests.map(request => ({
          id: request.id,
          status: request.status,
          createdAt: request.createdAt,
          verifiedOwnership: request.verifiedOwnership,
        })),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Security overview error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function maskPhone(phone: string) {
  return phone.replace(/\d(?=\d{2})/g, "*")
}
