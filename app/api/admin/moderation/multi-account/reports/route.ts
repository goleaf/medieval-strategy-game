import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { generateMultiAccountReport, persistReport } from "@/lib/moderation/detection"

export async function GET(req: NextRequest) {
  const gate = await authenticateAdmin(req)
  if (gate) return gate as unknown as NextResponse

  try {
    const report = await generateMultiAccountReport()
    // Persist a snapshot for audit trail
    await persistReport(report)
    return NextResponse.json({ success: true, data: report }, { status: 200 })
  } catch (error) {
    console.error("generate report error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate report" }, { status: 500 })
  }
}
