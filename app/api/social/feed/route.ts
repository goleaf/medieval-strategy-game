import { type NextRequest } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SocialService } from "@/lib/game-services/social-service"
import { SocialActivityType, SocialActivityVisibility } from "@prisma/client"

const feedSchema = z.object({
  ownerId: z.string().min(1).optional(),
  playerId: z.string().min(1).optional(), // alternate key used by client
  actorId: z.string().min(1).nullable().optional(),
  type: z.nativeEnum(SocialActivityType).optional(),
  activityType: z.nativeEnum(SocialActivityType).optional(), // alternate key used by client
  visibility: z.nativeEnum(SocialActivityVisibility).default("PUBLIC"),
  summary: z.string().min(1).max(500),
  payload: z.record(z.any()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req as unknown as Request)
    if (!auth) return unauthorizedResponse()
    const body = await req.json()
    const parsed = feedSchema.parse(body)
    const ownerId = parsed.ownerId ?? parsed.playerId ?? auth.playerId ?? ""
    const type = parsed.type ?? parsed.activityType ?? SocialActivityType.SOCIAL
    if (!ownerId) return errorResponse("ownerId required", 400)
    if (auth.playerId && auth.playerId !== ownerId) return errorResponse("Owner mismatch", 403)
    const result = await SocialService.postActivity(ownerId, parsed.actorId ?? null, type, parsed.visibility, parsed.summary, parsed.payload)
    return successResponse({ ok: true, result })
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error, 400)
    return serverErrorResponse(error)
  }
}
