import { prisma } from "@/lib/db"

export async function initializeWorld() {
  console.log("[v0] Initializing game world...")

  // Create world config if not exists
  const existing = await prisma.worldConfig.findFirst()
  if (existing) {
    console.log("[v0] World already initialized")
    return
  }

  const worldConfig = await prisma.worldConfig.create({
    data: {
      worldName: "Medieval World",
      maxX: 200,
      maxY: 200,
      speed: 1,
      isRunning: true,
      resourcePerTick: 10,
      productionMultiplier: 1.0,
    },
  })

  console.log("[v0] Created world config:", worldConfig.id)

  // Generate continents in a 4x4 grid
  const continents = []
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const continent = await prisma.continent.create({
        data: {
          name: `Continent ${i + 1}-${j + 1}`,
          x: i * 50,
          y: j * 50,
          size: 45,
        },
      })
      continents.push(continent)
    }
  }

  console.log(`[v0] Generated ${continents.length} continents`)

  // Generate initial barbarian villages scattered across continents
  for (const continent of continents) {
    const barbarianCount = 8 + Math.floor(Math.random() * 5)
    for (let i = 0; i < barbarianCount; i++) {
      const x = continent.x + Math.floor(Math.random() * continent.size * 10)
      const y = continent.y + Math.floor(Math.random() * continent.size * 10)

      const existing = await prisma.village.findUnique({
        where: { x_y: { x, y } },
      })

      if (!existing) {
        try {
          const village = await prisma.village.create({
            data: {
              playerId: "barbarian-" + Math.random().toString(36),
              continentId: continent.id,
              x,
              y,
              name: "Barbarian Village",
              isCapital: false,
              wood: 300 + Math.random() * 200,
              stone: 300 + Math.random() * 200,
              iron: 150 + Math.random() * 100,
              gold: 50 + Math.random() * 50,
              food: 500 + Math.random() * 300,
            },
          })

          // Add barbarian troops
          const troopTypes = ["WARRIOR", "SPEARMAN", "BOWMAN"]
          for (const type of troopTypes) {
            await prisma.troop.create({
              data: {
                villageId: village.id,
                type: type as any,
                quantity: 20 + Math.floor(Math.random() * 50),
                attack: 10 + Math.floor(Math.random() * 5),
                defense: 5 + Math.floor(Math.random() * 3),
                speed: 5,
                health: 100,
              },
            })
          }
        } catch (error) {
          console.error(`[v0] Error creating barbarian village at (${x}, ${y}):`, error)
        }
      }
    }
  }

  console.log("[v0] World initialization completed")
}
