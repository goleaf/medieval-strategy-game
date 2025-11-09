import { prisma } from "@/lib/db"
import { SECURITY_CONFIG } from "@/lib/config/security"

export type CreateSessionOptions = {
  rememberMe?: boolean
  userAgent?: string | null
  ipAddress?: string | null
  isTrusted?: boolean
  label?: string | null
}

export class SessionService {
  static async createSession(userId: string, options: CreateSessionOptions = {}) {
    const now = Date.now()
    const lifetimeHours = options.rememberMe
      ? SECURITY_CONFIG.session.rememberLifetimeDays * 24
      : SECURITY_CONFIG.session.defaultLifetimeHours
    const expiresAt = new Date(now + lifetimeHours * 60 * 60 * 1000)

    return prisma.userSession.create({
      data: {
        userId,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
        sessionLabel: options.label ?? null,
        isTrusted: Boolean(options.isTrusted),
        expiresAt,
      },
    })
  }

  static async validateSession(sessionId: string) {
    const session = await prisma.userSession.findUnique({ where: { id: sessionId } })
    if (!session || session.revokedAt) return null
    const now = new Date()

    if (session.expiresAt < now) {
      await this.revokeSession(sessionId)
      return null
    }

    const idleThreshold = new Date(now.getTime() - SECURITY_CONFIG.session.idleTimeoutMinutes * 60 * 1000)
    if (session.lastSeenAt < idleThreshold) {
      await this.revokeSession(sessionId)
      return null
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: now },
    })

    return session
  }

  static async revokeSession(sessionId: string) {
    await prisma.userSession.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })
  }

  static async revokeAllSessions(userId: string, exceptSessionId?: string) {
    await prisma.userSession.updateMany({
      where: {
        userId,
        ...(exceptSessionId && { NOT: { id: exceptSessionId } }),
      },
      data: { revokedAt: new Date() },
    })
  }

  static async listActiveSessions(userId: string) {
    return prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastSeenAt: "desc" },
    })
  }
}
