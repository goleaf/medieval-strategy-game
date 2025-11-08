// Simple test for CrannyService functionality
// Run with: node test-cranny.js

// Mock the prisma client for testing
const mockPrisma = {
  village: {
    findUnique: async ({ where, include }) => {
      // Mock village data
      if (where.id === 'test-village-id') {
        return {
          id: 'test-village-id',
          wood: 1000,
          stone: 800,
          iron: 600,
          gold: 400,
          food: 1200,
          player: {
            tribe: {
              name: 'GAULS' // Test Gaul bonus
            }
          },
          buildings: [
            { id: 'cranny1', type: 'CRANNY', level: 1 },
            { id: 'cranny2', type: 'CRANNY', level: 3 },
          ]
        }
      }
      return null
    }
  }
}

// Mock the CrannyService
class CrannyService {
  static calculateCrannyCapacity(level) {
    if (level <= 0) return 0
    return 200 + (level - 1) * 200
  }

  static async calculateTotalProtection(villageId, attackerTribe) {
    const village = await mockPrisma.village.findUnique({
      where: { id: villageId },
      include: {
        buildings: { where: { type: 'CRANNY' } },
        player: { include: { tribe: true } }
      }
    })

    if (!village) {
      return { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }
    }

    const crannies = village.buildings.filter(b => b.type === 'CRANNY')
    const defenderTribe = village.player.tribe?.name

    let totalCapacity = 0

    for (const cranny of crannies) {
      let capacity = this.calculateCrannyCapacity(cranny.level)

      // Gaul bonus: 1.5x capacity
      if (defenderTribe === 'GAULS') {
        capacity = Math.floor(capacity * 1.5)
      }

      // Teuton raid bonus: reduce enemy cranny effectiveness by 80% when hero joins raid
      if (attackerTribe === 'TEUTONS') {
        capacity = Math.floor(capacity * 0.2) // 80% reduction
      }

      totalCapacity += capacity
    }

    // Protection is applied equally to all resource types
    return {
      wood: totalCapacity,
      stone: totalCapacity,
      iron: totalCapacity,
      gold: totalCapacity,
      food: totalCapacity,
    }
  }

  static calculateEffectiveLoot(defenderStorage, crannyProtection) {
    return {
      wood: Math.max(0, defenderStorage.wood - crannyProtection.wood),
      stone: Math.max(0, defenderStorage.stone - crannyProtection.stone),
      iron: Math.max(0, defenderStorage.iron - crannyProtection.iron),
      gold: Math.max(0, defenderStorage.gold - crannyProtection.gold),
      food: Math.max(0, defenderStorage.food - crannyProtection.food),
    }
  }
}

// Test functions
async function testCrannyCapacity() {
  console.log('🧪 Testing Cranny Capacity Calculation...')

  const testCases = [
    { level: 1, expected: 200 },
    { level: 2, expected: 400 },
    { level: 3, expected: 600 },
    { level: 5, expected: 1000 },
    { level: 10, expected: 2000 },
  ]

  for (const testCase of testCases) {
    const result = CrannyService.calculateCrannyCapacity(testCase.level)
    if (result === testCase.expected) {
      console.log(`✅ Level ${testCase.level}: ${result} capacity`)
    } else {
      console.log(`❌ Level ${testCase.level}: Expected ${testCase.expected}, got ${result}`)
    }
  }
}

async function testTotalProtection() {
  console.log('\n🧪 Testing Total Protection Calculation...')

  // Test with Gaul bonus
  const protection = await CrannyService.calculateTotalProtection('test-village-id')
  const cranny1Capacity = Math.floor(200 * 1.5) // Level 1 with Gaul bonus: 300
  const cranny2Capacity = Math.floor(600 * 1.5) // Level 3 with Gaul bonus: 900
  const expectedTotal = cranny1Capacity + cranny2Capacity // 1200

  console.log(`Gaul village protection: ${protection.wood}`)
  console.log(`Expected: ${expectedTotal}`)
  console.log(`Breakdown: Cranny1 (${200} * 1.5 = ${cranny1Capacity}) + Cranny2 (${600} * 1.5 = ${cranny2Capacity}) = ${expectedTotal}`)

  if (protection.wood === expectedTotal) {
    console.log('✅ Gaul bonus calculation correct')
  } else {
    console.log('❌ Gaul bonus calculation incorrect')
  }

  // Test with Teuton attacker
  const protectionVsTeuton = await CrannyService.calculateTotalProtection('test-village-id', 'TEUTONS')
  const expectedVsTeuton = Math.floor(expectedTotal * 0.2) // 80% reduction: 1200 * 0.2 = 240

  console.log(`Protection vs Teuton attacker: ${protectionVsTeuton.wood}`)
  console.log(`Expected: ${expectedVsTeuton}`)

  if (protectionVsTeuton.wood === expectedVsTeuton) {
    console.log('✅ Teuton raid bonus calculation correct')
  } else {
    console.log('❌ Teuton raid bonus calculation incorrect')
  }
}

async function testLootCalculation() {
  console.log('\n🧪 Testing Loot Calculation...')

  const defenderStorage = { wood: 1000, stone: 800, iron: 600, gold: 400, food: 1200 }
  const crannyProtection = { wood: 400, stone: 400, iron: 400, gold: 400, food: 400 }

  const effectiveLoot = CrannyService.calculateEffectiveLoot(defenderStorage, crannyProtection)

  const expected = {
    wood: 1000 - 400, // 600
    stone: 800 - 400, // 400
    iron: 600 - 400,  // 200
    gold: 400 - 400,  // 0
    food: 1200 - 400, // 800
  }

  console.log('Effective lootable resources:', effectiveLoot)
  console.log('Expected:', expected)

  const isCorrect = Object.keys(expected).every(
    key => effectiveLoot[key] === expected[key]
  )

  if (isCorrect) {
    console.log('✅ Loot calculation correct')
  } else {
    console.log('❌ Loot calculation incorrect')
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Running Cranny System Tests\n')

  await testCrannyCapacity()
  await testTotalProtection()
  await testLootCalculation()

  console.log('\n✨ Cranny system tests completed!')
}

// Run the tests
runTests().catch(console.error)
