import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { fetchCombatReportDetail } from "@/lib/reports/queries"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const playerId = body?.playerId as string | undefined
  const reportId = body?.reportId as string | undefined
  const recipients = (body?.recipients as string[] | undefined) ?? []
  const forwardToAlliance = Boolean(body?.forwardToAlliance)
  if (!playerId || !reportId) return errorResponse("playerId and reportId are required", 400)

  const detail = await fetchCombatReportDetail(reportId, playerId)
  if (!detail) return errorResponse("Report not found or not visible", 404)

  let targetIds = recipients
  if (forwardToAlliance) {
    const membership = await prisma.allianceMember.findFirst({
      where: { playerId, state: "ACTIVE" },
      select: { allianceId: true },
    })
    if (!membership?.allianceId) return errorResponse("No active alliance membership", 400)
    const members = await prisma.allianceMember.findMany({
      where: { allianceId: membership.allianceId, state: "ACTIVE" },
      select: { playerId: true },
    })
    targetIds = members.map((m) => m.playerId).filter((id) => id !== playerId)
  }
  if (!targetIds.length) return errorResponse("No recipients provided", 400)

  const subject = `FWD: ${detail.subject}`
  const content = JSON.stringify({ kind: "report_forward", reportId: detail.id, subject: detail.subject, createdAt: detail.createdAt })

  const created = await Promise.all(
    targetIds.map((id) =>
      prisma.message.create({
        data: { senderId: playerId, recipientId: id, type: "PLAYER", subject, content },
      }),
    ),
  )
  return successResponse({ sent: created.length })
}

