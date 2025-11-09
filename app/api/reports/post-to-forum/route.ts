import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { fetchCombatReportDetail } from "@/lib/reports/queries"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const playerId = body?.playerId as string | undefined
  const reportId = body?.reportId as string | undefined
  const boardId = body?.boardId as string | undefined
  if (!playerId || !reportId) return errorResponse("playerId and reportId are required", 400)

  const detail = await fetchCombatReportDetail(reportId, playerId)
  if (!detail) return errorResponse("Report not found or not visible", 404)

  let useBoardId = boardId
  if (!useBoardId) {
    const membership = await prisma.allianceMember.findFirst({ where: { playerId, state: "ACTIVE" } })
    if (!membership) return errorResponse("No active alliance membership", 400)
    const board = await prisma.allianceBoard.findFirst({ where: { allianceId: membership.allianceId }, orderBy: { orderIndex: "asc" } })
    if (!board) return errorResponse("No alliance board found", 400)
    useBoardId = board.id
  }

  const member = await prisma.allianceMember.findFirst({ where: { playerId, state: "ACTIVE" }, select: { id: true, allianceId: true } })
  if (!member) return errorResponse("Alliance membership missing", 400)

  const thread = await prisma.allianceThread.create({
    data: {
      allianceId: member.allianceId,
      boardId: useBoardId!,
      authorMemberId: member.id,
      title: `Report: ${detail.subject}`,
      posts: {
        create: {
          allianceId: member.allianceId,
          authorMemberId: member.id,
          content: `Shared combat report: /reports/${detail.id}`,
        },
      },
    },
  })

  return successResponse({ threadId: thread.id })
}

