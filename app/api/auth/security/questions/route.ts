import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../middleware"
import { SecurityQuestionService } from "@/lib/security/security-question-service"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { questions } = await req.json()
    await SecurityQuestionService.upsertQuestions(auth.userId, questions || [])

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Security question update error:", error)
    return NextResponse.json({ error: (error as Error).message || "Unable to update questions" }, { status: 400 })
  }
}
