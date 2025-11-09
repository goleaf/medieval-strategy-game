import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import { errorResponse, successResponse } from "@/lib/utils/api-response"

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  if (!id) return errorResponse("id required", 400)
  await prisma.pushDevice.delete({ where: { id } }).catch(() => undefined)
  return successResponse({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  if (!id) return errorResponse("id required", 400)
  const body = await req.json().catch(() => ({}))
  await prisma.pushDevice.update({ where: { id }, data: { lastSeenAt: new Date(), appVersion: body?.appVersion } }).catch(() => undefined)
  return successResponse({ ok: true })
}

