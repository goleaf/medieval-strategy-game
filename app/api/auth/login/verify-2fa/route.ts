import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createSessionToken } from "@/lib/auth"
import { TwoFactorService } from "@/lib/security/two-factor-service"
import { LoginAttemptService } from "@/lib/security/login-attempt-service"
import { EmailService } from "@/lib/security/email-service"
import { VillageService } from "@/lib/game-services/village-service"

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "development",
}

export async function POST(req: NextRequest) {
  try {
    const {
      challengeId,
      method,
      code,
      rememberDevice,
      trustedDeviceLabel,
    }: {
      challengeId: string
      method: "totp" | "backup" | "sms"
      code: string
      rememberDevice?: boolean
      trustedDeviceLabel?: string
    } = await req.json()

    if (!challengeId || !method || !code) {
      return NextResponse.json({ error: "Missing two-factor parameters" }, { status: 400 })
    }

    const challenge = await TwoFactorService.getChallenge(challengeId)
    if (!challenge) {
      return NextResponse.json({ error: "Challenge expired or invalid" }, { status: 400 })
    }

    const context = (challenge.context as Record<string, any> | null) || {}
    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
      include: { twoFactorSettings: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let verified = false
    if (method === "totp") {
      verified = await TwoFactorService.verifyTotp(user.id, code)
    } else if (method === "backup") {
      verified = await TwoFactorService.consumeBackupCode(user.id, code)
    } else if (method === "sms") {
      verified = await TwoFactorService.verifySmsCode(challengeId, code)
    }

    if (!verified) {
      const updated = await prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true },
      })

      if (updated.attempts >= 5) {
        await TwoFactorService.consumeChallenge(challenge.id)
        return NextResponse.json({ error: "Too many attempts. Please login again." }, { status: 423 })
      }

      return NextResponse.json({ error: "Invalid authentication code" }, { status: 401 })
    }

    await TwoFactorService.consumeChallenge(challenge.id)

    const rememberMe = Boolean(context.rememberMe)
    const ipAddress = context.ipAddress || getClientIp(req)
    const userAgent = context.userAgent || req.headers.get("user-agent")
    const hasSeenIpBefore = context.hasSeenIpBefore !== undefined ? Boolean(context.hasSeenIpBefore) : true

    let player = await prisma.player.findFirst({ where: { userId: user.id } })
    if (!player) {
      player = await prisma.player.create({
        data: {
          userId: user.id,
          playerName: user.username,
        },
      })
      const { ProtectionService } = await import("@/lib/game-services/protection-service")
      await ProtectionService.initializeProtection(player.id)
    }
    await VillageService.ensurePlayerHasVillage(player.id)

    await LoginAttemptService.recordSuccess({
      userId: user.id,
      identifier: user.email,
      ipAddress,
      userAgent,
    })

    const { token, session } = await createSessionToken(user.id, {
      rememberMe,
      ipAddress,
      userAgent,
      isTrusted: Boolean(rememberDevice),
    })

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastActiveAt: new Date(),
      },
    })

    const response = NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        player: player ? { id: player.id, playerName: player.playerName } : null,
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
          isTrusted: Boolean(rememberDevice),
          lastSeenAt: session.lastSeenAt,
        },
      },
      { status: 200 },
    )

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24
    response.cookies.set("session_token", token, { ...COOKIE_OPTIONS, maxAge })

    if (rememberDevice) {
      const trustedDevice = await TwoFactorService.createTrustedDevice(user.id, {
        ipAddress,
        userAgent,
        label: trustedDeviceLabel,
      })
      response.cookies.set("trusted_device", trustedDevice.token, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    if (!hasSeenIpBefore) {
      await EmailService.sendSecurityAlertEmail(user.email, { ipAddress, userAgent })
    }

    return response
  } catch (error) {
    console.error("2FA verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getClientIp(req: NextRequest) {
  const header = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")
  if (header) {
    const [first] = header.split(",")
    return first.trim()
  }
  // @ts-expect-error - Next runtime may expose ip
  return (req.ip as string | undefined) || "unknown"
}
