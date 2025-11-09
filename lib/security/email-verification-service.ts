import crypto from "crypto"
import { prisma } from "@/lib/db"
import { SECURITY_CONFIG } from "@/lib/config/security"
import { EmailService } from "@/lib/security/email-service"

export class EmailVerificationService {
  static async sendVerificationEmail(userId: string, email: string) {
    const token = await this.createToken(userId)
    await EmailService.sendVerificationEmail(email, token)
    return token
  }

  static async createToken(userId: string) {
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.emailVerification.expiryHours * 60 * 60 * 1000)
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    })
    return token
  }

  static async verify(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return null
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return record.user
  }
}
