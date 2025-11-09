import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const gate = await authenticateAdmin(req)
  if (gate) return gate as unknown as NextResponse
  try {
    const body = await req.json()
    const { type, ipAddress, deviceTokenHash, userIdA, userIdB, note, expiresAt } = body || {}
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 })
    const entry = await prisma.multiAccountAllowlist.create({
      data: {
        type,
        ipAddress: ipAddress ?? null,
        deviceTokenHash: deviceTokenHash ?? null,
        userIdA: userIdA ?? null,
        userIdB: userIdB ?? null,
        note: note ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error) {
    console.error("allowlist error:", error)
    return NextResponse.json({ error: "Failed to add allowlist entry" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const entries = await prisma.multiAccountAllowlist.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
    return NextResponse.json({ success: true, data: entries }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch allowlist" }, { status: 500 })
  }
}
