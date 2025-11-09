import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../middleware"
import { listFeedback, updateFeedbackStatus } from "@/lib/utils/feedback"

export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)
  if (!adminAuth) {
    return new Response(
      JSON.stringify({ success: false, error: "Admin authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )
  }
  const data = await listFeedback()
  return NextResponse.json({ success: true, data: { feedback: data } })
}

export async function PATCH(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)
  if (!adminAuth) {
    return new Response(
      JSON.stringify({ success: false, error: "Admin authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )
  }
  const body = await req.json()
  const id = Number(body?.id)
  const status = String(body?.status)
  if (!id || !["open", "triaged", "resolved"].includes(status)) {
    return NextResponse.json({ success: false, error: "Invalid id or status" }, { status: 400 })
  }
  const updated = await updateFeedbackStatus(id, status as any)
  if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: { feedback: updated } })
}
