import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await authenticateAdmin(req)
  if (gate) return gate as unknown as NextResponse

  try {
    const report = await prisma.playerReport.findUnique({ where: { id: params.id } })
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Lightweight investigation context
    const [reporterUser, targetPlayer, targetUser, recentShipments, recentLogins, adminAudit] = await Promise.all([
      prisma.user.findUnique({ where: { id: report.reporterUserId }, select: { id: true, email: true, username: true } }),
      report.targetPlayerId
        ? prisma.player.findUnique({ where: { id: report.targetPlayerId }, select: { id: true, playerName: true, userId: true } })
        : Promise.resolve(null),
      report.targetUserId
        ? prisma.user.findUnique({ where: { id: report.targetUserId }, select: { id: true, email: true, username: true } })
        : Promise.resolve(null),
      report.targetPlayerId
        ? prisma.shipment.findMany({
            where: {
              OR: [
                { sourceVillage: { playerId: report.targetPlayerId } },
                { targetVillage: { playerId: report.targetPlayerId } },
              ],
            },
            take: 20,
            orderBy: { createdAt: "desc" },
            select: {
              sourceVillage: { select: { id: true, name: true, playerId: true } },
              targetVillage: { select: { id: true, name: true, playerId: true } },
              wood: true,
              stone: true,
              iron: true,
              gold: true,
              food: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      report.targetUserId
        ? prisma.loginAttempt.findMany({ where: { userId: report.targetUserId }, take: 20, orderBy: { createdAt: "desc" } })
        : Promise.resolve([]),
      report.targetPlayerId
        ? prisma.auditLog.findMany({
            where: { targetType: "PLAYER", targetId: report.targetPlayerId },
            take: 20,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ])

    return NextResponse.json(
      {
        success: true,
        data: { report, reporterUser, targetPlayer, targetUser, recentShipments, recentLogins, adminAudit },
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await authenticateAdmin(req)
  if (gate) return gate as unknown as NextResponse
  try {
    const body = await req.json()
    const { status, adminNotes } = body || {}
    if (!status) return NextResponse.json({ error: "status required" }, { status: 400 })
    const updated = await prisma.playerReport.update({
      where: { id: params.id },
      data: {
        status,
        adminNotes: adminNotes ?? undefined,
      },
    })

    // Notify reporter when action taken
    if (updated.status === "ACTION_TAKEN" && updated.reporterPlayerId) {
      await prisma.playerNotification.create({
        data: {
          playerId: updated.reporterPlayerId,
          type: "GAME_UPDATE",
          priority: "MEDIUM",
          title: `Thank you for your report (${updated.reference})`,
          message: "Our moderators reviewed your report and took appropriate action.",
          metadata: { category: "moderation", reference: updated.reference },
        },
      })
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}
