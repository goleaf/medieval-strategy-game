import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const gate = await authenticateAdmin(req)
  if (gate) return gate as unknown as NextResponse

  try {
    const status = (req.nextUrl.searchParams.get("status") || "OPEN") as
      | "OPEN"
      | "UNDER_REVIEW"
      | "ACTION_TAKEN"
      | "DISMISSED"
      | "SPAM"

    const reports = await prisma.playerReport.findMany({
      where: { status: status as any },
      orderBy: [
        { severity: "desc" },
        { createdAt: "asc" },
      ],
      take: 100,
    })

    return NextResponse.json({ success: true, data: reports }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch moderation reports" }, { status: 500 })
  }
}
