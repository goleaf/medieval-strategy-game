import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("[v0] Creating admin and demo users...")

  const password = "pass123"
  const hashedPassword = await hash(password, 10)

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@game.local" },
  })

  if (existingAdmin) {
    console.log("[v0] Admin user already exists, skipping...")
  } else {
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: "admin@game.local",
        username: "admin",
        password: hashedPassword,
        displayName: "Admin",
      },
    })

    // Create admin record
    await prisma.admin.create({
      data: {
        userId: adminUser.id,
        role: "ADMIN",
      },
    })

    console.log(`[v0] Created admin user: ${adminUser.email}`)
  }

  // Check if demo user already exists
  const existingDemo = await prisma.user.findUnique({
    where: { email: "demo@game.local" },
  })

  if (existingDemo) {
    console.log("[v0] Demo user already exists, skipping...")
  } else {
    // Create demo user
    const demoUser = await prisma.user.create({
      data: {
        email: "demo@game.local",
        username: "demo",
        password: hashedPassword,
        displayName: "Demo User",
      },
    })

    // Create player for demo user
    const continents = await prisma.continent.findMany()
    if (continents.length > 0) {
      const randomContinent = continents[Math.floor(Math.random() * continents.length)]
      
      const player = await prisma.player.create({
        data: {
          userId: demoUser.id,
          playerName: "demo",
        },
      })

      // Initialize beginner protection
      const { ProtectionService } = await import("../lib/game-services/protection-service.js")
      await ProtectionService.initializeProtection(player.id)

      // Create village for demo player
      await prisma.village.create({
        data: {
          playerId: player.id,
          continentId: randomContinent.id,
          name: "Demo Village",
          x: randomContinent.x + Math.random() * randomContinent.size * 10,
          y: randomContinent.y + Math.random() * randomContinent.size * 10,
          isCapital: true,
          wood: 5000,
          stone: 5000,
          iron: 2500,
          gold: 1000,
          food: 10000,
        },
      })

      console.log(`[v0] Created demo user: ${demoUser.email} with player`)
    } else {
      console.log(`[v0] Created demo user: ${demoUser.email} (no continents available for village)`)
    }
  }

  console.log("[v0] User creation completed successfully")
  console.log("[v0] Admin credentials: admin@game.local / pass123")
  console.log("[v0] Demo credentials: demo@game.local / pass123")
}

main()
  .catch((e) => {
    console.error("[v0] Error creating users:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

