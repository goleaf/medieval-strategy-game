const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testVillageCreation() {
  try {
    const demoPlayer = await prisma.player.findFirst({ where: { playerName: 'demo' } });
    console.log('Demo player:', demoPlayer?.id);

    if (demoPlayer) {
      // Check existing villages
      const existingVillages = await prisma.village.findMany({ where: { playerId: demoPlayer.id } });
      console.log('Existing villages for demo:', existingVillages.length);

      if (existingVillages.length === 0) {
        // Try to create a village manually
        const continents = await prisma.continent.findMany();
        const randomContinent = continents[0];
        console.log('Using continent:', randomContinent.id);

        const position = { x: randomContinent.x + 10, y: randomContinent.y + 10 };
        console.log('Position:', position);

        const village = await prisma.village.create({
          data: {
            playerId: demoPlayer.id,
            continentId: randomContinent.id,
            name: 'Test Village',
            x: position.x,
            y: position.y,
            isCapital: true
          }
        });
        console.log('Village created:', village.id);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testVillageCreation();
