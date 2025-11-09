import { type NextRequest } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SocialService } from "@/lib/game-services/social-service"

const noteSchema = z.object({
  ownerId: z.string().min(1),
  targetId: z.string().min(1),
  stance: z.enum(["ALLY", "ENEMY", "FARM", "TRADE", "NEUTRAL"]).default("NEUTRAL"),
  note: z.string().min(1).max(2000),
  tags: z.array(z.string()).default([]),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req as unknown as Request)
    if (!auth) return unauthorizedResponse()
    const body = await req.json()
    const { ownerId, targetId, stance, note, tags } = noteSchema.parse(body)

    if (auth.playerId && auth.playerId !== ownerId) {
      return errorResponse("Owner mismatch", 403)
    }

    const saved = await SocialService.upsertContactNote(ownerId, targetId, stance, note, tags)
    return successResponse({ ok: true, note: saved })
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error, 400)
    return serverErrorResponse(error)
  }
}

