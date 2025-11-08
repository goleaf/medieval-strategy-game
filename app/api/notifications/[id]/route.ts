import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json()
    const { read } = body

    // Mark corresponding message as read
    await prisma.message.update({
      where: { id: params.id },
      data: { readAt: read ? new Date() : null },
    })

    return successResponse({ success: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}




