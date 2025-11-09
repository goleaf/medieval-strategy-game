import { type NextRequest } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { PlayerProfileService } from "@/lib/game-services/player-profile-service"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const playerId = url.searchParams.get("playerId") ?? undefined
    const handle = url.searchParams.get("handle") ?? undefined

    if (!playerId && !handle) {
      return errorResponse("playerId or handle is required", 400)
    }

    const auth = await getAuthUser(req as unknown as Request)
    const viewerId = auth?.playerId ?? null

    const profile = await PlayerProfileService.getProfile({ playerId, handle, viewerId })
    if (!profile) return errorResponse("Player not found", 404)
    return successResponse(profile)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

