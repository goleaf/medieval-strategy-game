import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"

async function getOrCreateNotificationPref(playerId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { playerId } })
  if (existing) return existing
  return prisma.notificationPreference.create({ data: { playerId } })
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()
    const pref = await getOrCreateNotificationPref(auth.playerId)
    return successResponse(pref)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()
    const body = await req.json()

    // Whitelist allowed fields
  const allowed = [
      "globalEnabled",
      "doNotDisturbEnabled",
      "importanceThreshold",
      "desktopEnabled",
      "mobilePushEnabled",
      "emailFrequency",
      "quietHoursEnabled",
      "quietHoursStart",
      "quietHoursEnd",
      "suppressNonCriticalDuringQuietHours",
      "groupSimilar",
      "groupingWindowMinutes",
      "retentionDays",
      "typeSettings",
      "soundProfiles",
      "channelPreferences",
    ] as const

    const data: any = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const updated = await prisma.notificationPreference.upsert({
      where: { playerId: auth.playerId },
      create: { playerId: auth.playerId, ...data },
      update: data,
    })
    return successResponse(updated)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
