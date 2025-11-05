import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../../middleware"
import { trackAction, trackError } from "@/lib/admin-utils"
import { prisma } from "@/lib/db"
import { z } from "zod"

// Validation schemas
const createGameWorldSchema = z.object({
  worldName: z.string().min(1).max(50),
  worldCode: z.string().min(1).max(10).regex(/^[a-zA-Z0-9]+$/),
  description: z.string().optional(),
  version: z.enum(['REGULAR', 'ANNUAL_SPECIAL', 'NEW_YEAR_SPECIAL', 'TOURNAMENT', 'COMMUNITY_WEEK', 'LOCAL_GAMEWORLD']),
  region: z.enum(['INTERNATIONAL', 'AMERICA', 'ARABICS', 'ASIA', 'EUROPE']),
  speed: z.number().int().min(1).max(10),
  availableTribes: z.array(z.enum(['ROMANS', 'TEUTONS', 'GAULS', 'HUNS', 'EGYPTIANS', 'SPARTANS', 'VIKINGS'])).min(1).max(7)
})

const updateGameWorldSchema = z.object({
  worldName: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  isRegistrationOpen: z.boolean().optional(),
  availableTribes: z.array(z.enum(['ROMANS', 'TEUTONS', 'GAULS', 'HUNS', 'EGYPTIANS', 'SPARTANS', 'VIKINGS'])).optional()
})

// GET /api/admin/game-worlds - List all game worlds
export async function GET(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return NextResponse.json({
      success: false,
      error: "Admin authentication required"
    }, { status: 401 })
  }

  try {
    const gameWorlds = await prisma.gameWorld.findMany({
      include: {
        availableTribes: true,
        players: {
          select: {
            id: true,
            playerName: true,
            totalPoints: true
          }
        },
        _count: {
          select: {
            players: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    trackAction()

    return NextResponse.json({
      success: true,
      data: gameWorlds
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Get game worlds failed", errorMessage)
    console.error("[v0] Get game worlds error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch game worlds"
    }, { status: 500 })
  }
}

// POST /api/admin/game-worlds - Create a new game world
export async function POST(req: NextRequest) {
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return NextResponse.json({
      success: false,
      error: "Admin authentication required"
    }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = createGameWorldSchema.parse(body)

    // Check if world code already exists
    const existingWorld = await prisma.gameWorld.findUnique({
      where: { worldCode: validatedData.worldCode }
    })

    if (existingWorld) {
      return NextResponse.json({
        success: false,
        error: "World code already exists"
      }, { status: 400 })
    }

    // Calculate speed-scaled values based on Travian mechanics
    const speedMultipliers = getSpeedMultipliers(validatedData.speed)

    const gameWorld = await prisma.gameWorld.create({
      data: {
        worldName: validatedData.worldName,
        worldCode: validatedData.worldCode,
        description: validatedData.description,
        version: validatedData.version,
        region: validatedData.region,
        speed: validatedData.speed,
        ...speedMultipliers,
        availableTribes: {
          create: validatedData.availableTribes.map(tribe => ({ tribe }))
        }
      },
      include: {
        availableTribes: true
      }
    })

    // Create associated WorldConfig
    await prisma.worldConfig.create({
      data: {
        gameWorldId: gameWorld.id,
        // Default world config values
        maxX: 100,
        maxY: 100,
        unitSpeed: 1.0,
        resourcePerTick: 10,
        productionMultiplier: 1.0,
        tickIntervalMinutes: 5,
        constructionQueueLimit: 3,
        nightBonusMultiplier: 1.2,
        beginnerProtectionHours: 72,
        beginnerProtectionEnabled: true
      }
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: adminAuth.adminId,
        action: "CREATE_GAME_WORLD",
        details: `Created game world: ${gameWorld.worldName} (${gameWorld.worldCode})`,
        targetType: "GAME_WORLD",
        targetId: gameWorld.id,
      },
    })

    trackAction()

    return NextResponse.json({
      success: true,
      data: gameWorld,
      message: `Game world "${gameWorld.worldName}" created successfully`
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Validation failed",
        details: error.errors
      }, { status: 400 })
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    trackError("Create game world failed", errorMessage)
    console.error("[v0] Create game world error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create game world"
    }, { status: 500 })
  }
}

// Helper function to calculate speed-scaled values based on Travian mechanics
function getSpeedMultipliers(speed: number) {
  const baseValues = {
    registrationClosesAfterDays: 70,
    artefactsIntroducedAfterDays: 90,
    constructionPlansAfterDays: 180,
    natarWonderFinishesAfterDays: 250,
    annualSpecialDurationDays: 180,
    startingCulturePoints: 500,
    townhallCelebrationTimeDivisor: 1,
    townhallSmallCelebrationLimit: 500,
    townhallLargeCelebrationLimit: 2000,
    requirementForSecondVillage: 2000,
    artworkCpProductionDivisor: 1.0,
    artworkLimit: 2000,
    artworkUsageCooldownHours: 24,
    itemTier2AfterDays: 70,
    itemTier3AfterDays: 140,
    auctionDurationHours: 24.0,
    smeltingTimeHours: 24,
    beginnerProtectionDays: 5,
    travianPlusDurationDays: 7,
    resourceBonusDurationDays: 7,
    availableVacationDays: 15,
    upgradingToCityCooldownHours: 24,
    natarAttackDelayHours: 24
  }

  // Apply speed scaling based on Travian mechanics
  const speedFactors = {
    1: { time: 1, celebration: 1, auction: 1, cooldown: 1 },
    2: { time: 0.5, celebration: 1, auction: 0.5, cooldown: 1 },
    3: { time: 1/3, celebration: 0.5, auction: 1/3, cooldown: 0.5 },
    5: { time: 0.2, celebration: 0.5, auction: 0.2, cooldown: 0.5 },
    10: { time: 0.1, celebration: 0.25, auction: 0.1, cooldown: 0.25 }
  }

  const factor = speedFactors[speed as keyof typeof speedFactors] || speedFactors[1]

  return {
    registrationClosesAfterDays: Math.round(baseValues.registrationClosesAfterDays * factor.time),
    artefactsIntroducedAfterDays: Math.round(baseValues.artefactsIntroducedAfterDays * factor.time),
    constructionPlansAfterDays: Math.round(baseValues.constructionPlansAfterDays * factor.time),
    natarWonderFinishesAfterDays: Math.round(baseValues.natarWonderFinishesAfterDays * factor.time),
    annualSpecialDurationDays: Math.round(baseValues.annualSpecialDurationDays * factor.time),
    startingCulturePoints: Math.round(baseValues.startingCulturePoints / speed), // Faster servers have fewer starting CP
    townhallCelebrationTimeDivisor: speed <= 2 ? 1 : speed <= 5 ? 2 : 4, // x3=2, x5=2, x10=4
    townhallSmallCelebrationLimit: speed <= 2 ? 500 : 250, // x3+=250
    townhallLargeCelebrationLimit: speed <= 2 ? 2000 : 1000, // x3+=1000
    requirementForSecondVillage: Math.round(baseValues.requirementForSecondVillage / speed), // Faster = easier expansion
    artworkCpProductionDivisor: speed <= 2 ? 1 : speed <= 3 ? 1.5 : speed <= 5 ? 3 : 6, // x3=3, x5=5, x10=10
    artworkLimit: speed <= 2 ? 2000 : speed <= 3 ? 1300 : speed <= 5 ? 1000 : 700, // x3=1300, x5=1000, x10=700
    artworkUsageCooldownHours: speed <= 2 ? 24 : 12, // x3+=12 hours
    itemTier2AfterDays: Math.round(baseValues.itemTier2AfterDays * factor.time),
    itemTier3AfterDays: Math.round(baseValues.itemTier3AfterDays * factor.time),
    auctionDurationHours: baseValues.auctionDurationHours * factor.auction,
    smeltingTimeHours: speed <= 2 ? 24 : 12, // x3+=12 hours
    beginnerProtectionDays: Math.max(1, Math.round(baseValues.beginnerProtectionDays * factor.time)),
    travianPlusDurationDays: speed <= 2 ? 7 : 3, // x3+=3 days
    resourceBonusDurationDays: speed <= 2 ? 7 : 3, // x3+=3 days
    availableVacationDays: Math.max(1, Math.round(baseValues.availableVacationDays / speed)), // Faster = shorter vacations
    upgradingToCityCooldownHours: speed <= 2 ? 24 : 12, // x3+=12 hours
    natarAttackDelayHours: baseValues.natarAttackDelayHours / speed // Faster = more frequent natar attacks
  }
}
