import { type NextRequest } from "next/server"
import { EventService } from "@/lib/game-services/event-service"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url)
    const take = Number.parseInt(url.searchParams.get("take") || "100", 10)
    const event = await EventService.getEvent(params.id)
    if (!event) return errorResponse("Event not found", 404)
    const lb = await EventService.leaderboard(params.id, Math.min(Math.max(take, 1), 500))
    return successResponse({ eventId: params.id, leaderboard: lb })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

