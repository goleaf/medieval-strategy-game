import { NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { SmithyUpgradeService } from "@/lib/game-services/smithy-upgrade-service"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const villageId = params.id
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) return errorResponse("Player ID required", 400)

    const grid = await SmithyUpgradeService.getGrid(playerId, villageId)
    return successResponse(grid)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const villageId = params.id
    const body = await req.json()
    const playerId = body?.playerId as string | undefined
    const unitTypeId = body?.unitTypeId as string | undefined
    const kind = body?.kind as "ATTACK" | "DEFENSE" | undefined
    if (!playerId || !unitTypeId || !kind) return errorResponse("playerId, unitTypeId and kind required", 400)

    const { completionAt } = await SmithyUpgradeService.startUpgrade(playerId, villageId, unitTypeId, kind)
    return successResponse({ villageId, unitTypeId, kind, completionAt })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

