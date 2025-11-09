import { type NextRequest } from "next/server"
import { EventService } from "@/lib/game-services/event-service"
import { successResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const gameWorldId = url.searchParams.get("gameWorldId") || undefined
    const events = await EventService.listEvents(gameWorldId || undefined)
    return successResponse(events)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

