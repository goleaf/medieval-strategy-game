import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../../middleware"
import { hash } from "bcryptjs"

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
    const { email, username, password, displayName, isAdmin, adminRole } = await req.json()

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json({
        success: false,
        error: "Email, username, and password are required"
      }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: "Password must be at least 6 characters long"
      }, { status: 400 })
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        error: "Email or username already in use"
      }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user and optionally admin in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          displayName: displayName || username,
        },
      })

      let admin = null
      if (isAdmin) {
        admin = await tx.admin.create({
          data: {
            userId: user.id,
            role: adminRole || "MODERATOR",
          },
        })
      }

      return { user, admin }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "CREATE_USER",
        details: `Created user: ${username}${result.admin ? ` (${result.admin.role})` : ""}`,
        targetType: "USER",
        targetId: result.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          displayName: result.user.displayName,
        },
        admin: result.admin ? {
          id: result.admin.id,
          role: result.admin.role,
        } : null,
      },
      message: `User ${username} created successfully`,
    })
  } catch (error) {
    console.error("[v0] Create user error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create user"
    }, { status: 500 })
  }
}


