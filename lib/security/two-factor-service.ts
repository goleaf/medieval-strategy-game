import crypto from "crypto"
import { hash, compare } from "bcryptjs"
import { prisma } from "@/lib/db"
import { SECURITY_CONFIG } from "@/lib/config/security"
import { generateTotpSecret, generateTotpUri, verifyTotpCode } from "@/lib/security/totp"
import { SmsService } from "@/lib/security/sms-service"

type ChallengeContext = {
  rememberMe?: boolean
  ipAddress?: string | null
  userAgent?: string | null
  trustedDeviceRequested?: boolean
  trustedDeviceLabel?: string | null
  smsCodeHash?: string
  smsCodeCreatedAt?: string
}

const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export class TwoFactorService {
  static async ensureSettings(userId: string) {
    const existing = await prisma.twoFactorSettings.findUnique({ where: { userId } })
    if (existing) return existing
    return prisma.twoFactorSettings.create({ data: { userId } })
  }

  static async getSettings(userId: string) {
    return this.ensureSettings(userId)
  }

  static async startTotpSetup(userId: string, label: string) {
    await this.ensureSettings(userId)
    const secret = generateTotpSecret()
    const uri = generateTotpUri({
      secret,
      label,
      issuer: "Medieval Strategy",
    })

    await prisma.twoFactorSettings.update({
      where: { userId },
      data: {
        pendingTotpSecret: secret,
        pendingTotpCreatedAt: new Date(),
      },
    })

    return { secret, uri }
  }

  static async confirmTotp(userId: string, code: string) {
    const settings = await this.ensureSettings(userId)
    if (!settings.pendingTotpSecret) {
      throw new Error("No pending TOTP setup")
    }

    if (!verifyTotpCode(settings.pendingTotpSecret, code)) {
      return false
    }

    await prisma.twoFactorSettings.update({
      where: { userId },
      data: {
        totpSecret: settings.pendingTotpSecret,
        totpEnabled: true,
        pendingTotpSecret: null,
        pendingTotpCreatedAt: null,
      },
    })

    return true
  }

  static async disableTotp(userId: string) {
    await this.ensureSettings(userId)
    await prisma.twoFactorSettings.update({
      where: { userId },
      data: {
        totpEnabled: false,
        totpSecret: null,
      },
    })
  }

  static async generateBackupCodes(userId: string) {
    await this.ensureSettings(userId)
    const codes = Array.from({ length: SECURITY_CONFIG.twoFactor.backupCodeCount }, () => this.generateBackupCode())
    const hashed = await Promise.all(codes.map(code => hash(this.normalizeBackupCode(code), 8)))

    await prisma.twoFactorSettings.update({
      where: { userId },
      data: {
        backupCodes: hashed,
        lastBackupCodesAt: new Date(),
      },
    })

    return codes
  }

  static async consumeBackupCode(userId: string, code: string) {
    const settings = await prisma.twoFactorSettings.findUnique({
      where: { userId },
      select: { backupCodes: true },
    })

    if (!settings?.backupCodes || !Array.isArray(settings.backupCodes)) {
      return false
    }

    const codes = settings.backupCodes as string[]
    const normalized = this.normalizeBackupCode(code)
    for (let i = 0; i < codes.length; i++) {
      const valid = await compare(normalized, codes[i])
      if (valid) {
        codes.splice(i, 1)
        await prisma.twoFactorSettings.update({
          where: { userId },
          data: { backupCodes: codes },
        })
        return true
      }
    }

    return false
  }

  static async verifyTotp(userId: string, code: string) {
    const settings = await prisma.twoFactorSettings.findUnique({
      where: { userId },
      select: { totpSecret: true, totpEnabled: true },
    })

    if (!settings?.totpSecret || !settings.totpEnabled) {
      return false
    }

    return verifyTotpCode(settings.totpSecret, code)
  }

  static async createChallenge(userId: string, context: ChallengeContext = {}) {
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.twoFactor.challengeExpiryMinutes * 60 * 1000)
    const challenge = await prisma.twoFactorChallenge.create({
      data: {
        userId,
        expiresAt,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        context,
      },
    })

    return challenge
  }

  static async getChallenge(challengeId: string) {
    const challenge = await prisma.twoFactorChallenge.findUnique({
      where: { id: challengeId },
    })

    if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) {
      return null
    }

    return challenge
  }

  static async consumeChallenge(challengeId: string) {
    await prisma.twoFactorChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    })
  }

  static async requestSmsEnrollment(userId: string, phoneNumber: string) {
    await this.ensureSettings(userId)
    const code = this.randomDigits(6)
    await prisma.twoFactorSettings.update({
      where: { userId },
      data: {
        pendingSmsPhoneNumber: phoneNumber,
        pendingSmsCodeHash: await hash(code, 8),
        pendingSmsExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    await SmsService.sendTwoFactorCode(phoneNumber, code)
    return true
  }

  static async confirmSmsEnrollment(userId: string, code: string) {
    const settings = await this.ensureSettings(userId)
    if (
      !settings?.pendingSmsCodeHash ||
      !settings.pendingSmsExpiresAt ||
      settings.pendingSmsExpiresAt < new Date() ||
      !settings.pendingSmsPhoneNumber
    ) {
      return false
    }

    const valid = await compare(code, settings.pendingSmsCodeHash)
    if (!valid) return false

    await prisma.twoFactorSettings.update({
      where: { userId },
      data: {
        smsEnabled: true,
        smsPhoneNumber: settings.pendingSmsPhoneNumber,
        pendingSmsPhoneNumber: null,
        pendingSmsCodeHash: null,
        pendingSmsExpiresAt: null,
      },
    })

    return true
  }

  static async requestLoginSmsCode(userId: string, challengeId: string) {
    const settings = await this.ensureSettings(userId)
    if (!settings?.smsEnabled || !settings.smsPhoneNumber) {
      throw new Error("SMS authentication is not enabled")
    }

    const code = this.randomDigits(6)
    const challenge = await this.getChallenge(challengeId)
    if (!challenge || challenge.userId !== userId) {
      throw new Error("Challenge not found or expired")
    }

    const context = {
      ...(challenge.context as ChallengeContext | null),
      smsCodeHash: await hash(code, 8),
      smsCodeCreatedAt: new Date().toISOString(),
    }

    await prisma.twoFactorChallenge.update({
      where: { id: challengeId },
      data: { context },
    })

    await SmsService.sendTwoFactorCode(settings.smsPhoneNumber, code)
    return true
  }

  static async verifySmsCode(challengeId: string, code: string) {
    const challenge = await this.getChallenge(challengeId)
    if (!challenge) return false

    const context = (challenge.context as ChallengeContext | null) || {}
    if (!context.smsCodeHash) return false

    const valid = await compare(code, context.smsCodeHash)
    if (!valid) return false

    // Clear sms code so it cannot be reused
    delete context.smsCodeHash
    delete context.smsCodeCreatedAt
    await prisma.twoFactorChallenge.update({
      where: { id: challengeId },
      data: { context },
    })

    return true
  }

  static async createTrustedDevice(userId: string, options: { ipAddress?: string | null; userAgent?: string | null; label?: string | null }) {
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.twoFactor.trustedDeviceDays * 24 * 60 * 60 * 1000)
    await prisma.trustedDevice.create({
      data: {
        userId,
        deviceTokenHash: await hash(token, 10),
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
        label: options.label ?? "Trusted device",
        expiresAt,
      },
    })

    return { token, expiresAt }
  }

  static async verifyTrustedDevice(userId: string, token: string) {
    if (!token) return null
    const devices = await prisma.trustedDevice.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    })

    for (const device of devices) {
      const matches = await compare(token, device.deviceTokenHash)
      if (matches) {
        await prisma.trustedDevice.update({
          where: { id: device.id },
          data: { lastUsedAt: new Date() },
        })
        return device
      }
    }

    return null
  }

  private static generateBackupCode() {
    let code = ""
    for (let i = 0; i < SECURITY_CONFIG.twoFactor.backupCodeLength; i++) {
      const index = crypto.randomInt(0, BACKUP_ALPHABET.length)
      code += BACKUP_ALPHABET[index]
      if ((i + 1) % 4 === 0 && i !== SECURITY_CONFIG.twoFactor.backupCodeLength - 1) {
        code += "-"
      }
    }
    return code
  }

  private static normalizeBackupCode(code: string) {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, "")
  }

  private static randomDigits(length: number) {
    return Array.from({ length }, () => crypto.randomInt(0, 10)).join("")
  }
}
