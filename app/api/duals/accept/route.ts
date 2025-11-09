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

    const dual = await SitterDualService.acceptDual(auth.playerId, lobbyUserId)
    return successResponse({ id: dual.id, acceptedAt: dual.acceptedAt })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

