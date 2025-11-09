import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return unauthorizedResponse()

    const logs = await prisma.accountActionLog.findMany({
      where: { playerId: auth.playerId },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return successResponse({ logs })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

