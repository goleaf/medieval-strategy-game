import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { applyEnforcement } from "@/lib/moderation/enforcement"
import type { EnforcementRequest } from "@/lib/moderation/types"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const gate = await authenticateAdmin(req)
  if (gate) return gate as unknown as NextResponse

  try {
    const body = (await req.json()) as EnforcementRequest
    if (!body.action || !body.reason) {
      return NextResponse.json({ success: false, error: "action and reason required" }, { status: 400 })
    }

    await applyEnforcement(body)

    // minimal audit
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id",
        action: `ENFORCE_${body.action}`,
        details: JSON.stringify(body),
        targetType: "MODERATION",
        targetId: "multi-account",
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("enforce error:", error)
    return NextResponse.json({ success: false, error: "Failed to apply enforcement" }, { status: 500 })
  }
}
