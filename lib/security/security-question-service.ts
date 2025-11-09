import { hash, compare } from "bcryptjs"
import { prisma } from "@/lib/db"
import { getSecurityQuestion } from "@/lib/security/security-questions"

type SecurityQuestionInput = {
  questionId: string
  answer: string
}

export class SecurityQuestionService {
  static async upsertQuestions(userId: string, questions: SecurityQuestionInput[]) {
    const filtered = questions
      .filter(q => q.answer.trim())
      .slice(0, 3)

    for (const entry of filtered) {
      if (!getSecurityQuestion(entry.questionId)) {
        throw new Error(`Invalid security question: ${entry.questionId}`)
      }
    }

    await prisma.securityQuestion.deleteMany({ where: { userId } })
    if (filtered.length === 0) return []

    return Promise.all(
      filtered.map(async question => {
        const answerHash = await hash(question.answer.trim().toLowerCase(), 10)
        return prisma.securityQuestion.create({
          data: {
            userId,
            questionKey: question.questionId,
            answerHash,
          },
        })
      }),
    )
  }

  static async verifyAnswer(userId: string, questionId: string, answer: string) {
    if (!answer) return false
    const record = await prisma.securityQuestion.findFirst({
      where: { userId, questionKey: questionId },
    })
    if (!record) return false
    return compare(answer.trim().toLowerCase(), record.answerHash)
  }

  static async verifyAnyAnswer(userId: string, answer: string) {
    if (!answer) return false
    const questions = await prisma.securityQuestion.findMany({ where: { userId } })
    for (const question of questions) {
      if (await compare(answer.trim().toLowerCase(), question.answerHash)) {
        return true
      }
    }
    return questions.length === 0
  }
}
