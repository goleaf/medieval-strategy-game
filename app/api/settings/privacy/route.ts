import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()
    const player = await prisma.player.findUnique({
      where: { id: auth.playerId },
      select: {
        profileVisibility: true,
        allowFriendRequests: true,
        allowMentorship: true,
        socialFeedOptIn: true,
      },
    })
    if (!player) return errorResponse("Player not found", 404)
    return successResponse(player)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()
    const body = await req.json()

    const data: any = {}
    for (const key of [
      "profileVisibility",
      "allowFriendRequests",
      "allowMentorship",
      "socialFeedOptIn",
    ] as const) {
      if (key in body) data[key] = body[key]
    }

    const updated = await prisma.player.update({ where: { id: auth.playerId }, data, select: {
      profileVisibility: true,
      allowFriendRequests: true,
      allowMentorship: true,
      socialFeedOptIn: true,
    } })
    return successResponse(updated)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

