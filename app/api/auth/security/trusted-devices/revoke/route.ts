import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../../../middleware"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { deviceId } = await req.json()
    if (!deviceId) {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 })
    }

    await prisma.trustedDevice.deleteMany({
      where: {
        id: deviceId,
        userId: auth.userId,
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Trusted device revoke error:", error)
    return NextResponse.json({ error: "Unable to revoke trusted device" }, { status: 500 })
  }
}
