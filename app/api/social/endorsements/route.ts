import { type NextRequest } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SocialService } from "@/lib/game-services/social-service"

const endorsementSchema = z.object({
  actorId: z.string().min(1),
  targetId: z.string().min(1),
  action: z.enum(["ENDORSE", "REVOKE"]),
  message: z.string().max(500).optional(),
  strength: z.number().int().min(1).max(5).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req as unknown as Request)
    if (!auth) return unauthorizedResponse()
    const body = await req.json()
    const { actorId, targetId, action, message, strength } = endorsementSchema.parse(body)
    if (auth.playerId && auth.playerId !== actorId) return errorResponse("Actor mismatch", 403)
    const result = await SocialService.endorsementAction(actorId, targetId, action, message, strength)
    return successResponse({ ok: true, result })
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error, 400)
    return serverErrorResponse(error)
  }
}

