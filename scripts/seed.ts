import "dotenv/config"
import { prisma } from "@/lib/db"
import { ensureDemoEnvironment } from "@/lib/setup/demo-data"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { hash } from "bcryptjs"
import type { Continent, Player, Village } from "@prisma/client"

const SAMPLE_PLAYER_COUNT = Number(process.env.SEED_PLAYER_COUNT ?? 5)
const DEFAULT_PASSWORD = process.env.SEED_PLAYER_PASSWORD ?? "pass123"

const occupiedCoordinates = new Set<string>()

function coordinateKey(x: number, y: number) {
  return `${x}:${y}`
}

async function bootstrapOccupiedCoordinates() {
  const existingVillages = await prisma.village.findMany({
    select: { x: true, y: true },
  })

  for (const { x, y } of existingVillages) {
    occupiedCoordinates.add(coordinateKey(x, y))
  }
}

function computeCoordinate(continent: Continent, slot: number) {
  const gridWidth = Math.max(4, Math.floor(Math.sqrt(Math.max(1, continent.size))))
  const spacing = Math.max(1, Math.floor(continent.size / gridWidth))
  const column = slot % gridWidth
  const row = Math.floor(slot / gridWidth)
  const maxOffset = Math.max(0, continent.size - 1)

  return {
    // Clamp the offsets so we never escape the 100x100 continent footprint.
    x: Math.min(continent.x + column * spacing, continent.x + maxOffset),
    y: Math.min(continent.y + row * spacing, continent.y + maxOffset),
  }
}

function reserveCoordinate(continent: Continent, slot: number) {
  const ATTEMPTS = 64

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const coords = computeCoordinate(continent, slot + attempt)
    const key = coordinateKey(coords.x, coords.y)

    if (!occupiedCoordinates.has(key)) {
      occupiedCoordinates.add(key)
      return coords
    }
  }

  throw new Error(`Unable to allocate coordinates for continent ${continent.name}`)
}

async function ensureVillage(player: Player, continent: Continent, slot: number): Promise<Village> {
  const existing = await prisma.village.findFirst({
    where: { playerId: player.id },
    orderBy: { createdAt: "asc" },
  })

  if (existing) {
    return existing
  }

  const coords = reserveCoordinate(continent, slot)

  return prisma.village.create({
    data: {
      playerId: player.id,
      continentId: continent.id,
      name: `${player.playerName}'s Village`,
      isCapital: true,
      x: coords.x,
      y: coords.y,
      wood: 5000,
      stone: 5000,
      iron: 2500,
      gold: 1000,
      food: 10000,
      population: 120,
      woodProduction: 12,
      stoneProduction: 10,
      ironProduction: 7,
      goldProduction: 3,
      foodProduction: 18,
    },
  })
}

async function ensureSamplePlayer(
  index: number,
  worldId: string,
  continent: Continent,
  passwordHash: string,
) {
  const username = `player${index}`
  const email = `${username}@game.local`

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      displayName: `Player ${index}`,
      password: passwordHash,
    },
    create: {
      email,
      username,
      displayName: `Player ${index}`,
      password: passwordHash,
    },
  })

  const player = await prisma.player.upsert({
    where: { playerName: username },
    update: {
      userId: user.id,
      gameWorldId: worldId,
    },
    create: {
      userId: user.id,
      playerName: username,
      gameWorldId: worldId,
    },
  })

  await ProtectionService.initializeProtection(player.id).catch((error) => {
    console.warn(`Failed to initialize protection for ${player.playerName}:`, error)
  })

  const village = await ensureVillage(player, continent, index)
  console.log(
    `Ensured player ${player.playerName} with village at (${village.x}, ${village.y})`,
  )
}

async function main() {
  console.log("Starting database seed...")
  await ensureDemoEnvironment()

  const world = await prisma.gameWorld.findFirst({
    orderBy: { createdAt: "asc" },
  })

  if (!world) {
    throw new Error("No game world exists after ensureDemoEnvironment()")
  }

  const continents = await prisma.continent.findMany({
    orderBy: { createdAt: "asc" },
  })

  if (continents.length === 0) {
    throw new Error("No continents available for seeding")
  }

  await bootstrapOccupiedCoordinates()
  const passwordHash = await hash(DEFAULT_PASSWORD, 10)

  for (let i = 0; i < SAMPLE_PLAYER_COUNT; i++) {
    const continent = continents[i % continents.length]
    await ensureSamplePlayer(i, world.id, continent, passwordHash)
  }

  console.log("Database seed completed successfully")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
