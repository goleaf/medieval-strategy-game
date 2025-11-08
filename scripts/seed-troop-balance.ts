import { prisma } from "@/lib/db"
import { TroopService } from "@/lib/game-services/troop-service"
import { TroopType } from "@prisma/client"

const DEFAULT_UPKEEP = 1
const CROP_UPKEEP: Partial<Record<TroopType, number>> = {
  WARRIOR: 1,
  SPEARMAN: 1,
  BOWMAN: 1,
  HORSEMAN: 2,
  PALADIN: 3,
  EAGLE_KNIGHT: 3,
  RAM: 5,
  CATAPULT: 6,
  KNIGHT: 3,
  NOBLEMAN: 4,
  CLUBSWINGER: 1,
  SPEARMAN_TEUTONIC: 1,
  AXEMAN: 2,
  SCOUT: 2,
  PALADIN_TEUTONIC: 3,
  TEUTONIC_KNIGHT: 4,
  CHIEF: 5,
}

async function main() {
  console.log("🌾 Seeding troop balance with crop upkeep values...")
  const troopTypes = Object.values(TroopType) as TroopType[]

  for (const type of troopTypes) {
    const stats = TroopService.getTroopStats(type)
    if (!stats) {
      console.warn(`⚠️  No TROOP_STATS entry found for ${type}, skipping`)
      continue
    }

    await prisma.troopBalance.upsert({
      where: { troopType: type },
      update: {
        costWood: stats.cost.wood,
        costStone: stats.cost.stone,
        costIron: stats.cost.iron,
        costGold: stats.cost.gold,
        costFood: stats.cost.food,
        attack: stats.stats.attack,
        defense: stats.stats.defense,
        health: stats.stats.health,
        speed: stats.stats.speed,
        cropUpkeep: CROP_UPKEEP[type] ?? DEFAULT_UPKEEP,
      },
      create: {
        troopType: type,
        costWood: stats.cost.wood,
        costStone: stats.cost.stone,
        costIron: stats.cost.iron,
        costGold: stats.cost.gold,
        costFood: stats.cost.food,
        attack: stats.stats.attack,
        defense: stats.stats.defense,
        health: stats.stats.health,
        speed: stats.stats.speed,
        cropUpkeep: CROP_UPKEEP[type] ?? DEFAULT_UPKEEP,
      },
    })
  }

  console.log("✅ Troop balance upkeep seeding complete")
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed troop balance", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
