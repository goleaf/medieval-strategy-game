import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"
import { getMetricsSnapshot } from "@/lib/utils/metrics"

export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)
  if (!adminAuth) {
    return new Response(
      JSON.stringify({ success: false, error: "Admin authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )
  }

  const metrics = getMetricsSnapshot()
  return NextResponse.json({ success: true, data: { metrics, timestamp: new Date().toISOString() } })
}

