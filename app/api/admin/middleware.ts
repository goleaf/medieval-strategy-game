import type { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verify } from "jsonwebtoken"

export async function authenticateAdmin(req: NextRequest): Promise<{ userId: string; adminId: string; admin: any } | null> {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.slice(7)
    const decoded = verify(token, process.env.JWT_SECRET || "secret") as any

    // Find user and check if they have admin role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { admin: true },
    })

    if (!user || !user.admin) {
      return null
    }

    return {
      userId: user.id,
      adminId: user.admin.id,
      admin: user.admin,
    }
  } catch (error) {
    return null
  }
}

export async function requireAdminAuth(handler: (req: NextRequest, context: { admin: any }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const adminAuth = await authenticateAdmin(req)

    if (!adminAuth) {
      return new Response(JSON.stringify({
        success: false,
        error: "Admin authentication required"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    return handler(req, { admin: adminAuth })
  }
}
