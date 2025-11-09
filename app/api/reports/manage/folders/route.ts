import { NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { createFolder, getFolderOverview } from "@/lib/reports/manage"

export async function GET(req: NextRequest) {
  const playerId = new URL(req.url).searchParams.get("playerId")
  if (!playerId) return errorResponse("playerId is required", 400)
  const data = await getFolderOverview(playerId)
  return successResponse(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const playerId = body?.playerId as string | undefined
  const name = body?.name as string | undefined
  if (!playerId || !name) return errorResponse("playerId and name are required", 400)
  const folder = await createFolder(playerId, name)
  return successResponse(folder, 201)
}

