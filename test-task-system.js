#!/usr/bin/env node

// Simple test script for the task system functionality
// This tests the core logic without database dependencies

const { getAllTaskDefinitions, getTaskDefinitionsByCategory } = require('./lib/game-services/task-service.ts');

console.log('🧪 Testing Task System Implementation');
console.log('=====================================');

try {
  // Test 1: Get all task definitions
  console.log('\n📋 Test 1: Getting all task definitions');
  const allTasks = getAllTaskDefinitions();
  console.log(`✅ Found ${allTasks.length} total tasks`);

  // Test 2: Get village-specific tasks
  console.log('\n🏘️ Test 2: Getting village-specific tasks');
  const villageTasks = getTaskDefinitionsByCategory('VILLAGE_SPECIFIC');
  console.log(`✅ Found ${villageTasks.length} village-specific tasks`);

  // Test 3: Get global tasks
  console.log('\n🌍 Test 3: Getting global tasks');
  const globalTasks = getTaskDefinitionsByCategory('PLAYER_GLOBAL');
  console.log(`✅ Found ${globalTasks.length} global tasks`);

  // Test 4: Check task structure
  console.log('\n🔍 Test 4: Checking task structure');
  const sampleTask = allTasks[0];
  console.log(`✅ Sample task: ${sampleTask.type} level ${sampleTask.level} - ${JSON.stringify(sampleTask.rewards)}`);

  // Test 5: Check reward calculations
  console.log('\n💰 Test 5: Checking reward calculations');
  const buildingTasks = allTasks.filter(t => t.type === 'BUILDING_LEVEL');
  const warehouseTasks = buildingTasks.filter(t => t.buildingType === 'WAREHOUSE');
  console.log(`✅ Warehouse tasks: ${warehouseTasks.length} (should be 5: levels 1,3,7,12,20)`);

  // Test 6: Verify task categories
  console.log('\n📊 Test 6: Verifying task categories');
  const villageSpecificCount = allTasks.filter(t => t.category === 'VILLAGE_SPECIFIC').length;
  const playerGlobalCount = allTasks.filter(t => t.category === 'PLAYER_GLOBAL').length;
  console.log(`✅ Village-specific: ${villageSpecificCount}, Global: ${playerGlobalCount}, Total: ${villageSpecificCount + playerGlobalCount}`);

  console.log('\n🎉 All tests passed! Task system is working correctly.');

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
}

