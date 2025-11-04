const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simplified version of ensurePlayerHasVillage
async function ensurePlayerHasVillage(playerId) {
  // Check if player already has villages
  const existingVillages = await prisma.village.findMany({
    where: { playerId },
  });

  console.log(`Player ${playerId} has ${existingVillages.length} villages`);

  if (existingVillages.length > 0) {
    return existingVillages[0];
  }

  // Get all continents
  const continents = await prisma.continent.findMany();
  if (continents.length === 0) {
    console.error("[VillageService] No continents available to create village");
    return null;
  }

  // Pick a random continent
  const randomContinent = continents[Math.floor(Math.random() * continents.length)];
  console.log(`Selected continent: ${randomContinent.name} (${randomContinent.x}, ${randomContinent.y}, size: ${randomContinent.size})`);

  // Find an available position
  const position = await findAvailablePosition(randomContinent.id);
  if (!position) {
    console.error("[VillageService] Could not find available position for village");
    return null;
  }

  console.log(`Found position: (${position.x}, ${position.y})`);

  // Generate random name
  const villageName = generateRandomVillageName();
  console.log(`Generated name: ${villageName}`);

  // Create the village
  try {
    const village = await prisma.village.create({
      data: {
        playerId,
        continentId: randomContinent.id,
        name: villageName,
        x: position.x,
        y: position.y,
        isCapital: true,
      },
    });

    console.log(`Created village: ${village.id}`);

    // Create default buildings
    await initializeBuildings(village.id);
    console.log('Initialized buildings');

    return village;
  } catch (error) {
    console.error('Error creating village:', error);
    return null;
  }
}

async function findAvailablePosition(continentId, maxAttempts = 50) {
  const continent = await prisma.continent.findUnique({
    where: { id: continentId },
  });

  if (!continent) {
    return null;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = continent.x + Math.floor(Math.random() * continent.size * 10);
    const y = continent.y + Math.floor(Math.random() * continent.size * 10);

    const existing = await prisma.village.findUnique({
      where: { x_y: { x, y } },
    });

    if (!existing) {
      return { x, y };
    }
  }

  return null;
}

function generateRandomVillageName() {
  const prefixes = ["Oak", "Stone", "Iron", "Golden"];
  const suffixes = ["brook", "dale", "field"];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}`;
}

async function initializeBuildings(villageId) {
  const buildingTypes = ["HEADQUARTER", "BARRACKS", "MARKETPLACE", "FARM", "WAREHOUSE", "SAWMILL", "QUARRY", "IRON_MINE"];

  await prisma.building.createMany({
    data: buildingTypes.map((type) => ({
      villageId,
      type: type,
      level: 1,
    })),
  });

  // Update production rates based on initial buildings
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    include: { buildings: true },
  });

  if (village) {
    // Simple calculation without BuildingService
    const bonuses = { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 };

    for (const building of village.buildings) {
      switch (building.type) {
        case "SAWMILL":
          bonuses.wood += building.level * 5;
          break;
        case "QUARRY":
          bonuses.stone += building.level * 4;
          break;
        case "IRON_MINE":
          bonuses.iron += building.level * 3;
          break;
        case "FARM":
          bonuses.food += building.level * 6;
          break;
      }
    }

    const baseProduction = {
      wood: 10,
      stone: 8,
      iron: 5,
      gold: 2,
      food: 15,
    };

    await prisma.village.update({
      where: { id: villageId },
      data: {
        woodProduction: baseProduction.wood + bonuses.wood,
        stoneProduction: baseProduction.stone + bonuses.stone,
        ironProduction: baseProduction.iron + bonuses.iron,
        goldProduction: baseProduction.gold + bonuses.gold,
        foodProduction: baseProduction.food + bonuses.food,
      },
    });
  }
}

async function test() {
  try {
    const demoPlayer = await prisma.player.findFirst({ where: { playerName: 'demo' } });
    if (demoPlayer) {
      console.log('Testing ensurePlayerHasVillage for demo player...');
      const village = await ensurePlayerHasVillage(demoPlayer.id);
      console.log('Result:', village ? 'Success' : 'Failed');
    }
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
