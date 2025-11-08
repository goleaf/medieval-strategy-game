import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// Predefined speed templates based on Travian: Legends mechanics
const SPEED_TEMPLATES = {
  x1: {
    name: "x1 Normal Speed",
    description: "Standard game speed - classic Travian experience",
    speed: 1,
    unitSpeed: 1.0,
    productionMultiplier: 1.0,
    resourcePerTick: 10,
    tickIntervalMinutes: 5,
    // Travian-specific scaling
    constructionTimeDivisor: 1,
    troopTrainingTimeDivisor: 1,
    troopSpeedMultiplier: 1.0,
    resourceProductionMultiplier: 1.0,
    beginnerProtectionDays: 5,
    travianPlusDurationDays: 7,
    resourceBonusDurationDays: 7,
    culturePoints: {
      starting: 500,
      celebrationTimeDivisor: 1,
      smallCelebrationLimit: 500,
      largeCelebrationLimit: 2000,
      secondVillageRequirement: 2000,
      artworkProductionDivisor: 1.0,
      artworkLimit: 2000,
      artworkCooldownHours: 24
    },
    items: {
      tier2AfterDays: 70,
      tier3AfterDays: 140,
      auctionDurationHours: 24.0,
      smeltingTimeHours: 24
    },
    events: {
      registrationClosesAfterDays: 70,
      artefactsIntroducedAfterDays: 90,
      constructionPlansAfterDays: 180,
      natarWonderFinishesAfterDays: 250,
      annualSpecialDurationDays: 180
    },
    misc: {
      availableVacationDays: 15,
      upgradingToCityCooldownHours: 24,
      natarAttackDelayHours: 24
    }
  },
  x2: {
    name: "x2 Fast Speed",
    description: "Accelerated gameplay - everything happens twice as fast",
    speed: 2,
    unitSpeed: 2.0,
    productionMultiplier: 2.0,
    resourcePerTick: 20,
    tickIntervalMinutes: 3,
    // Travian-specific scaling
    constructionTimeDivisor: 2,
    troopTrainingTimeDivisor: 2,
    troopSpeedMultiplier: 2.0,
    resourceProductionMultiplier: 2.0,
    beginnerProtectionDays: 3,
    travianPlusDurationDays: 3,
    resourceBonusDurationDays: 3,
    culturePoints: {
      starting: 250,
      celebrationTimeDivisor: 1,
      smallCelebrationLimit: 500,
      largeCelebrationLimit: 2000,
      secondVillageRequirement: 800,
      artworkProductionDivisor: 2/3,
      artworkLimit: 1300,
      artworkCooldownHours: 24
    },
    items: {
      tier2AfterDays: 35,
      tier3AfterDays: 70,
      auctionDurationHours: 12.0,
      smeltingTimeHours: 24
    },
    events: {
      registrationClosesAfterDays: 35,
      artefactsIntroducedAfterDays: 45,
      constructionPlansAfterDays: 90,
      natarWonderFinishesAfterDays: 160,
      annualSpecialDurationDays: 120
    },
    misc: {
      availableVacationDays: 8,
      upgradingToCityCooldownHours: 24,
      natarAttackDelayHours: 12
    }
  },
  x3: {
    name: "x3 Very Fast",
    description: "Very fast rounds - perfect for quick competitions",
    speed: 3,
    unitSpeed: 3.0,
    productionMultiplier: 3.0,
    resourcePerTick: 30,
    tickIntervalMinutes: 2,
    // Travian-specific scaling
    constructionTimeDivisor: 3,
    troopTrainingTimeDivisor: 3,
    troopSpeedMultiplier: 3.0,
    resourceProductionMultiplier: 3.0,
    beginnerProtectionDays: 3,
    travianPlusDurationDays: 3,
    resourceBonusDurationDays: 3,
    culturePoints: {
      starting: 167,
      celebrationTimeDivisor: 2,
      smallCelebrationLimit: 250,
      largeCelebrationLimit: 1000,
      secondVillageRequirement: 500,
      artworkProductionDivisor: 0.5,
      artworkLimit: 1000,
      artworkCooldownHours: 12
    },
    items: {
      tier2AfterDays: 23,
      tier3AfterDays: 47,
      auctionDurationHours: 8.0,
      smeltingTimeHours: 12
    },
    events: {
      registrationClosesAfterDays: 28,
      artefactsIntroducedAfterDays: 30,
      constructionPlansAfterDays: 60,
      natarWonderFinishesAfterDays: 95,
      annualSpecialDurationDays: 80
    },
    misc: {
      availableVacationDays: 5,
      upgradingToCityCooldownHours: 12,
      natarAttackDelayHours: 8
    }
  },
  x5: {
    name: "x5 Tournament Speed",
    description: "High-speed competitive gameplay for tournaments",
    speed: 5,
    unitSpeed: 5.0,
    productionMultiplier: 5.0,
    resourcePerTick: 50,
    tickIntervalMinutes: 1,
    // Travian-specific scaling
    constructionTimeDivisor: 5,
    troopTrainingTimeDivisor: 5,
    troopSpeedMultiplier: 5.0,
    resourceProductionMultiplier: 5.0,
    beginnerProtectionDays: 2,
    travianPlusDurationDays: 3,
    resourceBonusDurationDays: 3,
    culturePoints: {
      starting: 100,
      celebrationTimeDivisor: 2,
      smallCelebrationLimit: 250,
      largeCelebrationLimit: 1000,
      secondVillageRequirement: 300,
      artworkProductionDivisor: 1/3,
      artworkLimit: 700,
      artworkCooldownHours: 12
    },
    items: {
      tier2AfterDays: 14,
      tier3AfterDays: 28,
      auctionDurationHours: 4.0,
      smeltingTimeHours: 12
    },
    events: {
      registrationClosesAfterDays: 15,
      artefactsIntroducedAfterDays: 18,
      constructionPlansAfterDays: 36,
      natarWonderFinishesAfterDays: 71,
      annualSpecialDurationDays: 50
    },
    misc: {
      availableVacationDays: 3,
      upgradingToCityCooldownHours: 12,
      natarAttackDelayHours: 5
    }
  },
  x10: {
    name: "x10 Extreme Speed",
    description: "Maximum speed - ultra-fast rounds for testing or special events",
    speed: 10,
    unitSpeed: 10.0,
    productionMultiplier: 10.0,
    resourcePerTick: 100,
    tickIntervalMinutes: 1,
    // Travian-specific scaling
    constructionTimeDivisor: 10,
    troopTrainingTimeDivisor: 10,
    troopSpeedMultiplier: 10.0,
    resourceProductionMultiplier: 10.0,
    beginnerProtectionDays: 1,
    travianPlusDurationDays: 3,
    resourceBonusDurationDays: 3,
    culturePoints: {
      starting: 50,
      celebrationTimeDivisor: 4,
      smallCelebrationLimit: 125,
      largeCelebrationLimit: 500,
      secondVillageRequirement: 200,
      artworkProductionDivisor: 1/6,
      artworkLimit: 400,
      artworkCooldownHours: 6
    },
    items: {
      tier2AfterDays: 7,
      tier3AfterDays: 14,
      auctionDurationHours: 2.0,
      smeltingTimeHours: 6
    },
    events: {
      registrationClosesAfterDays: 7,
      artefactsIntroducedAfterDays: 9,
      constructionPlansAfterDays: 18,
      natarWonderFinishesAfterDays: 36,
      annualSpecialDurationDays: 30
    },
    misc: {
      availableVacationDays: 2,
      upgradingToCityCooldownHours: 6,
      natarAttackDelayHours: 2
    }
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: SPEED_TEMPLATES,
    })
  } catch (error) {
    console.error("Get speed templates error:", error)
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

    // Update WorldConfig with basic settings
    const updated = await prisma.worldConfig.update({
      where: { id: config.id },
      data: {
        unitSpeed: template.unitSpeed,
        productionMultiplier: template.productionMultiplier,
        resourcePerTick: template.resourcePerTick,
        tickIntervalMinutes: template.tickIntervalMinutes,
      },
    })

    // If WorldConfig is linked to a GameWorld, update the GameWorld with detailed settings
    if (config.gameWorldId) {
      await prisma.gameWorld.update({
        where: { id: config.gameWorldId },
        data: {
          speed: template.speed,
          // Culture Points
          startingCulturePoints: template.culturePoints.starting,
          townhallCelebrationTimeDivisor: template.culturePoints.celebrationTimeDivisor,
          townhallSmallCelebrationLimit: template.culturePoints.smallCelebrationLimit,
          townhallLargeCelebrationLimit: template.culturePoints.largeCelebrationLimit,
          requirementForSecondVillage: template.culturePoints.secondVillageRequirement,
          artworkCpProductionDivisor: template.culturePoints.artworkProductionDivisor,
          artworkLimit: template.culturePoints.artworkLimit,
          artworkUsageCooldownHours: template.culturePoints.artworkCooldownHours,
          // Item Availability
          itemTier2AfterDays: template.items.tier2AfterDays,
          itemTier3AfterDays: template.items.tier3AfterDays,
          auctionDurationHours: template.items.auctionDurationHours,
          smeltingTimeHours: template.items.smeltingTimeHours,
          // Events
          registrationClosesAfterDays: template.events.registrationClosesAfterDays,
          artefactsIntroducedAfterDays: template.events.artefactsIntroducedAfterDays,
          constructionPlansAfterDays: template.events.constructionPlansAfterDays,
          natarWonderFinishesAfterDays: template.events.natarWonderFinishesAfterDays,
          annualSpecialDurationDays: template.events.annualSpecialDurationDays,
          // General Mechanics
          beginnerProtectionDays: template.beginnerProtectionDays,
          travianPlusDurationDays: template.travianPlusDurationDays,
          resourceBonusDurationDays: template.resourceBonusDurationDays,
          availableVacationDays: template.misc.availableVacationDays,
          upgradingToCityCooldownHours: template.misc.upgradingToCityCooldownHours,
          natarAttackDelayHours: template.misc.natarAttackDelayHours,
        }
      })
    }

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
    console.error("Apply speed template error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to apply speed template: " + errorMessage
    }, { status: 500 })
  }
}
