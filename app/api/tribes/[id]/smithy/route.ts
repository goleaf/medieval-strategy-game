import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tribeId = params.id
    const requesterId = req.nextUrl.searchParams.get("requesterId")
    if (!tribeId || !requesterId) return errorResponse("tribeId and requesterId required", 400)

    const requester = await prisma.player.findUnique({ where: { id: requesterId }, select: { tribeId: true, tribeRole: true } })
    if (!requester || requester.tribeId !== tribeId) {
      return errorResponse("Not a member of this tribe", 403)
    }
    const allowedRoles = new Set(["FOUNDER", "CO_FOUNDER", "OFFICER"]) as Set<string>
    if (!requester.tribeRole || !allowedRoles.has(requester.tribeRole)) {
      return errorResponse("Insufficient permissions (officers only)", 403)
    }

    const members = await prisma.player.findMany({
      where: { tribeId },
      select: { id: true, playerName: true },
      orderBy: { playerName: "asc" },
    })
    const memberIds = members.map((m) => m.id)
    const techRows = await prisma.unitTech.findMany({
      where: { playerId: { in: memberIds } },
      select: { playerId: true, unitTypeId: true, attackLevel: true, defenseLevel: true },
    })

    const byPlayer = new Map<string, { playerId: string; playerName: string; unitTech: Record<string, { attack: number; defense: number }> }>()
    for (const m of members) {
      byPlayer.set(m.id, { playerId: m.id, playerName: m.playerName, unitTech: {} })
    }
    for (const row of techRows) {
      const target = byPlayer.get(row.playerId)
      if (!target) continue
      target.unitTech[row.unitTypeId] = { attack: row.attackLevel, defense: row.defenseLevel }
    }

    // Aggregate per unit average
    const aggregate = new Map<string, { attackSum: number; defenseSum: number; count: number }>()
    for (const row of techRows) {
      const agg = aggregate.get(row.unitTypeId) ?? { attackSum: 0, defenseSum: 0, count: 0 }
      agg.attackSum += row.attackLevel
      agg.defenseSum += row.defenseLevel
      agg.count += 1
      aggregate.set(row.unitTypeId, agg)
    }
    const averages = Array.from(aggregate.entries()).map(([unitTypeId, v]) => ({
      unitTypeId,
      avgAttack: v.count ? v.attackSum / v.count : 0,
      avgDefense: v.count ? v.defenseSum / v.count : 0,
      samples: v.count,
    }))

    return successResponse({
      tribeId,
      members: Array.from(byPlayer.values()),
      averages,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

