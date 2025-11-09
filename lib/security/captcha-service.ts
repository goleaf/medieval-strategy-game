import { prisma } from "@/lib/db"
import { SECURITY_CONFIG } from "@/lib/config/security"
import { hash, compare } from "bcryptjs"

type CaptchaChallengeOptions = {
  ipAddress?: string | null
}

export class CaptchaService {
  static async createChallenge(options: CaptchaChallengeOptions = {}) {
    const challenge = generateMathPrompt()
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.captcha.expiryMinutes * 60 * 1000)

    const record = await prisma.captchaChallenge.create({
      data: {
        question: challenge.prompt,
        answerHash: await hash(challenge.answer.toLowerCase(), 8),
        expiresAt,
        ipAddress: options.ipAddress ?? null,
      },
      select: {
        id: true,
        question: true,
        expiresAt: true,
      },
    })

    return record
  }

  static async verifyChallenge(challengeId: string, answer: string) {
    if (!challengeId || !answer) return false
    const record = await prisma.captchaChallenge.findUnique({
      where: { id: challengeId },
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return false
    }

    const valid = await compare(answer.trim().toLowerCase(), record.answerHash)
    if (valid) {
      await prisma.captchaChallenge.update({
        where: { id: challengeId },
        data: { usedAt: new Date() },
      })
    }

    return valid
  }
}

function generateMathPrompt() {
  const operations = ["+", "-", "*"] as const
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const operation = operations[Math.floor(Math.random() * operations.length)]
  let answer = ""

  switch (operation) {
    case "+":
      answer = String(a + b)
      break
    case "-":
      answer = String(a - b)
      break
    case "*":
      answer = String(a * b)
      break
  }

  return {
    prompt: `What is ${a} ${operation} ${b}?`,
    answer,
  }
}
