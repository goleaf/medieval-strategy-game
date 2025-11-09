import { type NextRequest } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { submitFeedback } from "@/lib/utils/feedback"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"

const feedbackSchema = z.object({
  category: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]).default("low"),
  summary: z.string().min(5).max(200),
  details: z.string().max(4000).optional(),
  contact: z.string().max(200).optional(),
})

export const POST = withMetrics("POST /api/feedback", async (req: NextRequest) => {
  try {
    const auth = await getAuthUser(req as unknown as Request)
    const body = await req.json()
    const { category, severity, summary, details, contact } = feedbackSchema.parse(body)

    const saved = await submitFeedback({
      playerId: auth?.playerId,
      category,
      severity,
      summary,
      details,
      contact,
    })

    return successResponse({ ok: true, id: saved.id })
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error, 400)
    return serverErrorResponse(error)
  }
})
