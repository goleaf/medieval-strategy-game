import { z } from "zod"
import { type NextRequest } from "next/server"

import { getRallyPointEngine } from "@/lib/rally-point/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"

const bodySchema = z.object({ ownerAccountId: z.string().min(1) })

export const POST = withMetrics("POST /api/rally-point/movements/[movementId]/cancel", async (
  req: NextRequest,
  { params }: { params: { movementId: string } },
) => {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const engine = getRallyPointEngine()
    const cancelled = await engine.cancelMovement(params.movementId, parsed.data.ownerAccountId)
    return successResponse({ cancelled })
  } catch (error) {
    return serverErrorResponse(error)
  }
})
