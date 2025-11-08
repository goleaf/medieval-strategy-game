import { prisma } from "@/lib/db"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { VillageService } from "@/lib/game-services/village-service"
import { hash } from "bcryptjs"

const DEFAULT_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD || "pass123"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@game.local"
const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@game.local"

let ensurePromise: Promise<void> | null = null
let cachedPasswordHash: string | null = null

async function getPasswordHash() {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await hash(DEFAULT_PASSWORD, 10)
  }
  return cachedPasswordHash
}

async function ensureGameWorld() {
  let world = await prisma.gameWorld.findFirst()
  if (world) {
    return world
  }

  world = await prisma.gameWorld.create({
    data: {
      worldName: "Demo World",
      worldCode: "demo-world",
      description: "Default world used for local development demo accounts",
      version: "REGULAR",
      region: "EUROPE",
      speed: 1,
    },
  })

  return world
}

async function ensureWorldConfig(gameWorldId: string) {
  await prisma.worldConfig.upsert({
    where: { gameWorldId },
    update: {},
    create: {
      gameWorldId,
      maxX: 200,
      maxY: 200,
      unitSpeed: 1,
      isRunning: true,
      resourcePerTick: 10,
      productionMultiplier: 1,
      tickIntervalMinutes: 5,
      constructionQueueLimit: 3,
      nightBonusMultiplier: 1.2,
      beginnerProtectionHours: 72,
      beginnerProtectionEnabled: true,
    },
  })
}

async function ensureContinents() {
  const count = await prisma.continent.count()
  if (count > 0) return

  const operations = []
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const x = i * 50
      const y = j * 50
      operations.push(
        prisma.continent.upsert({
          where: {
            x_y: { x, y },
          },
          update: {},
          create: {
            name: `Continent-${i}-${j}`,
            x,
            y,
            size: 50,
          },
        }),
      )
    }
  }

  await Promise.all(operations)
}

async function findOrCreatePlayer(userId: string, preferredName: string, gameWorldId: string) {
  let player = await prisma.player.findFirst({
    where: { userId },
  })

  if (player) {
    if (!player.gameWorldId) {
      player = await prisma.player.update({
        where: { id: player.id },
        data: { gameWorldId },
      })
    }
    return player
  }

  let candidateName = preferredName
  let suffix = 1
  while (
    await prisma.player.findUnique({
      where: { playerName: candidateName },
    })
  ) {
    candidateName = `${preferredName}${suffix++}`
  }

  player = await prisma.player.create({
    data: {
      userId,
      playerName: candidateName,
      gameWorldId,
    },
  })

  await ProtectionService.initializeProtection(player.id).catch((error) => {
    console.error("[setup] Failed to initialize beginner protection:", error)
  })

  return player
}

async function ensureUserWithAccess(options: {
  email: string
  username: string
  displayName: string
  role?: "ADMIN" | "SUPERADMIN"
  gameWorldId: string
}) {
  const { email, username, displayName, role, gameWorldId } = options
  const passwordHash = await getPasswordHash()

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      displayName,
      password: passwordHash,
    },
    create: {
      email,
      username,
      displayName,
      password: passwordHash,
    },
  })

  if (role) {
    await prisma.admin.upsert({
      where: { userId: user.id },
      update: { role },
      create: {
        userId: user.id,
        role,
      },
    })
  }

  const player = await findOrCreatePlayer(user.id, username, gameWorldId)
  await VillageService.ensurePlayerHasVillage(player.id)
}

async function seedDemoData() {
  const world = await ensureGameWorld()
  await ensureWorldConfig(world.id)
  await ensureContinents()

  await ensureUserWithAccess({
    email: ADMIN_EMAIL,
    username: "admin",
    displayName: "Admin",
    role: "ADMIN",
    gameWorldId: world.id,
  })

  await ensureUserWithAccess({
    email: DEMO_EMAIL,
    username: "demo",
    displayName: "Demo User",
    gameWorldId: world.id,
  })
}

export async function ensureDemoEnvironment() {
  if (!ensurePromise) {
    ensurePromise = seedDemoData()
      .catch((error) => {
        ensurePromise = null
        console.error("[setup] Failed to ensure demo environment:", error)
        throw error
      })
  }
  return ensurePromise
}
