import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/app/api/admin/middleware"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)
  if (adminAuth) return adminAuth

  try {
    const groups = await prisma.notificationPreference.groupBy({
      by: ["groupingWindowMinutes"],
      _count: { _all: true },
    })
    const total = await prisma.notificationPreference.count()
    return NextResponse.json({ success: true, data: { distribution: groups, total } })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to get grouping distribution" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)
  if (adminAuth) return adminAuth

  try {
    const body = await req.json()
    const minutes = Number(body.groupingWindowMinutes)
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 720) {
      return NextResponse.json({ success: false, error: "Invalid minutes (1-720)" }, { status: 400 })
    }

    const result = await prisma.notificationPreference.updateMany({
      data: { groupingWindowMinutes: Math.floor(minutes) },
    })
    return NextResponse.json({ success: true, data: { updated: result.count } })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update grouping window" }, { status: 500 })
  }
}

