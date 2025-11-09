import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import { errorResponse, successResponse } from "@/lib/utils/api-response"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const playerId = body?.playerId as string | undefined
  const platform = body?.platform as "IOS" | "ANDROID" | undefined
  const token = body?.token as string | undefined
  const appVersion = body?.appVersion as string | undefined
  const deviceLabel = body?.deviceLabel as string | undefined
  if (!playerId || !platform || !token) return errorResponse("playerId, platform, token required", 400)
  const device = await prisma.pushDevice.upsert({
    where: { token },
    update: { playerId, platform, appVersion, deviceLabel, lastSeenAt: new Date() },
    create: { playerId, platform, token, appVersion, deviceLabel },
  })
  return successResponse({ id: device.id })
}

