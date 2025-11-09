import { z } from "zod"
import { type NextRequest } from "next/server"

import { getRallyPointEngine } from "@/lib/rally-point/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"

const targetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("village"), villageId: z.string().min(1) }),
  z.object({
    type: z.literal("coords"),
    x: z.number(),
    y: z.number(),
    targetVillageId: z.string().optional(),
  }),
])

const missionSchema = z.object({
  sourceVillageId: z.string().min(1),
  sourceAccountId: z.string().min(1),
  mission: z.enum(["attack", "raid", "reinforce", "siege"]),
  target: targetSchema,
  units: z.record(z.number().int().nonnegative()),
  catapultTargets: z.array(z.string().min(1)).max(2).optional(),
  arriveAt: z.string().datetime().optional(),
  departAt: z.string().datetime().optional(),
  payload: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().uuid(),
})

export const POST = withMetrics("POST /api/rally-point/missions", async (req: NextRequest) => {
  try {
    const json = await req.json()
    const parsed = missionSchema.safeParse(json)
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const engine = getRallyPointEngine()
    const { arriveAt, departAt, ...rest } = parsed.data
    const result = await engine.sendMission({
      ...rest,
      arriveAt: arriveAt ? new Date(arriveAt) : undefined,
      departAt: departAt ? new Date(departAt) : undefined,
    })

    return successResponse({
      movement: result.movement,
      warnings: result.warnings,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
})
