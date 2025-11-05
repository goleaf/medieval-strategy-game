// Simple test script to verify Huns implementation
const { TroopService } = require('./lib/game-services/troop-service.ts');
const { TribeService } = require('./lib/game-services/tribe-service.ts');

console.log('Testing Huns troop stats...');

// Test Huns troop stats
try {
  const steppeArcherStats = TroopService.getTroopStats('STEPPE_ARCHER');
  console.log('Steppe Archer stats:', steppeArcherStats);

  const hunWarriorStats = TroopService.getTroopStats('HUN_WARRIOR');
  console.log('Hun Warrior stats:', hunWarriorStats);

  const logadesStats = TroopService.getTroopStats('LOGADES');
  console.log('Logades stats:', logadesStats);

  console.log('✅ Huns troop stats loaded successfully');
} catch (error) {
  console.error('❌ Error loading Huns troop stats:', error);
}

// Test tribe service
try {
  const hunsTroops = TribeService.getTribeTroops('HUNS');
  console.log('Huns troops:', hunsTroops);

  const hunsData = TribeService.getTribeData('HUNS');
  console.log('Huns data:', hunsData.name);

  console.log('✅ Huns tribe service working');
} catch (error) {
  console.error('❌ Error with Huns tribe service:', error);
}

console.log('Huns implementation test completed');

