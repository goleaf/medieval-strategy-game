import { type NextRequest } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SocialService } from "@/lib/game-services/social-service"

const mentorshipSchema = z.object({
  actorId: z.string().min(1).optional(),
  targetId: z.string().min(1).optional(),
  mentorId: z.string().min(1).optional(),
  menteeId: z.string().min(1).optional(),
  action: z.enum(["REQUEST", "ACCEPT", "DECLINE", "CANCEL", "END"]),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req as unknown as Request)
    if (!auth) return unauthorizedResponse()
    const body = await req.json()
    const parsed = mentorshipSchema.parse(body)
    const actorId = parsed.actorId ?? parsed.mentorId ?? auth.playerId ?? ""
    const targetId = parsed.targetId ?? parsed.menteeId ?? ""
    if (!actorId || !targetId) return errorResponse("Invalid payload", 400)
    if (auth.playerId && auth.playerId !== actorId) return errorResponse("Actor mismatch", 403)
    const result = await SocialService.mentorshipAction(actorId, targetId, parsed.action)
    return successResponse({ ok: true, result })
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error, 400)
    return serverErrorResponse(error)
  }
}
