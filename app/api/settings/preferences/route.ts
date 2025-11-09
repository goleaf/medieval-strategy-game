import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"

async function getOrCreatePlayerSettings(playerId: string) {
  const existing = await prisma.playerSettings.findUnique({ where: { playerId } })
  if (existing) return existing
  return prisma.playerSettings.create({ data: { playerId } })
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()
    const settings = await getOrCreatePlayerSettings(auth.playerId)
    return successResponse(settings)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()
    const body = await req.json()

    // Whitelist fields to prevent unwanted updates
    const data: any = {}
    const allowed = [
      "language",
      "timeZone",
      "dateTimeFormat",
      "numberFormat",
      "theme",
      "defaultAttackType",
      "unitFormationTemplates",
      "enableAutoComplete",
      "confirmDialogs",
      "onlineStatusVisible",
      "contactPreferences",
      "dataSharingOptIn",
      "mapQuality",
      "animationsEnabled",
      "autoRefreshSeconds",
      "bandwidthSaver",
    ] as const

    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const updated = await prisma.playerSettings.upsert({
      where: { playerId: auth.playerId },
      create: { playerId: auth.playerId, ...data },
      update: data,
    })
    return successResponse(updated)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

