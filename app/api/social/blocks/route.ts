import { type NextRequest } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SocialService } from "@/lib/game-services/social-service"

const blockSchema = z.object({
  actorId: z.string().min(1),
  targetId: z.string().min(1),
  action: z.enum(["BLOCK", "UNBLOCK"]),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req as unknown as Request)
    if (!auth) return unauthorizedResponse()
    const body = await req.json()
    const { actorId, targetId, action } = blockSchema.parse(body)
    if (auth.playerId && auth.playerId !== actorId) return errorResponse("Actor mismatch", 403)
    const result = await SocialService.toggleBlock(actorId, targetId, action)
    return successResponse({ ok: true, result })
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error, 400)
    return serverErrorResponse(error)
  }
}

