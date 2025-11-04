import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { trackAction } from "@/app/api/admin/stats/route"

export async function GET() {
  try {
    const config = await prisma.worldConfig.findFirst()

    if (!config) {
      const newConfig = await prisma.worldConfig.create({
        data: {},
      })
      return NextResponse.json(newConfig, { status: 200 })
    }

    return NextResponse.json(config, { status: 200 })
  } catch (error) {
    console.error("[v0] Get world config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const {
      worldName,
      speed,
      resourcePerTick,
      productionMultiplier,
      isRunning,
      nightBonusMultiplier,
      beginnerProtectionHours,
      beginnerProtectionEnabled,
    } = await req.json()

    const config = await prisma.worldConfig.findFirst()

    if (!config) {
      return NextResponse.json({ error: "World config not found" }, { status: 404 })
    }

    const updated = await prisma.worldConfig.update({
      where: { id: config.id },
      data: {
        worldName: worldName !== undefined ? worldName : config.worldName,
        speed: speed !== undefined ? speed : config.speed,
        resourcePerTick: resourcePerTick !== undefined ? resourcePerTick : config.resourcePerTick,
        productionMultiplier:
          productionMultiplier !== undefined ? productionMultiplier : config.productionMultiplier,
        isRunning: isRunning !== undefined ? isRunning : config.isRunning,
        nightBonusMultiplier:
          nightBonusMultiplier !== undefined ? nightBonusMultiplier : config.nightBonusMultiplier,
        beginnerProtectionHours:
          beginnerProtectionHours !== undefined
            ? beginnerProtectionHours
            : config.beginnerProtectionHours,
        beginnerProtectionEnabled:
          beginnerProtectionEnabled !== undefined
            ? beginnerProtectionEnabled
            : config.beginnerProtectionEnabled,
      },
    })

    // Track action
    trackAction()

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id",
        action: "UPDATE_WORLD_CONFIG",
        details: "Updated world configuration",
        targetType: "WORLD_CONFIG",
        targetId: config.id,
      },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Update world config failed", errorMessage)
    console.error("[v0] Update world config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
