import { type NextRequest } from "next/server"
import { EventService } from "@/lib/game-services/event-service"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await EventService.getEvent(params.id)
    if (!event) return errorResponse("Event not found", 404)
    return successResponse(event)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

