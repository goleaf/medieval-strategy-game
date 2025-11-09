import "dotenv/config"
import { prisma } from "@/lib/db"

type Prereq = { tech?: string[]; buildings?: Array<{ type: string; level: number }> }

const TECHNOLOGIES = [
  {
    id: "tech.unit.scout",
    key: "UNIT_SCOUT",
    displayName: "Scout Training",
    description: "Unlocks the Scout unit in the Stable.",
    category: "UNIT" as const,
    cost: { wood: 4000, stone: 3000, iron: 3000, gold: 1000, food: 0 },
    baseTimeSeconds: 3 * 60 * 60, // 3h
    academyLevel: 1,
    prerequisites: { buildings: [{ type: "STABLES", level: 1 }] } as Prereq,
    effects: { unlocks: { units: ["SCOUT"] } },
  },
  {
    id: "tech.unit.ram",
    key: "UNIT_RAM",
    displayName: "Ram Engineering",
    description: "Unlocks the Ram siege unit in the Workshop.",
    category: "UNIT" as const,
    cost: { wood: 6000, stone: 7000, iron: 5000, gold: 1500, food: 0 },
    baseTimeSeconds: 6 * 60 * 60, // 6h
    academyLevel: 2,
    prerequisites: { buildings: [{ type: "WORKSHOP", level: 1 }] } as Prereq,
    effects: { unlocks: { units: ["RAM"] } },
  },
  {
    id: "tech.unit.catapult",
    key: "UNIT_CATAPULT",
    displayName: "Catapult Engineering",
    description: "Unlocks the Catapult siege unit in the Workshop.",
    category: "UNIT" as const,
    cost: { wood: 10000, stone: 12000, iron: 9000, gold: 2500, food: 0 },
    baseTimeSeconds: 10 * 60 * 60, // 10h
    academyLevel: 3,
    prerequisites: { tech: ["UNIT_RAM"], buildings: [{ type: "WORKSHOP", level: 3 }] } as Prereq,
    effects: { unlocks: { units: ["CATAPULT"] } },
  },
  {
    id: "tech.system.paladin",
    key: "SYSTEM_PALADIN",
    displayName: "Paladin Order",
    description: "Activates the Paladin hero system.",
    category: "SYSTEM" as const,
    cost: { wood: 8000, stone: 8000, iron: 8000, gold: 4000, food: 0 },
    baseTimeSeconds: 12 * 60 * 60, // 12h
    academyLevel: 3,
    prerequisites: { tech: ["UNIT_SCOUT"], buildings: [{ type: "ACADEMY", level: 3 }] } as Prereq,
    effects: { unlocks: { systems: ["PALADIN"] } },
  },
  {
    id: "tech.unit.noble",
    key: "UNIT_NOBLE",
    displayName: "Noble Fidelity",
    description: "Unlocks the Nobleman unit and loyalty conquest mechanics.",
    category: "UNIT" as const,
    cost: { wood: 20000, stone: 20000, iron: 20000, gold: 10000, food: 0 },
    baseTimeSeconds: 24 * 60 * 60, // 24h
    academyLevel: 5,
    prerequisites: { tech: ["UNIT_CATAPULT", "SYSTEM_PALADIN"], buildings: [{ type: "ACADEMY", level: 5 }] } as Prereq,
    effects: { unlocks: { units: ["NOBLEMAN"], systems: ["CONQUEST"] } },
  },
  {
    id: "tech.building.smithy_adv",
    key: "BUILDING_SMITHY_UPGRADES",
    displayName: "Smithy Mastery",
    description: "Unlocks advanced smithy upgrades and faster research.",
    category: "BUILDING" as const,
    cost: { wood: 7000, stone: 7000, iron: 7000, gold: 2000, food: 0 },
    baseTimeSeconds: 8 * 60 * 60, // 8h
    academyLevel: 2,
    prerequisites: { buildings: [{ type: "SMITHY", level: 5 }] } as Prereq,
    effects: { unlocks: { buildings: ["SMITHY_ADV"] } },
  },
  {
    id: "tech.building.market_adv",
    key: "BUILDING_MARKET_ADV",
    displayName: "Market Logistics",
    description: "Unlocks advanced market features (routes, flags).",
    category: "BUILDING" as const,
    cost: { wood: 5000, stone: 5000, iron: 6000, gold: 3000, food: 0 },
    baseTimeSeconds: 6 * 60 * 60, // 6h
    academyLevel: 2,
    prerequisites: { buildings: [{ type: "MARKETPLACE", level: 5 }] } as Prereq,
    effects: { unlocks: { systems: ["MARKET_ROUTES", "FLAGS"] } },
  },
  {
    id: "tech.system.support_mgmt",
    key: "SYSTEM_SUPPORT_MGMT",
    displayName: "Support Management",
    description: "Enables inbound/outbound support overviews and management.",
    category: "SYSTEM" as const,
    cost: { wood: 4000, stone: 4000, iron: 4000, gold: 1500, food: 0 },
    baseTimeSeconds: 4 * 60 * 60, // 4h
    academyLevel: 1,
    prerequisites: { buildings: [{ type: "RALLY_POINT", level: 5 }] } as Prereq,
    effects: { unlocks: { systems: ["SUPPORT_MGMT"] } },
  },
]

async function main() {
  let created = 0
  for (const t of TECHNOLOGIES) {
    await prisma.technology.upsert({
      where: { key: t.key },
      update: {
        displayName: t.displayName,
        description: t.description,
        category: t.category as any,
        costWood: t.cost.wood,
        costStone: t.cost.stone,
        costIron: t.cost.iron,
        costGold: t.cost.gold,
        costFood: t.cost.food,
        baseTimeSeconds: t.baseTimeSeconds,
        academyLevelRequired: t.academyLevel,
        prerequisites: t.prerequisites as any,
        effects: t.effects as any,
      },
      create: {
        id: t.id,
        key: t.key,
        displayName: t.displayName,
        description: t.description,
        category: t.category as any,
        costWood: t.cost.wood,
        costStone: t.cost.stone,
        costIron: t.cost.iron,
        costGold: t.cost.gold,
        costFood: t.cost.food,
        baseTimeSeconds: t.baseTimeSeconds,
        academyLevelRequired: t.academyLevel,
        prerequisites: t.prerequisites as any,
        effects: t.effects as any,
      },
    })
    created += 1
  }
  console.log(`[tech] Seeded ${created} technologies.`)
}

main()
  .catch((e) => {
    console.error("[tech] Seed failed", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

