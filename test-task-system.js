#!/usr/bin/env node

// Simple test script for the task system functionality
// This tests the core logic without database dependencies

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Quest System Blueprint Catalogue');
console.log('==========================================');

try {
  const servicePath = path.join(__dirname, 'lib/game-services/task-service.ts');
  const serviceSource = fs.readFileSync(servicePath, 'utf-8');

  const keyMatches = [...serviceSource.matchAll(/key:\s+"([A-Z0-9_]+)"/g)];
  const paneMatches = [...serviceSource.matchAll(/pane:\s+"(MAIN|TRIBE|MENTOR|EVENT)"/g)];

  console.log(`\n📋 Loaded ${keyMatches.length} quest blueprints from task-service.ts`);

  const panes = [...new Set(paneMatches.map((match) => match[1]))];
  console.log(`✅ Panes covered: ${panes.join(', ')}`);

  const mainQuestCount = paneMatches.filter((match) => match[1] === 'MAIN').length;
  console.log(`🏗️ Main quests defined: ${mainQuestCount}`);

  const refundBlueprints = [...serviceSource.matchAll(/metadata:\s+\{\s*buildingType:\s+"([A-Z_]+)"/g)];
  const hasHqQuest = refundBlueprints.some((match) => match[1] === 'HEADQUARTER');
  console.log(`🔁 Headquarters refund blueprint present: ${hasHqQuest ? 'yes' : 'no'}`);

  console.log('\n💡 Quest blueprints seeded. Database-backed tests live in API routes.');

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
}

