import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { errorResponse, serverErrorResponse, successResponse, unauthorizedResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) return unauthorizedResponse()

    const q = req.nextUrl.searchParams.get("q") || ""
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 10), 25)
    if (!q || q.length < 2) return errorResponse("Query too short", 400)

    const players = await prisma.player.findMany({
      where: { playerName: { contains: q, mode: "insensitive" } },
      select: { id: true, playerName: true },
      take: limit,
      orderBy: { playerName: "asc" }
    })

    return successResponse({ players })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

