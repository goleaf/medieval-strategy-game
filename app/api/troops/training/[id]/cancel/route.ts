import { type NextRequest } from "next/server"

import { UnitSystemService } from "@/lib/game-services/unit-system-service"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"

export const POST = withMetrics("POST /api/troops/training/[id]/cancel", async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    if (!params?.id) {
      return errorResponse("Training queue item id required", 400)
    }

    const result = await UnitSystemService.cancelTrainingJob(params.id)
    return successResponse(result)
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400)
    }
    return serverErrorResponse(error)
  }
})
