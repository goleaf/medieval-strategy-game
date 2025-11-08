import { prisma } from "@/lib/db"
import { successResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET() {
  try {
    const options = await prisma.quickLinkOption.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return successResponse({ options })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
