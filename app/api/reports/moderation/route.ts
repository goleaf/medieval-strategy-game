import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"

function generateReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = "R-"
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const mine = req.nextUrl.searchParams.get("mine") === "1"
    if (!mine) {
      // Only own reports exposed here
      return NextResponse.json({ error: "Unsupported query" }, { status: 400 })
    }
    const reports = await prisma.playerReport.findMany({
      where: { reporterUserId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return NextResponse.json({ success: true, data: reports }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await req.json()

    const type = body.type as
      | "MULTI_ACCOUNT"
      | "BUG_ABUSE"
      | "HARASSMENT"
      | "INAPPROPRIATE_NAME"
      | "OTHER"
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 })
    if (!body.description || typeof body.description !== "string") {
      return NextResponse.json({ error: "description required" }, { status: 400 })
    }

    // Rate limit: at most 5 submissions per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recent = await prisma.playerReport.count({
      where: { reporterUserId: auth.userId, createdAt: { gte: oneHourAgo } },
    })
    if (recent >= 5) {
      return NextResponse.json({ error: "Too many reports recently. Please wait and try again." }, { status: 429 })
    }

    // Severity defaults
    const severity = ((): "LOW" | "MEDIUM" | "HIGH" => {
      if (type === "HARASSMENT" || type === "BUG_ABUSE") return "HIGH"
      if (type === "MULTI_ACCOUNT") return "MEDIUM"
      return "LOW"
    })()

    const report = await prisma.playerReport.create({
      data: {
        reference: generateReference(),
        reporterUserId: auth.userId,
        reporterPlayerId: auth.playerId ?? null,
        isAnonymous: Boolean(body.isAnonymous),
        targetUserId: body.targetUserId ?? null,
        targetPlayerId: body.targetPlayerId ?? null,
        targetVillageId: body.targetVillageId ?? null,
        targetMessageId: body.targetMessageId ?? null,
        type: type as any,
        description: body.description,
        evidence: Array.isArray(body.evidence) ? body.evidence : body.evidence ? [body.evidence] : null,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : null,
        severity: severity as any,
      },
    })

    return NextResponse.json({ success: true, data: { id: report.id, reference: report.reference } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
  }
}
