import { z } from "zod"
import { type NextRequest } from "next/server"

import { getRallyPointEngine } from "@/lib/rally-point/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

const recallSchema = z.object({
  fromVillageId: z.string().min(1),
  toVillageId: z.string().min(1),
  ownerAccountId: z.string().min(1),
  units: z.record(z.number().int().nonnegative()),
  idempotencyKey: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = recallSchema.safeParse(json)
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const engine = getRallyPointEngine()
    const movement = await engine.recallReinforcements(parsed.data)
    return successResponse({ movement })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
