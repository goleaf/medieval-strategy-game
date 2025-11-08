import { faker } from "@faker-js/faker"
import type { Continent, Player, User } from "@prisma/client"
import { JoinPolicy, Prisma, PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import { getRandomPositionInContinent } from "@/lib/world/continent-utils"

const prisma = new PrismaClient()

const TRIBE_COUNT = Number(process.env.FAKE_TRIBE_COUNT ?? 5)
const MIN_MEMBERS = Number(process.env.FAKE_TRIBE_MIN_MEMBERS ?? 5)
const MAX_MEMBERS = Number(process.env.FAKE_TRIBE_MAX_MEMBERS ?? 10)
const DEFAULT_PASSWORD = process.env.FAKE_USER_PASSWORD ?? "pass123"

type PlayerStats = {
  totalPoints: number
  rank: number
  wavesSurvived: number
  troopsKilled: number
  troopsLost: number
}

type PlayerSeedResult = {
  user: User
  player: Player
  stats: PlayerStats
}

type TribeSummary = {
  name: string
  tag: string
  memberCount: number
  totalPoints: number
}

const occupiedCoordinates = new Set<string>()

function isMissingTableError(error: unknown, model: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021" &&
    typeof error.meta?.modelName === "string" &&
    error.meta?.modelName === model
  )
}

async function loadExistingCoordinates() {
  const villages = await prisma.village.findMany({
    select: { x: true, y: true },
  })

  for (const { x, y } of villages) {
    occupiedCoordinates.add(`${x}:${y}`)
  }
}

async function ensureContinents(): Promise<Continent[]> {
  const existing = await prisma.continent.findMany()
  if (existing.length > 0) {
    return existing
  }

  const created: Continent[] = []
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      const continent = await prisma.continent.create({
        data: {
          name: `Continent-${x}-${y}`,
          x: x * 75,
          y: y * 75,
          size: 15,
        },
      })
      created.push(continent)
    }
  }

  console.log(`[seed] Created ${created.length} fallback continents.`)
  return created
}

function buildUsername() {
  const base = faker.internet
    .username()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
  const suffix = faker.string.alphanumeric({ length: 4 }).toLowerCase()
  return `${base || "travian"}${suffix}`
}

function buildPlayerName() {
  const noun = faker.word.noun().replace(/[^a-z]/gi, "").toLowerCase() || "warrior"
  const suffix = faker.number.int({ min: 100, max: 999 })
  return `${noun}${suffix}`
}

function buildTribeName() {
  const prefix = faker.helpers.arrayElement([
    "Legion",
    "Order",
    "Brotherhood",
    "Guard",
    "Circle",
    "Company",
    "Coalition",
  ])
  const descriptor = faker.color.human()
  return `${descriptor} ${prefix}`
}

function buildTribeTag() {
  const letters = faker.string.alpha({ length: 3, casing: "upper" })
  const digits = faker.number.int({ min: 10, max: 99 })
  return `${letters}${digits}`
}

function buildPlayerStats(): PlayerStats {
  return {
    totalPoints: faker.number.int({ min: 500, max: 15000 }),
    rank: faker.number.int({ min: 1, max: 400 }),
    wavesSurvived: faker.number.int({ min: 0, max: 50 }),
    troopsKilled: faker.number.int({ min: 0, max: 10000 }),
    troopsLost: faker.number.int({ min: 0, max: 9000 }),
  }
}

function pickCoordinate(continent: Continent) {
  for (let attempt = 0; attempt < 40; attempt++) {
    // Shared helper keeps the fake tribe seeding aligned with the core 100x100 continents.
    const { x, y } = getRandomPositionInContinent(continent)
    const key = `${x}:${y}`
    if (!occupiedCoordinates.has(key)) {
      occupiedCoordinates.add(key)
      return { x, y }
    }
  }

  throw new Error(`Unable to allocate coordinates on continent ${continent.name}`)
}

async function createVillageForPlayer(player: Player, continents: Continent[]) {
  const continent = faker.helpers.arrayElement(continents)
  const coords = pickCoordinate(continent)

  return prisma.village.create({
    data: {
      playerId: player.id,
      continentId: continent.id,
      name: `${faker.word.adjective()} ${player.playerName}`.replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      ),
      isCapital: true,
      x: coords.x,
      y: coords.y,
      wood: faker.number.int({ min: 2000, max: 12000 }),
      stone: faker.number.int({ min: 2000, max: 12000 }),
      iron: faker.number.int({ min: 1500, max: 9000 }),
      gold: faker.number.int({ min: 500, max: 3500 }),
      food: faker.number.int({ min: 4000, max: 15000 }),
      population: faker.number.int({ min: 80, max: 320 }),
      woodProduction: faker.number.int({ min: 8, max: 25 }),
      stoneProduction: faker.number.int({ min: 6, max: 20 }),
      ironProduction: faker.number.int({ min: 5, max: 18 }),
      goldProduction: faker.number.int({ min: 2, max: 10 }),
      foodProduction: faker.number.int({ min: 12, max: 35 }),
    },
  })
}

async function createUserAndPlayer(
  hashedPassword: string,
  continents?: Continent[],
): Promise<PlayerSeedResult> {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const username = buildUsername()
  const email = faker.internet.email({
    firstName,
    lastName,
    provider: "game.local",
  })

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      displayName: `${firstName} ${lastName}`,
      lastActiveAt: faker.date.recent({ days: 5 }),
    },
  })

  const stats = buildPlayerStats()
  const player = await prisma.player.create({
    data: {
      userId: user.id,
      playerName: buildPlayerName(),
      totalPoints: stats.totalPoints,
      rank: stats.rank,
      wavesSurvived: stats.wavesSurvived,
      troopsKilled: stats.troopsKilled,
      troopsLost: stats.troopsLost,
      beginnerProtectionUntil: faker.date.soon({ days: 5 }),
      lastActiveAt: faker.date.recent({ days: 2 }),
    },
  })

  if (continents?.length) {
    await createVillageForPlayer(player, continents)
  }

  return { user, player, stats }
}

async function createTribeWithMembers(
  hashedPassword: string,
  continents?: Continent[],
): Promise<TribeSummary> {
  const targetMembers = faker.number.int({ min: MIN_MEMBERS, max: MAX_MEMBERS })
  const leaderSeed = await createUserAndPlayer(hashedPassword, continents)

  const tribe = await prisma.tribe.create({
    data: {
      name: buildTribeName(),
      tag: buildTribeTag(),
      description: faker.lorem.sentences(2),
      motd: faker.lorem.sentence(),
      joinPolicy: faker.helpers.arrayElement(Object.values(JoinPolicy)),
      leaderId: leaderSeed.player.id,
      memberCount: 1,
      totalPoints: leaderSeed.stats.totalPoints,
    },
  })

  await prisma.player.update({
    where: { id: leaderSeed.player.id },
    data: { tribeId: tribe.id },
  })

  let memberCount = 1
  let totalPoints = leaderSeed.stats.totalPoints

  while (memberCount < targetMembers) {
    const memberSeed = await createUserAndPlayer(hashedPassword, continents)
    await prisma.player.update({
      where: { id: memberSeed.player.id },
      data: { tribeId: tribe.id },
    })
    memberCount += 1
    totalPoints += memberSeed.stats.totalPoints
  }

  const updated = await prisma.tribe.update({
    where: { id: tribe.id },
    data: {
      memberCount,
      totalPoints,
    },
  })

  return {
    name: updated.name,
    tag: updated.tag,
    memberCount,
    totalPoints,
  }
}

async function main() {
  if (TRIBE_COUNT <= 0) {
    console.log("[seed] TRIBE_COUNT is 0, nothing to create.")
    return
  }

  if (MIN_MEMBERS <= 0 || MAX_MEMBERS <= 0) {
    throw new Error("Member counts must be greater than zero.")
  }

  if (MIN_MEMBERS > MAX_MEMBERS) {
    throw new Error("FAKE_TRIBE_MIN_MEMBERS cannot be greater than FAKE_TRIBE_MAX_MEMBERS.")
  }

  console.log(
    `[seed] Generating ${TRIBE_COUNT} tribes with ${MIN_MEMBERS}-${MAX_MEMBERS} members each (password: ${DEFAULT_PASSWORD})`,
  )

  const hashedPassword = await hash(DEFAULT_PASSWORD, 10)
  let continents: Continent[] = []
  let villagesEnabled = true

  try {
    continents = await ensureContinents()
    villagesEnabled = continents.length > 0
  } catch (error) {
    if (isMissingTableError(error, "Continent")) {
      villagesEnabled = false
      console.warn("[seed] Continent table missing. Village creation will be skipped.")
    } else {
      throw error
    }
  }

  if (villagesEnabled) {
    try {
      await loadExistingCoordinates()
    } catch (error) {
      if (isMissingTableError(error, "Village")) {
        villagesEnabled = false
        console.warn("[seed] Village table missing. Village creation will be skipped.")
      } else {
        throw error
      }
    }
  }

  const summaries: TribeSummary[] = []
  const continentPool = villagesEnabled ? continents : undefined
  for (let i = 0; i < TRIBE_COUNT; i++) {
    const summary = await createTribeWithMembers(hashedPassword, continentPool)
    summaries.push(summary)
    console.log(
      `[seed] Created tribe ${summary.name} [${summary.tag}] with ${summary.memberCount} members (${summary.totalPoints} pts)`,
    )
  }

  const totalPlayers = summaries.reduce((sum, tribe) => sum + tribe.memberCount, 0)
  const totalVillages = villagesEnabled ? totalPlayers : 0
  console.log(
    `[seed] Completed generation: ${summaries.length} tribes, ${totalPlayers} players, ${totalVillages} villages.`,
  )
  if (!villagesEnabled) {
    console.log("[seed] Villages were skipped because Continent or Village tables are unavailable.")
  }
  console.log("[seed] You can adjust totals via FAKE_TRIBE_COUNT/MIN/MAX env vars.")
}

main()
  .catch((error) => {
    console.error("[seed] Failed to generate fake tribes:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
