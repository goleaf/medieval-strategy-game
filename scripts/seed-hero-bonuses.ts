import { prisma } from "@/lib/db"
import { randomUUID } from "node:crypto"

const BONUS_PROFILES = [
  { wood: 0.1, clay: 0.05, iron: 0.05, crop: 0.02, all: 0.02 },
  { wood: 0.05, clay: 0.1, iron: 0.05, crop: 0.02, all: 0.02 },
  { wood: 0.05, clay: 0.05, iron: 0.1, crop: 0.02, all: 0.02 },
  { wood: 0.05, clay: 0.05, iron: 0.05, crop: 0.08, all: 0.03 },
]

async function ensureSamplePlayer() {
  const existing = await prisma.player.findMany({ include: { hero: true } })
  if (existing.length > 0) {
    return existing
  }

  console.log("👤 No players detected; creating a demo account with hero bonuses.")
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: "demo@realm.local",
      username: "demo-player",
      password: "hashed_password",
      displayName: "Demo Player",
    },
  })

  const player = await prisma.player.create({
    data: {
      userId: user.id,
      playerName: "demo-player",
    },
    include: { hero: true },
  })

  return [player]
}

async function main() {
  console.log("🛡️  Seeding hero bonus profiles...")
  const players = await ensureSamplePlayer()

  for (const [index, player] of players.entries()) {
    const bonuses = BONUS_PROFILES[index % BONUS_PROFILES.length]
    await prisma.hero.upsert({
      where: { playerId: player.id },
      update: {
        woodBonusPercent: bonuses.wood,
        clayBonusPercent: bonuses.clay,
        ironBonusPercent: bonuses.iron,
        cropBonusPercent: bonuses.crop,
        allResourceBonus: bonuses.all,
      },
      create: {
        playerId: player.id,
        name: `${player.playerName}'s Hero`,
        woodBonusPercent: bonuses.wood,
        clayBonusPercent: bonuses.clay,
        ironBonusPercent: bonuses.iron,
        cropBonusPercent: bonuses.crop,
        allResourceBonus: bonuses.all,
      },
    })
  }

  console.log(`✅ Seeded hero bonuses for ${players.length} player(s)`)
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed hero bonuses", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
