import { type NextRequest } from "next/server"
import { z } from "zod"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { AchievementService } from "@/lib/game-services/achievement-service"

const favSchema = z.object({
  playerId: z.string().min(1),
  key: z.string().min(1),
  favorite: z.boolean(),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req as unknown as Request)
    if (!auth) return unauthorizedResponse()
    const body = await req.json()
    const { playerId, key, favorite } = favSchema.parse(body)
    if (auth.playerId && auth.playerId !== playerId) return errorResponse("Actor mismatch", 403)
    const result = await AchievementService.setFavorite(playerId, key, favorite)
    return successResponse(result)
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(error, 400)
    return serverErrorResponse(error)
  }
}

