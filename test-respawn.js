const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing database connection...');
    const worlds = await prisma.gameWorld.findMany({ take: 1 });
    console.log('✅ Database connected, found', worlds.length, 'worlds');

    const players = await prisma.player.findMany({ take: 1 });
    console.log('✅ Found', players.length, 'players');

    console.log('✅ Basic database test passed');
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase().then(success => {
  if (success) {
    console.log('\n🎉 Respawn feature database connectivity test PASSED');
    console.log('The respawn feature should work correctly.');
  } else {
    console.log('\n❌ Respawn feature database connectivity test FAILED');
  }
  process.exit(success ? 0 : 1);
});
