import crypto from "crypto"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { SECURITY_CONFIG } from "@/lib/config/security"
import { EmailService } from "@/lib/security/email-service"
import { validatePassword } from "@/lib/security/password-policy"
import { SecurityQuestionService } from "@/lib/security/security-question-service"
import { SessionService } from "@/lib/security/session-service"

type ResetContext = {
  ipAddress?: string | null
  userAgent?: string | null
}

export class PasswordResetService {
  static async requestReset(email: string, context: ResetContext = {}) {
    const normalized = email.toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email: normalized } })

    const recentHour = new Date(Date.now() - 60 * 60 * 1000)
    const recentDay = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [hourCount, dayCount] = await Promise.all([
      prisma.passwordResetRequest.count({
        where: { email: normalized, createdAt: { gte: recentHour } },
      }),
      prisma.passwordResetRequest.count({
        where: { email: normalized, createdAt: { gte: recentDay } },
      }),
    ])

    if (hourCount >= SECURITY_CONFIG.passwordReset.maxRequestsPerHour || dayCount >= SECURITY_CONFIG.passwordReset.maxRequestsPerDay) {
      throw new Error("Too many reset attempts. Please try again later.")
    }

    const token = crypto.randomBytes(48).toString("hex")
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.passwordReset.expiryMinutes * 60 * 1000)

    await prisma.passwordResetRequest.create({
      data: {
        userId: user?.id,
        email: normalized,
        token,
        expiresAt,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    })

    if (user) {
      await EmailService.sendPasswordResetEmail(user.email, token)
    }

    return true
  }

  static async verifyToken(token: string) {
    const request = await prisma.passwordResetRequest.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!request || request.usedAt || request.expiresAt < new Date()) {
      return null
    }
    return request
  }

  static async completeReset(token: string, newPassword: string, securityAnswer?: string) {
    const request = await this.verifyToken(token)
    if (!request || !request.user) {
      throw new Error("Invalid or expired reset token")
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors[0])
    }

    const hasQuestions = await prisma.securityQuestion.count({ where: { userId: request.user.id } })
    if (hasQuestions > 0) {
      const validAnswer = await SecurityQuestionService.verifyAnyAnswer(request.user.id, securityAnswer || "")
      if (!validAnswer) {
        throw new Error("Security question verification failed")
      }
    }

    const hashedPassword = await hash(newPassword, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.user.id },
        data: {
          password: hashedPassword,
          lockoutExpiresAt: null,
          failedLoginAttempts: 0,
        },
      }),
      prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { usedAt: new Date() },
      }),
    ])

    await SessionService.revokeAllSessions(request.user.id)
    return true
  }
}
