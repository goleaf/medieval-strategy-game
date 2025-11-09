import { AccountRecoveryStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { SECURITY_CONFIG } from "@/lib/config/security"
import { SecurityQuestionService } from "@/lib/security/security-question-service"

type RecoveryInput = {
  email: string
  reason: string
  details?: {
    recentTransactions?: string[]
    villageDetails?: string
    lastLogin?: string
    additionalNotes?: string
  }
  securityQuestionId?: string
  securityAnswer?: string
}

export class AccountRecoveryService {
  static async createRequest(payload: RecoveryInput) {
    const normalizedEmail = payload.email.toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    const limitFrom = new Date(Date.now() - SECURITY_CONFIG.recovery.rateLimitHours * 60 * 60 * 1000)
    const recentRequest = await prisma.accountRecoveryRequest.findFirst({
      where: { email: normalizedEmail, createdAt: { gte: limitFrom } },
      orderBy: { createdAt: "desc" },
    })

    if (recentRequest) {
      throw new Error("A recovery request was recently submitted. Please wait before trying again.")
    }

    let securityQuestionPassed = false
    if (user && payload.securityQuestionId && payload.securityAnswer) {
      securityQuestionPassed = await SecurityQuestionService.verifyAnswer(
        user.id,
        payload.securityQuestionId,
        payload.securityAnswer,
      )
    }

    return prisma.accountRecoveryRequest.create({
      data: {
        userId: user?.id,
        email: normalizedEmail,
        reason: payload.reason,
        proof: payload.details ?? {},
        securityQuestionId: payload.securityQuestionId,
        securityQuestionPassed,
        verifiedOwnership: false,
        status: AccountRecoveryStatus.OPEN,
      },
    })
  }

  static async markVerified(requestId: string, notes?: string) {
    return prisma.accountRecoveryRequest.update({
      where: { id: requestId },
      data: {
        status: AccountRecoveryStatus.RESOLVED,
        verifiedOwnership: true,
        resolutionNotes: notes,
        resolvedAt: new Date(),
      },
    })
  }

  static async listUserRequests(email: string) {
    const normalizedEmail = email.toLowerCase().trim()
    return prisma.accountRecoveryRequest.findMany({
      where: { email: normalizedEmail },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
  }
}
