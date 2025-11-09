import { NextRequest } from "next/server"

import { errorResponse, notFoundResponse, successResponse } from "@/lib/utils/api-response"
import { resolveSharedReport } from "@/lib/reports/manage"

interface Params { params: { token: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const token = params.token
  if (!token) return errorResponse("token is required", 400)
  const data = await resolveSharedReport(token)
  if (!data) return notFoundResponse()
  return successResponse(data)
}

