import { prisma } from "@/lib/db"

async function main() {
  console.log("[v0] Starting database seed...")

  // Create world config
  const worldConfig = await prisma.worldConfig.create({
    data: {
      worldName: "Medieval World",
      maxX: 200,
      maxY: 200,
      speed: 1,
      isRunning: true,
      tickIntervalMinutes: 5,
      constructionQueueLimit: 3,
      unitSpeed: 1.0,
      nightBonusMultiplier: 1.2,
      beginnerProtectionHours: 72,
      beginnerProtectionEnabled: true,
    },
  })

  console.log("[v0] Created world config:", worldConfig.id)

  // Create continents
  const continents = []
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const continent = await prisma.continent.create({
        data: {
          name: `Continent-${i}-${j}`,
          x: i * 50,
          y: j * 50,
          size: 10,
        },
      })
      continents.push(continent)
    }
  }

  console.log(`[v0] Created ${continents.length} continents`)

  // Create sample users and players
  for (let i = 0; i < 5; i++) {
    const user = await prisma.user.create({
      data: {
        email: `player${i}@game.local`,
        username: `player${i}`,
        password: "hashed_password", // In production, hash this
        displayName: `Player ${i}`,
      },
    })

    const continent = continents[i % continents.length]
    const player = await prisma.player.create({
      data: {
        userId: user.id,
        playerName: `player${i}`,
      },
    })

    // Initialize beginner protection
    const { ProtectionService } = await import("../lib/game-services/protection-service")
    await ProtectionService.initializeProtection(player.id)

    // Create village for player
    const village = await prisma.village.create({
      data: {
        playerId: player.id,
        continentId: continent.id,
        name: `${player.playerName}'s Village`,
        x: continent.x + Math.random() * continent.size * 10,
        y: continent.y + Math.random() * continent.size * 10,
        isCapital: true,
        wood: 5000,
        stone: 5000,
        iron: 2500,
        gold: 1000,
        food: 10000,
      },
    })

    console.log(`[v0] Created player ${player.playerName} with village at (${village.x}, ${village.y})`)
  }

  console.log("[v0] Database seed completed successfully")
}

main()
  .catch((e) => {
    console.error("[v0] Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
