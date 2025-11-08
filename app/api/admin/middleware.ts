import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../middleware"
import { prisma } from "@/lib/db"

export async function adminAuthMiddleware(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth || !auth.playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const admin = await prisma.admin.findUnique({
      where: { userId: auth.userId }
    })

    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    return null // Continue to next handler
  } catch (error) {
    return NextResponse.json({ error: "Authentication error" }, { status: 500 })
  }
}

// Alias for backward compatibility
export const authenticateAdmin = adminAuthMiddleware
export const requireAdmin = adminAuthMiddleware