import { prisma } from "@/lib/db"
import { sign } from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { withMetrics } from "@/lib/utils/metrics"

export const POST = withMetrics("POST /api/admin/auth/login", async (req: NextRequest) => {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: "Username and password are required"
      }, { status: 400 })
    }

    // Find user with admin role
    const user = await prisma.user.findUnique({
      where: { username },
      include: { admin: true },
    })

    if (!user || !user.admin) {
      return NextResponse.json({
        success: false,
        error: "Invalid credentials or insufficient permissions"
      }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: "Invalid credentials"
      }, { status: 401 })
    }

    // Generate JWT token
    const token = sign(
      { userId: user.id, adminId: user.admin.id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" }
    )

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          admin: {
            id: user.admin.id,
            role: user.admin.role,
          },
        },
      },
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
})
