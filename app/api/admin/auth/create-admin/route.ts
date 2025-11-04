import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { authenticateAdmin } from "../../middleware"

export async function POST(req: NextRequest) {
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
  try {
    const { username, email, password, displayName, role = "MODERATOR" } = await req.json()

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json({
        success: false,
        error: "Username, email, and password are required"
      }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: "Password must be at least 8 characters long"
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
      },
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: "User with this username or email already exists"
      }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and admin in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          displayName,
        },
      })

      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          role,
        },
      })

      return { user, admin }
    })

    // Track action (removed temporarily)

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "CREATE_ADMIN",
        details: `Created admin user: ${username} (${role})`,
        targetType: "ADMIN",
        targetId: result.admin.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          displayName: result.user.displayName,
        },
        admin: {
          id: result.admin.id,
          role: result.admin.role,
        },
      },
      message: `Admin user ${username} created successfully`,
    })
  } catch (error) {
    console.error("Create admin error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create admin user"
    }, { status: 500 })
  }
}
