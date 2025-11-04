import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// Predefined speed templates
const SPEED_TEMPLATES = {
  normal: {
    name: "Normal Speed",
    description: "Standard game speed for casual play",
    speed: 1,
    unitSpeed: 1.0,
    productionMultiplier: 1.0,
    resourcePerTick: 10,
    tickIntervalMinutes: 5,
  },
  fast: {
    name: "Fast Speed",
    description: "Accelerated game speed for faster gameplay",
    speed: 2,
    unitSpeed: 1.5,
    productionMultiplier: 1.5,
    resourcePerTick: 15,
    tickIntervalMinutes: 3,
  },
  very_fast: {
    name: "Very Fast",
    description: "Very fast speed for quick rounds",
    speed: 3,
    unitSpeed: 2.0,
    productionMultiplier: 2.0,
    resourcePerTick: 20,
    tickIntervalMinutes: 2,
  },
  tournament: {
    name: "Tournament Speed",
    description: "High speed for competitive tournaments",
    speed: 5,
    unitSpeed: 3.0,
    productionMultiplier: 3.0,
    resourcePerTick: 30,
    tickIntervalMinutes: 1,
  },
  extreme: {
    name: "Extreme Speed",
    description: "Maximum speed for very short rounds",
    speed: 10,
    unitSpeed: 5.0,
    productionMultiplier: 5.0,
    resourcePerTick: 50,
    tickIntervalMinutes: 1,
  },
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: SPEED_TEMPLATES,
    })
  } catch (error) {
    console.error("[v0] Get speed templates error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { templateId } = body

    // Validate input
    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: "Template ID is required"
      }, { status: 400 })
    }

    if (typeof templateId !== 'string') {
      return NextResponse.json({
        success: false,
        error: "Template ID must be a string"
      }, { status: 400 })
    }

    if (!SPEED_TEMPLATES[templateId as keyof typeof SPEED_TEMPLATES]) {
      return NextResponse.json({
        success: false,
        error: "Invalid template ID. Available templates: " + Object.keys(SPEED_TEMPLATES).join(", ")
      }, { status: 400 })
    }

    const template = SPEED_TEMPLATES[templateId]
    const config = await prisma.worldConfig.findFirst()

    if (!config) {
      return NextResponse.json({
        success: false,
        error: "World configuration not found. Please initialize the world first."
      }, { status: 404 })
    }

    const updated = await prisma.worldConfig.update({
      where: { id: config.id },
      data: {
        speed: template.speed,
        unitSpeed: template.unitSpeed,
        productionMultiplier: template.productionMultiplier,
        resourcePerTick: template.resourcePerTick,
        tickIntervalMinutes: template.tickIntervalMinutes,
      },
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: "admin-id",
        action: "APPLY_SPEED_TEMPLATE",
        details: `Applied speed template: ${template.name}`,
        targetType: "WORLD_CONFIG",
        targetId: config.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Speed template "${template.name}" applied successfully`,
    }, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[v0] Apply speed template error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to apply speed template: " + errorMessage
    }, { status: 500 })
  }
}
