import { type NextRequest } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SocialService } from "@/lib/game-services/social-service"

const friendActionSchema = z.object({
  actorId: z.string().min(1),
  targetId: z.string().min(1),
  action: z.enum(["REQUEST", "ACCEPT", "DECLINE", "REMOVE", "CANCEL"]),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req as unknown as Request)
    if (!auth) return unauthorizedResponse()
    const body = await req.json()
    const { actorId, targetId, action } = friendActionSchema.parse(body)

    // Optional: ensure the actor matches the authenticated player when available
    if (auth.playerId && auth.playerId !== actorId) {
      return errorResponse("Actor mismatch", 403)
    }

    let result: unknown
    switch (action) {
      case "REQUEST":
        result = await SocialService.requestFriendship(actorId, targetId)
        break
      case "ACCEPT":
        result = await SocialService.acceptFriendship(actorId, targetId)
        break
      case "DECLINE":
        result = await SocialService.declineFriendship(actorId, targetId)
        break
      case "REMOVE":
      case "CANCEL":
        result = await SocialService.removeFriendship(actorId, targetId)
        break
      default:
        return errorResponse("Unsupported action", 400)
    }
    return successResponse({ ok: true, result }, 200)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error, 400)
    }
    return serverErrorResponse(error)
  }
}

