import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "@/lib/admin-utils"
import { prisma } from "@/lib/db"
import { z } from "zod"

const settingsSchema = z.object({
  maxSimulationsPerHour: z.number().min(1).max(10000),
  enableLogging: z.boolean(),
  requireAuthentication: z.boolean(),
  defaultWallLevel: z.number().min(0).max(20),
  defaultHeroBonus: z.number().min(0).max(100),
})

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await authenticateAdmin(req)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For now, use default settings (can be enhanced with proper settings storage later)
    const settings = {
      maxSimulationsPerHour: 100,
      enableLogging: true,
      requireAuthentication: false,
      defaultWallLevel: 0,
      defaultHeroBonus: 0,
    }

    return NextResponse.json(settings)

  } catch (error) {
    console.error("Combat simulator settings error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await authenticateAdmin(req)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validatedSettings = settingsSchema.parse(body)

    // For now, just validate and return success (can be enhanced with proper storage later)
    // In a production system, this would be stored in database or cache

    return NextResponse.json({ success: true, settings: validatedSettings })

  } catch (error) {
    console.error("Combat simulator settings update error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Invalid settings data",
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
