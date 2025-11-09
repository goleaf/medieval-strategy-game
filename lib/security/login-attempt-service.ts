import { prisma } from "@/lib/db"
import { SECURITY_CONFIG } from "@/lib/config/security"

type AttemptParams = {
  userId?: string
  identifier: string
  ipAddress?: string | null
  userAgent?: string | null
}

export class LoginAttemptService {
  static async recordSuccess(params: AttemptParams) {
    await prisma.loginAttempt.create({
      data: {
        userId: params.userId,
        identifier: params.identifier,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        success: true,
      },
    })

    if (params.userId) {
      await prisma.user.update({
        where: { id: params.userId },
        data: {
          failedLoginAttempts: 0,
          lockoutExpiresAt: null,
        },
      })
    }
  }

  static async recordFailure(params: AttemptParams & { reason?: string }) {
    await prisma.loginAttempt.create({
      data: {
        userId: params.userId,
        identifier: params.identifier,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        success: false,
        failureReason: params.reason,
      },
    })

    if (!params.userId) return { locked: false }

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
      select: {
        failedLoginAttempts: true,
      },
    })

    if (updated.failedLoginAttempts >= SECURITY_CONFIG.login.maxFailures) {
      const lockoutExpiresAt = new Date(Date.now() + SECURITY_CONFIG.login.lockoutMinutes * 60 * 1000)
      await prisma.user.update({
        where: { id: params.userId },
        data: {
          lockoutExpiresAt,
          failedLoginAttempts: 0,
        },
      })

      return { locked: true, lockoutExpiresAt }
    }

    return { locked: false }
  }

  static isLocked(user: { lockoutExpiresAt: Date | null }) {
    if (!user.lockoutExpiresAt) return false
    return user.lockoutExpiresAt > new Date()
  }

  static async hasSeenIp(userId: string, ipAddress?: string | null) {
    if (!ipAddress) return true
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const count = await prisma.loginAttempt.count({
      where: {
        userId,
        ipAddress,
        success: true,
        createdAt: { gte: since },
      },
    })
    return count > 0
  }

  static async recentFailedAttempts(userId: string) {
    const since = new Date(Date.now() - SECURITY_CONFIG.login.windowMinutes * 60 * 1000)
    return prisma.loginAttempt.count({
      where: {
        userId,
        success: false,
        createdAt: { gte: since },
      },
    })
  }
}
