import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateToGameWorlds() {
  console.log('Starting migration to comprehensive game world system...')

  try {
    // Get existing WorldConfig records
    const existingConfigs = await prisma.worldConfig.findMany()
    console.log(`Found ${existingConfigs.length} existing WorldConfig records`)

    // Create a default GameWorld for existing configurations
    const defaultGameWorld = await prisma.gameWorld.create({
      data: {
        worldName: 'Default World',
        worldCode: 'default',
        description: 'Migrated default world',
        version: 'REGULAR',
        region: 'INTERNATIONAL',
        speed: 1,
        // Use default values for all timing configurations
        availableTribes: {
          create: [
            { tribe: 'ROMANS' },
            { tribe: 'TEUTONS' },
            { tribe: 'GAULS' },
            { tribe: 'HUNS' },
            { tribe: 'EGYPTIANS' }
          ]
        }
      }
    })

    console.log(`Created default GameWorld with ID: ${defaultGameWorld.id}`)

    // Update existing WorldConfig records to reference the new GameWorld
    for (const config of existingConfigs) {
      await prisma.worldConfig.update({
        where: { id: config.id },
        data: {
          gameWorldId: defaultGameWorld.id,
          updatedAt: new Date()
        }
      })
    }

    console.log('Successfully migrated existing WorldConfig records')

    // Update existing players to reference the default GameWorld
    const playerCount = await prisma.player.updateMany({
      where: { gameWorldId: null },
      data: { gameWorldId: defaultGameWorld.id }
    })

    console.log(`Updated ${playerCount.count} players to reference the default GameWorld`)

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateToGameWorlds()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
