import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"
import { type NextRequest, NextResponse } from "next/server"
import { createSessionToken } from "@/lib/auth"
import { VillageService } from "@/lib/game-services/village-service"
import { ensureDemoEnvironment } from "@/lib/setup/demo-data"
import { LoginAttemptService } from "@/lib/security/login-attempt-service"
import { TwoFactorService } from "@/lib/security/two-factor-service"
import { EmailService } from "@/lib/security/email-service"

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "development",
}

export async function POST(req: NextRequest) {
  try {
    await ensureDemoEnvironment()

    const body = await req.json()
    const identifier: string = body.identifier || body.email
    const password: string = body.password
    const rememberMe: boolean = Boolean(body.rememberMe)

    if (!identifier || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    }

    const ipAddress = getClientIp(req)
    const userAgent = req.headers.get("user-agent")
    const normalizedEmail = identifier.includes("@") ? identifier.toLowerCase().trim() : null

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          { username: identifier.trim() },
        ],
      },
      include: {
        twoFactorSettings: true,
        players: true,
      },
    })

    // IP ban check
    {
      const { isIpBanned } = await import("@/lib/moderation/enforcement")
      if (await isIpBanned(ipAddress)) {
        return NextResponse.json({ error: "IP banned" }, { status: 403 })
      }
    }

    if (!user) {
      await LoginAttemptService.recordFailure({ identifier, ipAddress, userAgent, reason: "unknown-user" })
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (LoginAttemptService.isLocked(user)) {
      return NextResponse.json(
        {
          error: "Account locked due to repeated failures. Try again later.",
          lockoutExpiresAt: user.lockoutExpiresAt,
        },
        { status: 423 },
      )
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Email verification required", emailNotVerified: true },
        { status: 403 },
      )
    }

    // Account suspension check
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return NextResponse.json(
        { error: "Account suspended", suspendedUntil: user.suspendedUntil },
        { status: 403 },
      )
    }

    const passwordValid = await compare(password, user.password)
    if (!passwordValid) {
      const failure = await LoginAttemptService.recordFailure({
        userId: user.id,
        identifier,
        ipAddress,
        userAgent,
        reason: "invalid-password",
      })

      return NextResponse.json(
        {
          error: "Invalid credentials",
          ...(failure.lockoutExpiresAt && { lockoutExpiresAt: failure.lockoutExpiresAt }),
        },
        { status: 401 },
      )
    }

    // Ensure player record exists
    let player = user.players[0]
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

    const trustedDeviceToken = req.cookies.get("trusted_device")?.value
    let trustedDevice = null
    if (trustedDeviceToken) {
      trustedDevice = await TwoFactorService.verifyTrustedDevice(user.id, trustedDeviceToken)
    }

    const twoFactorEnabled = Boolean(user.twoFactorSettings?.totpEnabled || user.twoFactorSettings?.smsEnabled)
    const requiresTwoFactor = twoFactorEnabled && !trustedDevice
    const hasSeenIpBefore = await LoginAttemptService.hasSeenIp(user.id, ipAddress)

    if (requiresTwoFactor) {
      const challenge = await TwoFactorService.createChallenge(user.id, {
        rememberMe,
        ipAddress,
        userAgent,
        hasSeenIpBefore,
      })

      return NextResponse.json(
        {
          twoFactorRequired: true,
          challengeId: challenge.id,
          methods: {
            totp: Boolean(user.twoFactorSettings?.totpEnabled),
            sms: Boolean(user.twoFactorSettings?.smsEnabled && user.twoFactorSettings.smsPhoneNumber),
            backupCodes: Array.isArray(user.twoFactorSettings?.backupCodes)
              ? user.twoFactorSettings.backupCodes.length
              : 0,
          },
        },
        { status: 200 },
      )
    }

    await LoginAttemptService.recordSuccess({ userId: user.id, identifier, ipAddress, userAgent })

    const { token, session } = await createSessionToken(user.id, {
      rememberMe,
      ipAddress,
      userAgent,
      isTrusted: Boolean(trustedDevice),
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
          isTrusted: session.isTrusted,
          lastSeenAt: session.lastSeenAt,
        },
      },
      { status: 200 },
    )

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24
    response.cookies.set("session_token", token, { ...COOKIE_OPTIONS, maxAge })

    if (trustedDeviceToken && trustedDevice) {
      response.cookies.set("trusted_device", trustedDeviceToken, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    if (!hasSeenIpBefore) {
      await EmailService.sendSecurityAlertEmail(user.email, { ipAddress, userAgent })
    }

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getClientIp(req: NextRequest) {
  const header = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")
  if (header) {
    const [first] = header.split(",")
    return first.trim()
  }
  // @ts-expect-error - NextRequest exposes ip in some runtimes
  return (req.ip as string | undefined) || "unknown"
}
