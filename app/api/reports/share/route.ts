import { NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { createShareToken } from "@/lib/reports/manage"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const playerId = body?.playerId as string | undefined
  const kind = body?.kind as "MOVEMENT" | "SCOUT" | undefined
  const refId = body?.refId as string | undefined
  const expiresHours = body?.expiresHours as number | undefined
  if (!playerId || !kind || !refId) return errorResponse("playerId, kind and refId are required", 400)
  const token = await createShareToken({ playerId, kind, refId, expiresHours })
  return successResponse({ token: token.token, expiresAt: token.expiresAt.toISOString() }, 201)
}

