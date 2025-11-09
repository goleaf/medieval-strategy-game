import { prisma } from "@/lib/db"
import type { BuildingType } from "@prisma/client"

const CAPACITY_CONFIG: Partial<Record<BuildingType, { base: number; growth: number; levels: number }>> = {
  WAREHOUSE: { base: 1200, growth: 1.28, levels: 20 },
  GRANARY: { base: 1200, growth: 1.28, levels: 20 },
}

const CRANNY_LEVELS = 20
const CRANNY_STEP = 100

function rounded(value: number, step = 100) {
  return Math.round(value / step) * step
}

function buildCapacitySeries(base: number, growth: number, levels: number) {
  return Array.from({ length: levels }, (_, idx) => {
    const level = idx + 1
    const capacity = rounded(base * Math.pow(growth, idx))
    return { level, capacity }
  })
}

function buildCrannySeries() {
  return Array.from({ length: CRANNY_LEVELS }, (_, idx) => {
    const level = idx + 1
    const protectedPerResource = level * CRANNY_STEP
    return { level, protectedPerResource }
  })
}

async function seedStorageCapacities() {
  for (const [buildingType, config] of Object.entries(CAPACITY_CONFIG) as Array<
    [BuildingType, { base: number; growth: number; levels: number } | undefined]
  >) {
    if (!config || !config.levels) continue

    const entries = buildCapacitySeries(config.base, config.growth, config.levels)
    for (const entry of entries) {
      await prisma.storageCapacityCurve.upsert({
        where: {
          buildingType_level: {
            buildingType: buildingType as BuildingType,
            level: entry.level,
          },
        },
        update: { capacity: entry.capacity },
        create: {
          buildingType: buildingType as BuildingType,
          level: entry.level,
          capacity: entry.capacity,
        },
      })
    }
  }
}

async function seedCrannyProtection() {
  const entries = buildCrannySeries()
  for (const entry of entries) {
    await prisma.crannyProtectionCurve.upsert({
      where: { level: entry.level },
      update: { protectedPerResource: entry.protectedPerResource },
      create: {
        level: entry.level,
        protectedPerResource: entry.protectedPerResource,
      },
    })
  }
}

async function main() {
  console.log("[storage] Seeding warehouse/granary capacity curves...")
  await seedStorageCapacities()
  console.log("[storage] Seeding cranny protection curve...")
  await seedCrannyProtection()
  console.log("[storage] Storage tables seeded successfully.")
}

main()
  .catch((error) => {
    console.error("[storage] Seed error:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
