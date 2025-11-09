import { NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return errorResponse("Unauthorized", 401)

    const villageId = req.nextUrl.searchParams.get("villageId")
    if (!villageId) return errorResponse("villageId required", 400)

    const stacks = await prisma.garrisonStack.findMany({
      where: { villageId, ownerAccountId: auth.playerId },
      select: { unitTypeId: true, count: true },
      orderBy: { unitTypeId: "asc" },
    })

    return successResponse({ stacks })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

