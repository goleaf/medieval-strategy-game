import { authenticateRequest } from "@/app/api/auth/middleware"
import { ResourceReservationService } from "@/lib/game-services/resource-reservation-service"
import { errorResponse, handleValidationError, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import type { NextRequest } from "next/server"
import { z } from "zod"

const RESERVATION_SCHEMA = z.object({
  villageId: z.string().min(1),
  label: z.string().min(1).max(80),
  resources: z.object({
    wood: z.number().int().min(0).default(0),
    stone: z.number().int().min(0).default(0),
    iron: z.number().int().min(0).default(0),
    gold: z.number().int().min(0).default(0),
    food: z.number().int().min(0).default(0),
  }),
  expiresAt: z.coerce.date().optional(),
})

const RESERVATION_ACTION_SCHEMA = z.object({
  reservationId: z.string().min(1),
  action: z.literal("RELEASE"),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth?.playerId) {
    return unauthorizedResponse()
  }

  const reservations = await ResourceReservationService.listActiveReservations(auth.playerId)
  return successResponse(reservations)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = RESERVATION_SCHEMA.parse(await request.json())
    const reservation = await ResourceReservationService.createReservation({
      playerId: auth.playerId,
      villageId: payload.villageId,
      label: payload.label,
      resources: payload.resources,
      expiresAt: payload.expiresAt,
    })

    return successResponse(reservation, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return errorResponse((error as Error).message, 400)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = RESERVATION_ACTION_SCHEMA.parse(await request.json())
    const reservation = await ResourceReservationService.releaseReservation(payload.reservationId, auth.playerId)
    return successResponse(reservation)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return errorResponse((error as Error).message, 400)
  }
}
