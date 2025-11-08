const { PrismaClient } = require('@prisma/client');
const { CombatService } = require('./lib/game-services/combat-service.ts');

const prisma = new PrismaClient();

async function testCombatSystem() {
  console.log('⚔️ Testing Combat System (Raid vs Conquest)...\n');

  try {
    // Get test data
    const villages = await prisma.village.findMany({ take: 2 });
    if (villages.length < 2) {
      console.log('❌ Need at least 2 villages for combat testing');
      return;
    }

    const [attackerVillage, defenderVillage] = villages;

    // Get troops for both villages
    const attackerTroops = await prisma.troop.findMany({
      where: { villageId: attackerVillage.id },
    });

    const defenderTroops = await prisma.troop.findMany({
      where: { villageId: defenderVillage.id },
    });

    if (attackerTroops.length === 0 || defenderTroops.length === 0) {
      console.log('❌ Both villages need troops for combat testing');
      return;
    }

    console.log(`🏘️ Testing combat between ${attackerVillage.name} and ${defenderVillage.name}`);

    // Get wall level
    const wallBuilding = await prisma.building.findFirst({
      where: { villageId: defenderVillage.id, type: 'WALL' },
    });
    const wallLevel = wallBuilding?.level || 0;

    // Prepare attacker troops data
    const attackerTroopData = attackerTroops.slice(0, 2).map(troop => ({
      id: troop.id,
      quantity: Math.min(50, troop.quantity),
      attack: troop.attack,
      type: troop.type,
    }));

    const defenderTroopData = defenderTroops.slice(0, 2).map(troop => ({
      id: troop.id,
      quantity: Math.min(50, troop.quantity),
      defense: troop.defense,
    }));

    // Calculate offense/defense
    const attackerOffense = CombatService.calculatePower(attackerTroops, 'attack');
    const defenderDefense = CombatService.calculatePower(defenderTroops, 'defense');

    console.log(`📊 Attacker offense: ${attackerOffense}, Defender defense: ${defenderDefense}`);

    // Test 1: Conquest Attack
    console.log('\n⚔️ Testing CONQUEST attack...');
    try {
      const conquestResult = await CombatService.resolveCombat(
        attackerOffense,
        defenderDefense,
        wallLevel,
        attackerTroopData,
        defenderTroopData,
        true, // hasSiege
        'CONQUEST'
      );

      console.log(`🏆 Conquest result: Attacker ${conquestResult.attackerWon ? 'won' : 'lost'}`);
      console.log(`💀 Attacker casualties: ${Object.values(conquestResult.attackerCasualties).reduce((a,b) => a+b, 0)}`);
      console.log(`💀 Defender casualties: ${Object.values(conquestResult.defenderCasualties).reduce((a,b) => a+b, 0)}`);
      console.log(`🏰 Wall damage: ${conquestResult.wallDamage || 0}`);

      // Test 2: Raid Attack
      console.log('\n🏴 Testing RAID attack...');
      const raidResult = await CombatService.resolveCombat(
        attackerOffense,
        defenderDefense,
        wallLevel,
        attackerTroopData,
        defenderTroopData,
        true, // hasSiege (should not matter for raids)
        'RAID'
      );

      console.log(`🏆 Raid result: Attacker ${raidResult.attackerWon ? 'won' : 'lost'}`);
      console.log(`💀 Attacker casualties: ${Object.values(raidResult.attackerCasualties).reduce((a,b) => a+b, 0)}`);
      console.log(`💀 Defender casualties: ${Object.values(raidResult.defenderCasualties).reduce((a,b) => a+b, 0)}`);
      console.log(`🏰 Wall damage: ${raidResult.wallDamage || 0}`);

      // Compare results
      const conquestAttackerCasualties = Object.values(conquestResult.attackerCasualties).reduce((a,b) => a+b, 0);
      const raidAttackerCasualties = Object.values(raidResult.attackerCasualties).reduce((a,b) => a+b, 0);

      console.log('\n📈 Comparison:');
      console.log(`Conquest attacker casualties: ${conquestAttackerCasualties}`);
      console.log(`Raid attacker casualties: ${raidAttackerCasualties}`);
      console.log(`Wall damage in conquest: ${conquestResult.wallDamage || 0}`);
      console.log(`Wall damage in raid: ${raidResult.wallDamage || 0}`);

      if (raidAttackerCasualties <= conquestAttackerCasualties) {
        console.log('✅ Raid has lower or equal attacker casualties (as expected)');
      } else {
        console.log('❌ Raid has higher attacker casualties than conquest (unexpected)');
      }

      if ((raidResult.wallDamage || 0) === 0) {
        console.log('✅ Raid does no wall damage (as expected)');
      } else {
        console.log('❌ Raid does wall damage (unexpected)');
      }

    } catch (error) {
      console.error('❌ Combat test failed:', error);
    }

    // Test 3: Scouting
    console.log('\n👁️ Testing Scouting...');
    try {
      const attackerScouts = attackerTroopData.filter(t => t.type === 'BOWMAN').reduce((sum, t) => sum + t.quantity, 0);
      const defenderScouts = defenderTroopData.filter(t => t.type === 'BOWMAN').reduce((sum, t) => sum + t.quantity, 0);

      if (attackerScouts > 0) {
        const scoutingResult = await CombatService.resolveScouting(
          attackerScouts,
          defenderScouts,
          defenderVillage.id
        );

        console.log(`🔍 Scouting ${scoutingResult.success ? 'successful' : 'failed'}`);
        if (scoutingResult.success) {
          console.log(`📋 Revealed ${scoutingResult.units?.length || 0} troop types`);
          console.log(`🏗️ Revealed ${scoutingResult.buildings?.length || 0} buildings`);
        }
      } else {
        console.log('ℹ️ No scouts available for scouting test');
      }
    } catch (error) {
      console.error('❌ Scouting test failed:', error);
    }

    console.log('\n🎉 Combat system tests completed!');

  } catch (error) {
    console.error('❌ Error setting up combat tests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testCombatSystem();
