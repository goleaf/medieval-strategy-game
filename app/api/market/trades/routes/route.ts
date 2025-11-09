import { authenticateRequest } from "@/app/api/auth/middleware"
import { PlayerTradeService } from "@/lib/game-services/player-trade-service"
import { errorResponse, handleValidationError, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"
import type { NextRequest } from "next/server"
import { z } from "zod"

const SCHEDULE_SCHEMA = z.union([
  z.object({
    type: z.literal("interval"),
    everyMinutes: z.number().int().min(5).max(24 * 60),
  }),
  z.object({
    type: z.literal("fixed_times"),
    times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
  }),
])

const CREATE_RECURRING_SCHEMA = z.object({
  sourceVillageId: z.string().min(1),
  targetVillageId: z.string().min(1),
  resources: z.object({
    wood: z.number().int().min(0).default(0),
    stone: z.number().int().min(0).default(0),
    iron: z.number().int().min(0).default(0),
    gold: z.number().int().min(0).default(0),
    food: z.number().int().min(0).default(0),
  }),
  schedule: SCHEDULE_SCHEMA,
  skipIfInsufficient: z.boolean().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
})

const ROUTE_ACTION_SCHEMA = z.object({
  routeId: z.string().min(1),
  action: z.literal("CANCEL"),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth?.playerId) {
    return unauthorizedResponse()
  }

  const routes = await PlayerTradeService.listRecurringTransfers(auth.playerId)
  return successResponse(routes)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = CREATE_RECURRING_SCHEMA.parse(await request.json())
    const route = await PlayerTradeService.createRecurringTransfer({
      playerId: auth.playerId,
      sourceVillageId: payload.sourceVillageId,
      targetVillageId: payload.targetVillageId,
      resources: payload.resources,
      schedule: payload.schedule,
      skipIfInsufficient: payload.skipIfInsufficient,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
    })

    return successResponse(route, 201)
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

    const payload = ROUTE_ACTION_SCHEMA.parse(await request.json())
    const route = await PlayerTradeService.cancelRecurringTransfer(auth.playerId, payload.routeId)
    return successResponse(route)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return errorResponse((error as Error).message, 400)
  }
}
