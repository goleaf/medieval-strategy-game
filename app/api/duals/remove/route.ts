import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()

    const body = await req.json()
    const { lobbyUserId } = body || {}
    if (!lobbyUserId) return errorResponse("Missing lobbyUserId", 400)

    await SitterDualService.removeDual(auth.playerId, lobbyUserId)
    return successResponse({ removed: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

