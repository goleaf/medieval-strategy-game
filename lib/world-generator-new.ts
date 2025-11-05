import { prisma } from "@/lib/db"

export async function initializeWorld() {
  console.log("[Reign of Fire] Initializing Reign of Fire game world...");

  // Check if world already exists
  const existingGameWorld = await prisma.gameWorld.findFirst();
  if (existingGameWorld) {
    console.log("[Reign of Fire] Game world already initialized");
    return;
  }

  // Create GameWorld for Reign of Fire
  const gameWorld = await prisma.gameWorld.create({
    data: {
      worldName: "Reign of Fire",
      worldCode: "rof1",
      description: "Travian: Legends - Reign of Fire Annual Special",
      version: "REIGN_OF_FIRE",
      region: "EUROPE",
      speed: 1,
      registrationClosesAfterDays: 70,
      artefactsIntroducedAfterDays: 90,
      constructionPlansAfterDays: 180,
      natarWonderFinishesAfterDays: 250,
      annualSpecialDurationDays: 180,
      startingCulturePoints: 500,
      townhallCelebrationTimeDivisor: 1,
      townhallSmallCelebrationLimit: 500,
      townhallLargeCelebrationLimit: 2000,
      requirementForSecondVillage: 2000,
      artworkCpProductionDivisor: 1.0,
      artworkLimit: 2000,
      artworkUsageCooldownHours: 24,
      itemTier2AfterDays: 70,
      itemTier3AfterDays: 140,
      auctionDurationHours: 24.0,
      smeltingTimeHours: 24,
      beginnerProtectionDays: 5,
      travianPlusDurationDays: 7,
      resourceBonusDurationDays: 7,
      availableVacationDays: 15,
      upgradingToCityCooldownHours: 24,
      natarAttackDelayHours: 24,
      // Reign of Fire specific settings
      heroAdventuresPerDay: 6,
      adventuresForAuctionHouse: 20,
      heroExperienceMultiplier: 0.5,
      heroLootFrequencyMultiplier: 1.5,
      reignOfFireConstructionSpeed: 0.75,
      // Available tribes for Reign of Fire (Teutons included, Vikings excluded)
      availableTribes: {
        create: [
          { tribe: "ROMANS" },
          { tribe: "TEUTONS" },
          { tribe: "GAULS" },
          { tribe: "HUNS" },
          { tribe: "EGYPTIANS" },
          { tribe: "SPARTANS" }
        ]
      }
    },
  });

  console.log(`[Reign of Fire] Created GameWorld: ${gameWorld.worldName} (${gameWorld.worldCode})`);

  // Create WorldConfig linked to the GameWorld
  const worldConfig = await prisma.worldConfig.create({
    data: {
      gameWorldId: gameWorld.id,
      maxX: 400, // Larger map for Reign of Fire
      maxY: 400,
      unitSpeed: 1.0,
      isRunning: true,
      resourcePerTick: 10,
      productionMultiplier: 1.0,
      tickIntervalMinutes: 5,
      constructionQueueLimit: 3,
      nightBonusMultiplier: 1.2,
      beginnerProtectionHours: 72,
      beginnerProtectionEnabled: true,
    },
  });

  console.log("[Reign of Fire] Created WorldConfig:", worldConfig.id);

  // Generate continents in a 6x6 grid for larger map
  const continents = []
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const continent = await prisma.continent.create({
        data: {
          name: `Continent ${i + 1}-${j + 1}`,
          x: i * 65,
          y: j * 65,
          size: 60,
        },
      })
      continents.push(continent)
    }
  }

  console.log(`[Reign of Fire] Generated ${continents.length} continents`);

  // Generate initial barbarian villages scattered across continents
  for (const continent of continents) {
    const barbarianCount = 12 + Math.floor(Math.random() * 8); // More barbarians for larger map
    for (let i = 0; i < barbarianCount; i++) {
      const x = continent.x + Math.floor(Math.random() * continent.size * 10);
      const y = continent.y + Math.floor(Math.random() * continent.size * 10);

      const existing = await prisma.village.findUnique({
        where: { x_y: { x, y } },
      });

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
          });

          // Add barbarian troops
          const troopTypes = ["WARRIOR", "SPEARMAN", "BOWMAN"];
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
            });
          }
        } catch (error) {
          console.error(`[Reign of Fire] Error creating barbarian village at (${x}, ${y}):`, error);
        }
      }
    }
  }

  console.log("[Reign of Fire] World initialization completed");
}
