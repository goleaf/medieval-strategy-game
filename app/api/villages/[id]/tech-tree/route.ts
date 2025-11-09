import { NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { TechTreeService } from "@/lib/game-services/tech-tree-service"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const villageId = params.id
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) return errorResponse("Player ID required", 400)

    const techs = await TechTreeService.getTechTreeForVillage(playerId, villageId)
    return successResponse(techs)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const villageId = params.id
    const body = await req.json()
    const playerId = body?.playerId as string | undefined
    const techKey = body?.techKey as string | undefined
    if (!playerId || !techKey) return errorResponse("playerId and techKey required", 400)

    const { completionAt } = await TechTreeService.startResearchAtVillage(playerId, villageId, techKey)
    return successResponse({ villageId, techKey, completionAt })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

