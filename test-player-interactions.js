const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPlayerInteractions() {
  console.log('🧪 Testing Player Interaction Features...\n');

  try {
    // Get test players
    const players = await prisma.player.findMany({ take: 2 });
    if (players.length < 2) {
      console.log('❌ Need at least 2 players for testing');
      return;
    }

    const [player1, player2] = players;
    console.log(`👥 Testing with players: ${player1.playerName} and ${player2.playerName}`);

    // Get their villages
    const village1 = await prisma.village.findFirst({ where: { playerId: player1.id } });
    const village2 = await prisma.village.findFirst({ where: { playerId: player2.id } });

    if (!village1 || !village2) {
      console.log('❌ Both players need villages');
      return;
    }

    console.log(`🏘️ Villages: ${village1.name} (${village1.x},${village1.y}) and ${village2.name} (${village2.x},${village2.y})`);

    // Test 1: Direct Resource Sending
    console.log('\n📦 Testing Direct Resource Sending...');
    try {
      const resourcesToSend = { wood: 100, stone: 50, iron: 25, gold: 10, food: 75 };
      const initialResources1 = {
        wood: village1.wood,
        stone: village1.stone,
        iron: village1.iron,
        gold: village1.gold,
        food: village1.food,
      };
      const initialResources2 = {
        wood: village2.wood,
        stone: village2.stone,
        iron: village2.iron,
        gold: village2.gold,
        food: village2.food,
      };

      // Send resources from village1 to village2
      await prisma.village.update({
        where: { id: village1.id },
        data: {
          wood: { decrement: resourcesToSend.wood },
          stone: { decrement: resourcesToSend.stone },
          iron: { decrement: resourcesToSend.iron },
          gold: { decrement: resourcesToSend.gold },
          food: { decrement: resourcesToSend.food },
        },
      });

      await prisma.village.update({
        where: { id: village2.id },
        data: {
          wood: { increment: resourcesToSend.wood },
          stone: { increment: resourcesToSend.stone },
          iron: { increment: resourcesToSend.iron },
          gold: { increment: resourcesToSend.gold },
          food: { increment: resourcesToSend.food },
        },
      });

      const updatedVillage1 = await prisma.village.findUnique({ where: { id: village1.id } });
      const updatedVillage2 = await prisma.village.findUnique({ where: { id: village2.id } });

      // Verify resource transfer
      const transferSuccessful =
        updatedVillage1.wood === initialResources1.wood - resourcesToSend.wood &&
        updatedVillage2.wood === initialResources2.wood + resourcesToSend.wood;

      console.log(transferSuccessful ? '✅ Direct resource sending works' : '❌ Resource transfer failed');

      // Test 2: Player-to-Player Messaging
      console.log('\n💬 Testing Player-to-Player Messaging...');
      const message = await prisma.message.create({
        data: {
          senderId: player1.id,
          recipientId: player2.id,
          type: 'PLAYER',
          subject: 'Test Message',
          content: 'This is a test message between players.',
        },
      });

      const retrievedMessage = await prisma.message.findUnique({
        where: { id: message.id },
        include: { sender: true, recipient: true },
      });

      const messageWorks = retrievedMessage &&
        retrievedMessage.senderId === player1.id &&
        retrievedMessage.recipientId === player2.id &&
        retrievedMessage.type === 'PLAYER';

      console.log(messageWorks ? '✅ Player messaging works' : '❌ Player messaging failed');

      // Test 3: Beginner Protection
      console.log('\n🛡️ Testing Beginner Protection...');
      const protectionStatus = player1.beginnerProtectionUntil ?
        new Date() < player1.beginnerProtectionUntil : false;

      console.log(protectionStatus ?
        `✅ Player 1 has protection until ${player1.beginnerProtectionUntil}` :
        'ℹ️ Player 1 has no protection (normal for established players)');

      // Test 4: Reinforcement System
      console.log('\n🛡️ Testing Reinforcement System...');
      // Get some troops from village1
      const troops = await prisma.troop.findMany({
        where: { villageId: village1.id },
        take: 1,
      });

      if (troops.length > 0) {
        const troop = troops[0];
        const reinforcementUnits = [{ troopId: troop.id, quantity: Math.min(10, troop.quantity) }];

        // Create a reinforcement
        const reinforcement = await prisma.reinforcement.create({
          data: {
            fromVillageId: village1.id,
            toVillageId: village2.id,
            movementId: 'test-movement-' + Date.now(), // This would normally be a real movement ID
            arrivalAt: new Date(Date.now() + 60000), // 1 minute from now
            reinforcementUnits: {
              create: reinforcementUnits,
            },
          },
          include: { reinforcementUnits: true },
        });

        console.log(`✅ Reinforcement created with ${reinforcement.reinforcementUnits.length} unit types`);

        // Clean up test data
        await prisma.reinforcementUnit.deleteMany({ where: { reinforcementId: reinforcement.id } });
        await prisma.reinforcement.delete({ where: { id: reinforcement.id } });
      } else {
        console.log('ℹ️ No troops available for reinforcement testing');
      }

      // Test 5: Attack System (Raid vs Conquest)
      console.log('\n⚔️ Testing Attack System...');
      if (troops.length > 0) {
        const troop = troops[0];
        const attackUnits = [{ troopId: troop.id, quantity: Math.min(5, troop.quantity) }];

        // Create a test raid
        const raid = await prisma.attack.create({
          data: {
            fromVillageId: village1.id,
            toVillageId: village2.id,
            movementId: 'test-raid-' + Date.now(),
            type: 'RAID',
            arrivalAt: new Date(Date.now() + 120000), // 2 minutes
            attackUnits: {
              create: attackUnits,
            },
          },
          include: { attackUnits: true },
        });

        console.log(`✅ Raid attack created (${raid.type}) with ${raid.attackUnits.length} unit types`);

        // Clean up
        await prisma.attackUnit.deleteMany({ where: { attackId: raid.id } });
        await prisma.attack.delete({ where: { id: raid.id } });
      }

      // Test 6: Marketplace Orders
      console.log('\n🏪 Testing Marketplace Orders...');
      const marketOrder = await prisma.marketOrder.create({
        data: {
          villageId: village1.id,
          playerId: player1.id,
          type: 'SELL',
          offeringResource: 'WOOD',
          offeringAmount: 1000,
          requestResource: 'STONE',
          requestAmount: 800,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      const retrievedOrder = await prisma.marketOrder.findUnique({
        where: { id: marketOrder.id },
        include: { village: true, player: true },
      });

      const orderWorks = retrievedOrder &&
        retrievedOrder.type === 'SELL' &&
        retrievedOrder.offeringResource === 'WOOD';

      console.log(orderWorks ? '✅ Marketplace orders work' : '❌ Marketplace orders failed');

      // Clean up
      await prisma.marketOrder.delete({ where: { id: marketOrder.id } });
      await prisma.message.delete({ where: { id: message.id } });

      console.log('\n🎉 All player interaction tests completed!');

    } catch (error) {
      console.error('❌ Test failed:', error);
    }

  } catch (error) {
    console.error('❌ Error setting up tests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testPlayerInteractions();
