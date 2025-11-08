import { prisma } from "@/lib/db"
import resourceFieldConfig from "@/config/resource-fields.json"
import type { Prisma, ResourceType } from "@prisma/client"

const RESOURCE_SLUG_TO_ENUM: Record<string, ResourceType> = {
  wood: "WOOD",
  clay: "CLAY",
  iron: "IRON",
  crop: "CROP",
}

const RESOURCE_ENUMS: ResourceType[] = ["WOOD", "CLAY", "IRON", "CROP"]

const LEDGER_CAPACITY: Record<ResourceType, number> = {
  WOOD: 1200,
  CLAY: 1200,
  IRON: 1200,
  CROP: 2400,
}

const BASELINE_PRODUCTION_PER_HOUR = 2 // baseline per village even at level 0
const FIELD_SLOTS_PER_RESOURCE = 10

async function seedResourceFieldLevels() {
  const operations: Prisma.ResourceFieldLevelUpsertArgs[] = []

  for (const [slug, payload] of Object.entries(resourceFieldConfig.resources)) {
    const resourceType = RESOURCE_SLUG_TO_ENUM[slug]
    if (!resourceType) {
      console.warn(`Skipping unknown resource slug ${slug}`)
      continue
    }

    for (const level of payload.levels) {
      operations.push({
        where: {
          resourceType_level: {
            resourceType,
            level: level.level,
          },
        },
        update: {
          outputPerHour: level.outputPerHour,
          woodCost: level.cost.wood,
          clayCost: level.cost.clay,
          ironCost: level.cost.iron,
          cropCost: level.cost.crop,
          buildTimeSeconds: level.buildTimeSeconds,
        },
        create: {
          resourceType,
          level: level.level,
          outputPerHour: level.outputPerHour,
          woodCost: level.cost.wood,
          clayCost: level.cost.clay,
          ironCost: level.cost.iron,
          cropCost: level.cost.crop,
          buildTimeSeconds: level.buildTimeSeconds,
        },
      })
    }
  }

  for (const op of operations) {
    await prisma.resourceFieldLevel.upsert(op)
  }
}

async function seedVillageLedgers() {
  const villages = await prisma.village.findMany({
    select: { id: true },
  })

  for (const village of villages) {
    await prisma.$transaction(async (tx) => {
      for (const resourceType of RESOURCE_ENUMS) {
        await tx.villageResourceLedger.upsert({
          where: {
            villageId_resourceType: {
              villageId: village.id,
              resourceType,
            },
          },
          update: {},
          create: {
            villageId: village.id,
            resourceType,
            currentAmount: LEDGER_CAPACITY[resourceType] / 4,
            productionPerHour: BASELINE_PRODUCTION_PER_HOUR,
            netProductionPerHour: resourceType === "CROP" ? BASELINE_PRODUCTION_PER_HOUR : BASELINE_PRODUCTION_PER_HOUR,
            storageCapacity: LEDGER_CAPACITY[resourceType],
          },
        })

        for (let slot = 0; slot < FIELD_SLOTS_PER_RESOURCE; slot++) {
          await tx.villageResourceField.upsert({
            where: {
              villageId_resourceType_slot: {
                villageId: village.id,
                resourceType,
                slot,
              },
            },
            update: {},
            create: {
              villageId: village.id,
              resourceType,
              slot,
              level: 0,
            },
          })
        }
      }
    })
  }
}

async function main() {
  console.log("🌱 Seeding resource field system...")
  await seedResourceFieldLevels()
  await seedVillageLedgers()
  console.log("✅ Resource field system seeded")
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed resource system", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
