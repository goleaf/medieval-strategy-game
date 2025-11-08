import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Configuration
const WORLD_SIZE = 200 // 200x200 world
const NUM_USERS = 2000
const VILLAGES_PER_USER = 1 // One village per user
const TOTAL_VILLAGES = NUM_USERS * VILLAGES_PER_USER

// Village name templates
const VILLAGE_PREFIXES = [
  'Castle', 'Fort', 'Keep', 'Tower', 'Stronghold', 'Citadel', 'Bastion', 'Redoubt',
  'Village', 'Town', 'Settlement', 'Hamlet', 'Outpost', 'Camp', 'Colony',
  'Dragon', 'Wolf', 'Bear', 'Eagle', 'Lion', 'Tiger', 'Falcon', 'Raven',
  'Stone', 'Iron', 'Wood', 'Gold', 'Silver', 'Bronze', 'Crystal',
  'North', 'South', 'East', 'West', 'High', 'Low', 'Great', 'Small'
]

const VILLAGE_SUFFIXES = [
  'Hold', 'Reach', 'Guard', 'Watch', 'Gate', 'Bridge', 'Ford', 'Cross',
  'Hill', 'Mountain', 'Valley', 'Plain', 'Forest', 'Lake', 'River',
  'Point', 'Bay', 'Harbor', 'Port', 'Cove', 'Island', 'Peninsula',
  'Castle', 'Keep', 'Tower', 'Fort', 'Citadel', 'Palace', 'Manor'
]

function generateVillageName(): string {
  const prefix = faker.helpers.arrayElement(VILLAGE_PREFIXES)
  const suffix = faker.helpers.arrayElement(VILLAGE_SUFFIXES)
  return `${prefix} ${suffix}`
}

function getRandomLevel(): number {
  // Weighted random level distribution
  const rand = Math.random()
  if (rand < 0.4) return faker.number.int({ min: 1, max: 3 }) // 40% basic villages
  if (rand < 0.7) return faker.number.int({ min: 4, max: 7 }) // 30% medium villages
  if (rand < 0.9) return faker.number.int({ min: 8, max: 12 }) // 20% advanced villages
  return faker.number.int({ min: 13, max: 20 }) // 10% high-level villages
}

function getResourcesForLevel(level: number): {
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  population: number
} {
  const baseMultiplier = level * 50
  return {
    wood: faker.number.int({ min: baseMultiplier, max: baseMultiplier * 3 }),
    stone: faker.number.int({ min: baseMultiplier, max: baseMultiplier * 3 }),
    iron: faker.number.int({ min: baseMultiplier / 2, max: baseMultiplier * 2 }),
    gold: faker.number.int({ min: baseMultiplier / 4, max: baseMultiplier }),
    food: faker.number.int({ min: baseMultiplier, max: baseMultiplier * 4 }),
    population: faker.number.int({ min: level * 10, max: level * 30 }),
  }
}

async function clearExistingData() {
  console.log('🧹 Clearing existing data...')

  // Delete in correct order to respect foreign key constraints
  await prisma.auditLog.deleteMany()
  await prisma.adminNotification.deleteMany()
  await prisma.leaderboardCache.deleteMany()
  await prisma.troopBalance.deleteMany()
  await prisma.message.deleteMany()
  await prisma.marketOrder.deleteMany()
  await prisma.attackUnit.deleteMany()
  await prisma.defenseUnit.deleteMany()
  await prisma.attack.deleteMany()
  await prisma.defense.deleteMany()
  await prisma.troopProduction.deleteMany()
  await prisma.troop.deleteMany()
  await prisma.research.deleteMany()
  await prisma.building.deleteMany()
  await prisma.movement.deleteMany()
  await prisma.barbarian.deleteMany()

  // Tribe-related deletions
  await prisma.war.deleteMany()
  await prisma.tribeTreaty.deleteMany()
  await prisma.tribeInvite.deleteMany()
  await prisma.tribe.deleteMany()

  await prisma.village.deleteMany()
  await prisma.player.deleteMany()
  await prisma.admin.deleteMany()
  await prisma.continent.deleteMany()
  await prisma.user.deleteMany()

  console.log('✅ Existing data cleared')
}

async function createWorldConfig() {
  console.log('🌍 Creating world configuration...')

  await prisma.worldConfig.upsert({
    where: { id: 'world-config' },
    update: {
      worldName: 'Medieval World',
      maxX: WORLD_SIZE,
      maxY: WORLD_SIZE,
      speed: 1,
      isRunning: true,
    },
    create: {
      id: 'world-config',
      worldName: 'Medieval World',
      maxX: WORLD_SIZE,
      maxY: WORLD_SIZE,
      speed: 1,
      isRunning: true,
    },
  })

  console.log('✅ World configuration created')
}

async function createContinents() {
  console.log('🗺️ Creating continents...')

  const continents = []
  const continentSize = 50 // Each continent is 50x50

  for (let y = 0; y < WORLD_SIZE; y += continentSize) {
    for (let x = 0; x < WORLD_SIZE; x += continentSize) {
      continents.push({
        name: `Continent ${Math.floor(x / continentSize) + 1}-${Math.floor(y / continentSize) + 1}`,
        x,
        y,
        size: continentSize,
      })
    }
  }

  await prisma.continent.createMany({
    data: continents,
  })

  console.log(`✅ Created ${continents.length} continents`)
}

async function createUsersAndPlayers() {
  console.log(`👥 Creating ${NUM_USERS} users and players...`)

  const users = []
  const players = []
  const usedUsernames = new Set<string>()
  const usedPlayerNames = new Set<string>()

  for (let i = 0; i < NUM_USERS; i++) {
    const email = `player${i + 1}@medievalgame.local`

    // Ensure unique username
    let username = faker.internet.username()
    let counter = 1
    while (usedUsernames.has(username)) {
      username = `${faker.internet.username()}${counter}`
      counter++
    }
    usedUsernames.add(username)

    const displayName = faker.person.fullName()

    // Ensure unique player name
    let playerName = faker.helpers.slugify(displayName.toLowerCase())
    counter = 1
    while (usedPlayerNames.has(playerName)) {
      playerName = `${faker.helpers.slugify(displayName.toLowerCase())}${counter}`
      counter++
    }
    usedPlayerNames.add(playerName)

    users.push({
      email,
      username,
      password: '$2b$10$dummy.hash.for.fake.users', // Dummy hash
      displayName,
    })

    players.push({
      userId: '', // Will be set after creation
      playerName,
      totalPoints: faker.number.int({ min: 100, max: 10000 }),
      rank: 0, // Will be calculated later
    })

    if ((i + 1) % 100 === 0) {
      console.log(`  Created ${i + 1}/${NUM_USERS} users...`)
    }
  }

  // Create users in batches
  const createdUsers = []
  for (let i = 0; i < users.length; i += 100) {
    const batch = users.slice(i, i + 100)
    const batchResults = await prisma.user.createManyAndReturn({
      data: batch,
      select: { id: true, email: true },
    })
    createdUsers.push(...batchResults)
  }

  // Create players
  for (let i = 0; i < players.length; i++) {
    const user = createdUsers[i]
    players[i].userId = user.id
  }

  const createdPlayers = []
  for (let i = 0; i < players.length; i += 100) {
    const batch = players.slice(i, i + 100)
    const batchResults = await prisma.player.createManyAndReturn({
      data: batch,
      select: { id: true, playerName: true, userId: true },
    })
    createdPlayers.push(...batchResults)
  }

  console.log(`✅ Created ${createdUsers.length} users and ${createdPlayers.length} players`)
  return createdPlayers
}

async function createVillages(players: any[]) {
  console.log(`🏰 Creating ${TOTAL_VILLAGES} villages...`)

  // Get all continents
  const continents = await prisma.continent.findMany()

  // Track occupied positions
  const occupiedPositions = new Set<string>()

  const villages = []

  for (let i = 0; i < players.length; i++) {
    const player = players[i]

    // Find a random continent and position
    const continent = faker.helpers.arrayElement(continents)
    let x, y, positionKey

    // Find an unoccupied position
    let attempts = 0
    do {
      x = faker.number.int({ min: continent.x, max: continent.x + continent.size - 1 })
      y = faker.number.int({ min: continent.y, max: continent.y + continent.size - 1 })
      positionKey = `${x},${y}`
      attempts++
    } while (occupiedPositions.has(positionKey) && attempts < 100)

    if (attempts >= 100) {
      console.warn(`Could not find empty position for player ${player.playerName}, skipping...`)
      continue
    }

    occupiedPositions.add(positionKey)

    const level = getRandomLevel()
    const resources = getResourcesForLevel(level)
    const villageName = generateVillageName()

    villages.push({
      playerId: player.id,
      continentId: continent.id,
      x,
      y,
      name: villageName,
      isCapital: true, // All villages are capitals for simplicity
      ...resources,
      woodProduction: faker.number.int({ min: 5, max: 15 }),
      stoneProduction: faker.number.int({ min: 4, max: 12 }),
      ironProduction: faker.number.int({ min: 2, max: 8 }),
      goldProduction: faker.number.int({ min: 1, max: 5 }),
      foodProduction: faker.number.int({ min: 10, max: 25 }),
      loyalty: faker.number.int({ min: 80, max: 100 }),
    })

    if ((i + 1) % 100 === 0) {
      console.log(`  Created ${i + 1}/${players.length} villages...`)
    }
  }

  // Create villages in batches
  for (let i = 0; i < villages.length; i += 100) {
    const batch = villages.slice(i, i + 100)
    await prisma.village.createMany({
      data: batch,
    })
  }

  console.log(`✅ Created ${villages.length} villages`)
}

async function createBuildingsForVillages() {
  console.log('🏗️ Creating buildings for villages...')

  const villages = await prisma.village.findMany({
    select: { id: true, x: true, y: true },
  })

  const buildings = []

  for (const village of villages) {
    // Calculate level based on distance from center (center villages are more developed)
    const centerX = WORLD_SIZE / 2
    const centerY = WORLD_SIZE / 2
    const distanceFromCenter = Math.sqrt(
      Math.pow(village.x - centerX, 2) + Math.pow(village.y - centerY, 2)
    )
    const maxDistance = Math.sqrt(2) * (WORLD_SIZE / 2)
    const developmentFactor = 1 - (distanceFromCenter / maxDistance)

    // Headquarters (always level 1-20)
    const hqLevel = Math.max(1, Math.floor(developmentFactor * 20))
    buildings.push({
      villageId: village.id,
      type: 'HEADQUARTER',
      level: hqLevel,
    })

    // Other buildings based on HQ level
    const otherBuildings = [
      { type: 'BARRACKS', maxLevel: Math.max(1, hqLevel - 2) },
      { type: 'MARKETPLACE', maxLevel: Math.max(1, hqLevel - 1) },
      { type: 'WAREHOUSE', maxLevel: Math.max(1, hqLevel - 3) },
      { type: 'FARM', maxLevel: Math.max(1, hqLevel - 2) },
      { type: 'SAWMILL', maxLevel: Math.max(1, hqLevel - 4) },
      { type: 'QUARRY', maxLevel: Math.max(1, hqLevel - 4) },
      { type: 'IRON_MINE', maxLevel: Math.max(1, hqLevel - 5) },
    ]

    for (const building of otherBuildings) {
      if (Math.random() < 0.7) { // 70% chance to have each building
        buildings.push({
          villageId: village.id,
          type: building.type,
          level: faker.number.int({ min: 1, max: building.maxLevel }),
        })
      }
    }
  }

  // Create buildings in batches
  for (let i = 0; i < buildings.length; i += 500) {
    const batch = buildings.slice(i, i + 500)
    await prisma.building.createMany({
      data: batch,
    })
  }

  console.log(`✅ Created ${buildings.length} buildings`)
}

async function updatePlayerRanks() {
  console.log('🏆 Calculating player ranks...')

  const players = await prisma.player.findMany({
    include: {
      villages: {
        include: {
          buildings: true,
        },
      },
    },
  })

  // Calculate points based on villages and buildings
  const playerUpdates = players.map(player => {
    let totalPoints = 0
    for (const village of player.villages) {
      totalPoints += village.wood + village.stone + village.iron + village.gold + village.food
      totalPoints += village.buildings.reduce((sum, b) => sum + (b.level * 100), 0)
    }

    return {
      id: player.id,
      totalPoints,
    }
  })

  // Sort by points and assign ranks
  playerUpdates.sort((a, b) => b.totalPoints - a.totalPoints)
  playerUpdates.forEach((player, index) => {
    player.rank = index + 1
  })

  // Update players
  for (const player of playerUpdates) {
    await prisma.player.update({
      where: { id: player.id },
      data: {
        totalPoints: player.totalPoints,
        rank: player.rank,
      },
    })
  }

  console.log('✅ Player ranks updated')
}

async function main() {
  console.log('🚀 Starting world generation...')
  console.log(`Target: ${NUM_USERS} users, ${TOTAL_VILLAGES} villages in ${WORLD_SIZE}x${WORLD_SIZE} world`)

  try {
    await clearExistingData()
    await createWorldConfig()
    await createContinents()
    const players = await createUsersAndPlayers()
    await createVillages(players)
    await createBuildingsForVillages()
    await updatePlayerRanks()

    console.log('🎉 World generation completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   - World Size: ${WORLD_SIZE}x${WORLD_SIZE}`)
    console.log(`   - Users: ${NUM_USERS}`)
    console.log(`   - Villages: ${TOTAL_VILLAGES}`)
    console.log(`   - Continents: ${Math.pow(WORLD_SIZE / 50, 2)}`)

  } catch (error) {
    console.error('❌ Error during world generation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()
