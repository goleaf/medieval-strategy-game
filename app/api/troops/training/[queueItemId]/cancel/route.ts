import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"
import { UnitSystemService } from "@/lib/game-services/unit-system-service"
import { SitterPermissions } from "@/lib/utils/sitter-permissions"

export async function POST(_req: NextRequest, context: { params: { queueItemId: string } }) {
  try {
    const auth = await authenticateRequest(_req)
    if (!auth?.playerId) {
      return errorResponse("Unauthorized", 401)
    }

    const queueItemId = context.params.queueItemId
    if (!queueItemId) {
      return errorResponse("Missing queue item id", 400)
    }

    // Enforce sitter permission for resource refunds
    const sitterContext = await SitterPermissions.getSitterContext(auth)
    if (sitterContext.isSitter) {
      const permissionCheck = await SitterPermissions.enforcePermission(
        _req,
        sitterContext.sitterId!,
        sitterContext.ownerId!,
        "useResources",
      )
      if (permissionCheck) return permissionCheck
    }

    const result = await UnitSystemService.cancelTrainingJob(queueItemId)
    return successResponse(result)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

