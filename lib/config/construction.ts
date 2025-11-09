export type QueuePreset = {
  maxWaiting: number
  parallelFieldSlots: number
  parallelInnerSlots: number
}

export type BuildingLevelDefinition = {
  level: number
  cost: {
    wood: number
    clay: number
    iron: number
    crop: number
  }
  buildTimeSeconds: number
  cpPerHour: number
  effects?: Record<string, number | string | boolean>
}

export type BuildingBlueprintDefinition = {
  key: string
  displayName: string
  category: "inner" | "field"
  maxLevel: number
  uniquePerVillage?: boolean
  exclusivityGroup?: string
  prerequisites: Record<string, number>
  effects?: Record<string, unknown>
  levels: BuildingLevelDefinition[]
}

export type ConstructionConfig = {
  version: string
  defaults: {
    serverSpeed: number
    resourceDeductionPolicy: "on_queue" | "on_start"
    cancelRefundRates: Record<"waiting" | "building", number>
    premiumFinishNowSeconds: number
    snapshotModifiersOnStart: boolean
    timestamps: "utc"
  }
  queuePresets: Record<string, QueuePreset>
  mainBuildingReduction: Array<{ level: number; multiplier: number }>
  buildingBlueprints: Record<string, BuildingBlueprintDefinition>
  culturePoints: {
    tickPolicy: "lazy" | "continuous"
    thresholds: Array<{ villageNumber: number; cpRequired: number }>
  }
}

// Helper constants ensure every generated level set shares the same baseline length.
const DEFAULT_LEVEL_COUNT = 30

type LevelEffectFactory = (level: number) => Record<string, number | string | boolean> | undefined

/**
 * Build a progressive set of level definitions using simple exponential growth curves.
 * This keeps the data compact while still matching the declining efficiency described in the spec.
 */
function createScaledLevels(options: {
  baseCost: { wood: number; clay: number; iron: number; crop: number }
  costGrowth: number
  baseTimeSeconds: number
  timeGrowth: number
  baseCpPerHour: number
  cpGrowth: number
  levels?: number
  effectFactory?: LevelEffectFactory
}): BuildingLevelDefinition[] {
  const {
    baseCost,
    costGrowth,
    baseTimeSeconds,
    timeGrowth,
    baseCpPerHour,
    cpGrowth,
    levels = DEFAULT_LEVEL_COUNT,
    effectFactory,
  } = options

  const levelEntries: BuildingLevelDefinition[] = []

  for (let level = 1; level <= levels; level += 1) {
    const costFactor = costGrowth ** (level - 1)
    const timeFactor = timeGrowth ** (level - 1)
    const cpFactor = cpGrowth ** (level - 1)

    const entry: BuildingLevelDefinition = {
      level,
      cost: {
        wood: Math.round(baseCost.wood * costFactor),
        clay: Math.round(baseCost.clay * costFactor),
        iron: Math.round(baseCost.iron * costFactor),
        crop: Math.round(baseCost.crop * costFactor),
      },
      buildTimeSeconds: Math.round(baseTimeSeconds * timeFactor),
      cpPerHour: parseFloat((baseCpPerHour * cpFactor).toFixed(2)),
    }

    if (effectFactory) {
      const effects = effectFactory(level)
      if (effects && Object.keys(effects).length > 0) {
        entry.effects = effects
      }
    }

    levelEntries.push(entry)
  }

  return levelEntries
}

/**
 * Generate a factory for training buildings where each level shaves a fixed percentage from unit queues.
 */
function createTrainingSpeedFactory(options: {
  base: number
  decrement: number
  floor: number
}): LevelEffectFactory {
  const { base, decrement, floor } = options
  return (level) => ({
    trainingSpeedMultiplier: parseFloat(Math.max(floor, base - decrement * (level - 1)).toFixed(2)),
  })
}

export const CONSTRUCTION_CONFIG: ConstructionConfig = {
  version: "2024-06-07",
  defaults: {
    serverSpeed: 1,
    resourceDeductionPolicy: "on_start",
    cancelRefundRates: {
      waiting: 1,
      building: 0.5,
    },
    premiumFinishNowSeconds: 300,
    snapshotModifiersOnStart: true,
    timestamps: "utc",
  },
  queuePresets: {
    free: {
      maxWaiting: 0,
      parallelFieldSlots: 0,
      parallelInnerSlots: 0,
    },
    roman_like: {
      maxWaiting: 1,
      parallelFieldSlots: 1,
      parallelInnerSlots: 1,
    },
    premium_plus: {
      maxWaiting: 3,
      parallelFieldSlots: 1,
      parallelInnerSlots: 1,
    },
  },
  mainBuildingReduction: [
    { level: 1, multiplier: 1.0 },
    { level: 2, multiplier: 0.99 },
    { level: 3, multiplier: 0.95 },
    { level: 4, multiplier: 0.93 },
    { level: 5, multiplier: 0.9 },
    { level: 6, multiplier: 0.88 },
    { level: 7, multiplier: 0.85 },
    { level: 8, multiplier: 0.83 },
    { level: 9, multiplier: 0.81 },
    { level: 10, multiplier: 0.8 },
    { level: 11, multiplier: 0.79 },
    { level: 12, multiplier: 0.78 },
    { level: 13, multiplier: 0.77 },
    { level: 14, multiplier: 0.76 },
    { level: 15, multiplier: 0.75 },
    { level: 16, multiplier: 0.74 },
    { level: 17, multiplier: 0.73 },
    { level: 18, multiplier: 0.72 },
    { level: 19, multiplier: 0.71 },
    { level: 20, multiplier: 0.7 },
  ],
  buildingBlueprints: {
    main_building: {
      key: "main_building",
      displayName: "Main Building",
      category: "inner",
      maxLevel: 20,
      prerequisites: {},
      effects: { timeReductionKey: "mainBuildingReduction" },
      levels: [
        { level: 1, cost: { wood: 70, clay: 40, iron: 60, crop: 20 }, buildTimeSeconds: 900, cpPerHour: 2, effects: { hitpoints: 1450 } },
        { level: 2, cost: { wood: 90, clay: 50, iron: 75, crop: 25 }, buildTimeSeconds: 1300, cpPerHour: 2.4, effects: { hitpoints: 1600 } },
        { level: 3, cost: { wood: 115, clay: 65, iron: 95, crop: 30 }, buildTimeSeconds: 1680, cpPerHour: 2.8, effects: { hitpoints: 1750 } },
        { level: 4, cost: { wood: 150, clay: 85, iron: 125, crop: 40 }, buildTimeSeconds: 2160, cpPerHour: 3.3, effects: { hitpoints: 1900 } },
        { level: 5, cost: { wood: 195, clay: 105, iron: 160, crop: 50 }, buildTimeSeconds: 2700, cpPerHour: 3.9, effects: { hitpoints: 2100 } },
        { level: 6, cost: { wood: 250, clay: 135, iron: 205, crop: 65 }, buildTimeSeconds: 3360, cpPerHour: 4.6, effects: { hitpoints: 2300 } },
        { level: 7, cost: { wood: 320, clay: 170, iron: 260, crop: 80 }, buildTimeSeconds: 4080, cpPerHour: 5.4, effects: { hitpoints: 2550 } },
        { level: 8, cost: { wood: 410, clay: 215, iron: 335, crop: 105 }, buildTimeSeconds: 4980, cpPerHour: 6.4, effects: { hitpoints: 2800 } },
        { level: 9, cost: { wood: 525, clay: 270, iron: 430, crop: 135 }, buildTimeSeconds: 6000, cpPerHour: 7.6, effects: { hitpoints: 3100 } },
        { level: 10, cost: { wood: 675, clay: 350, iron: 550, crop: 175 }, buildTimeSeconds: 7200, cpPerHour: 9, effects: { hitpoints: 3400 } },
      ],
    },
    barracks: {
      key: "barracks",
      displayName: "Barracks",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 3 },
      effects: { unlocks: ["basic_infantry"] },
      levels: [
        { level: 1, cost: { wood: 210, clay: 140, iron: 260, crop: 120 }, buildTimeSeconds: 1300, cpPerHour: 2, effects: { trainingSpeedMultiplier: 1 } },
        { level: 2, cost: { wood: 270, clay: 180, iron: 335, crop: 155 }, buildTimeSeconds: 1740, cpPerHour: 2.6, effects: { trainingSpeedMultiplier: 0.96 } },
        { level: 3, cost: { wood: 345, clay: 230, iron: 430, crop: 195 }, buildTimeSeconds: 2220, cpPerHour: 3.2, effects: { trainingSpeedMultiplier: 0.93 } },
        { level: 4, cost: { wood: 440, clay: 295, iron: 550, crop: 250 }, buildTimeSeconds: 2820, cpPerHour: 3.9, effects: { trainingSpeedMultiplier: 0.9 } },
        { level: 5, cost: { wood: 565, clay: 375, iron: 705, crop: 320 }, buildTimeSeconds: 3540, cpPerHour: 4.8, effects: { trainingSpeedMultiplier: 0.87 } },
        { level: 6, cost: { wood: 720, clay: 485, iron: 900, crop: 410 }, buildTimeSeconds: 4440, cpPerHour: 5.8, effects: { trainingSpeedMultiplier: 0.84 } },
        { level: 7, cost: { wood: 920, clay: 620, iron: 1155, crop: 525 }, buildTimeSeconds: 5580, cpPerHour: 6.9, effects: { trainingSpeedMultiplier: 0.81 } },
        { level: 8, cost: { wood: 1180, clay: 795, iron: 1480, crop: 675 }, buildTimeSeconds: 7020, cpPerHour: 8.2, effects: { trainingSpeedMultiplier: 0.78 } },
        { level: 9, cost: { wood: 1515, clay: 1015, iron: 1905, crop: 865 }, buildTimeSeconds: 8820, cpPerHour: 9.6, effects: { trainingSpeedMultiplier: 0.75 } },
        { level: 10, cost: { wood: 1945, clay: 1295, iron: 2450, crop: 1105 }, buildTimeSeconds: 11100, cpPerHour: 11, effects: { trainingSpeedMultiplier: 0.72 } },
      ],
    },
    warehouse: {
      key: "warehouse",
      displayName: "Warehouse",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 1 },
      effects: { capacityType: "resources" },
      levels: [
        { level: 1, cost: { wood: 130, clay: 160, iron: 90, crop: 40 }, buildTimeSeconds: 780, cpPerHour: 1.5, effects: { capacity: 1200 } },
        { level: 2, cost: { wood: 165, clay: 205, iron: 115, crop: 50 }, buildTimeSeconds: 1140, cpPerHour: 1.8, effects: { capacity: 1500 } },
        { level: 3, cost: { wood: 210, clay: 260, iron: 145, crop: 65 }, buildTimeSeconds: 1500, cpPerHour: 2.1, effects: { capacity: 1875 } },
        { level: 4, cost: { wood: 270, clay: 335, iron: 185, crop: 80 }, buildTimeSeconds: 1980, cpPerHour: 2.4, effects: { capacity: 2340 } },
        { level: 5, cost: { wood: 345, clay: 430, iron: 235, crop: 105 }, buildTimeSeconds: 2520, cpPerHour: 2.8, effects: { capacity: 2925 } },
        { level: 6, cost: { wood: 440, clay: 550, iron: 300, crop: 130 }, buildTimeSeconds: 3180, cpPerHour: 3.2, effects: { capacity: 3650 } },
        { level: 7, cost: { wood: 565, clay: 705, iron: 380, crop: 165 }, buildTimeSeconds: 4020, cpPerHour: 3.6, effects: { capacity: 4560 } },
        { level: 8, cost: { wood: 720, clay: 900, iron: 485, crop: 210 }, buildTimeSeconds: 5040, cpPerHour: 4.1, effects: { capacity: 5700 } },
        { level: 9, cost: { wood: 920, clay: 1155, iron: 620, crop: 265 }, buildTimeSeconds: 6360, cpPerHour: 4.6, effects: { capacity: 7125 } },
        { level: 10, cost: { wood: 1180, clay: 1480, iron: 790, crop: 335 }, buildTimeSeconds: 8040, cpPerHour: 5.2, effects: { capacity: 8900 } },
      ],
    },
    granary: {
      key: "granary",
      displayName: "Granary",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 1 },
      effects: { capacityType: "crop" },
      levels: [
        { level: 1, cost: { wood: 80, clay: 70, iron: 120, crop: 50 }, buildTimeSeconds: 780, cpPerHour: 1.5, effects: { capacity: 1200 } },
        { level: 2, cost: { wood: 100, clay: 90, iron: 155, crop: 65 }, buildTimeSeconds: 1140, cpPerHour: 1.8, effects: { capacity: 1500 } },
        { level: 3, cost: { wood: 130, clay: 115, iron: 200, crop: 80 }, buildTimeSeconds: 1500, cpPerHour: 2.1, effects: { capacity: 1875 } },
        { level: 4, cost: { wood: 170, clay: 150, iron: 255, crop: 105 }, buildTimeSeconds: 1980, cpPerHour: 2.4, effects: { capacity: 2340 } },
        { level: 5, cost: { wood: 215, clay: 195, iron: 330, crop: 135 }, buildTimeSeconds: 2520, cpPerHour: 2.8, effects: { capacity: 2925 } },
        { level: 6, cost: { wood: 275, clay: 250, iron: 420, crop: 175 }, buildTimeSeconds: 3180, cpPerHour: 3.2, effects: { capacity: 3650 } },
        { level: 7, cost: { wood: 350, clay: 320, iron: 535, crop: 220 }, buildTimeSeconds: 4020, cpPerHour: 3.6, effects: { capacity: 4560 } },
        { level: 8, cost: { wood: 450, clay: 410, iron: 680, crop: 280 }, buildTimeSeconds: 5040, cpPerHour: 4.1, effects: { capacity: 5700 } },
        { level: 9, cost: { wood: 575, clay: 525, iron: 865, crop: 360 }, buildTimeSeconds: 6360, cpPerHour: 4.6, effects: { capacity: 7125 } },
        { level: 10, cost: { wood: 740, clay: 675, iron: 1100, crop: 460 }, buildTimeSeconds: 8040, cpPerHour: 5.2, effects: { capacity: 8900 } },
      ],
    },
    residence: {
      key: "residence",
      displayName: "Residence",
      category: "inner",
      maxLevel: 20,
      uniquePerVillage: true,
      exclusivityGroup: "royal_residence",
      prerequisites: { main_building: 5 },
      effects: { loyaltyCapBase: 100 },
      levels: [
        { level: 1, cost: { wood: 580, clay: 460, iron: 350, crop: 180 }, buildTimeSeconds: 2100, cpPerHour: 3, effects: { loyaltyCap: 125, settlerSlotsUnlocked: 0 } },
        { level: 2, cost: { wood: 740, clay: 590, iron: 450, crop: 230 }, buildTimeSeconds: 2520, cpPerHour: 3.6, effects: { loyaltyCap: 130, settlerSlotsUnlocked: 0 } },
        { level: 3, cost: { wood: 945, clay: 755, iron: 575, crop: 295 }, buildTimeSeconds: 3030, cpPerHour: 4.3, effects: { loyaltyCap: 135, settlerSlotsUnlocked: 0 } },
        { level: 4, cost: { wood: 1210, clay: 970, iron: 740, crop: 380 }, buildTimeSeconds: 3660, cpPerHour: 5.1, effects: { loyaltyCap: 140, settlerSlotsUnlocked: 0 } },
        { level: 5, cost: { wood: 1545, clay: 1240, iron: 950, crop: 490 }, buildTimeSeconds: 4440, cpPerHour: 6, effects: { loyaltyCap: 145, settlerSlotsUnlocked: 0 } },
        { level: 6, cost: { wood: 1980, clay: 1585, iron: 1220, crop: 630 }, buildTimeSeconds: 5400, cpPerHour: 7, effects: { loyaltyCap: 150, settlerSlotsUnlocked: 0 } },
        { level: 7, cost: { wood: 2535, clay: 2035, iron: 1570, crop: 810 }, buildTimeSeconds: 6600, cpPerHour: 8.1, effects: { loyaltyCap: 155, settlerSlotsUnlocked: 0 } },
        { level: 8, cost: { wood: 3245, clay: 2610, iron: 2015, crop: 1040 }, buildTimeSeconds: 8100, cpPerHour: 9.3, effects: { loyaltyCap: 160, settlerSlotsUnlocked: 0 } },
        { level: 9, cost: { wood: 4155, clay: 3345, iron: 2585, crop: 1335 }, buildTimeSeconds: 9900, cpPerHour: 10.6, effects: { loyaltyCap: 165, settlerSlotsUnlocked: 0 } },
        { level: 10, cost: { wood: 5315, clay: 4285, iron: 3315, crop: 1710 }, buildTimeSeconds: 12120, cpPerHour: 12, effects: { loyaltyCap: 170, settlerSlotsUnlocked: 1 } },
      ],
    },
    academy: {
      key: "academy",
      displayName: "Academy",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 20, smithy: 20, market: 10 },
      effects: { nobleTraining: true },
      levels: [
        { level: 1, cost: { wood: 360, clay: 330, iron: 280, crop: 120 }, buildTimeSeconds: 1980, cpPerHour: 3, effects: { nobleSlotsUnlocked: 1, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 2, cost: { wood: 460, clay: 420, iron: 360, crop: 155 }, buildTimeSeconds: 2520, cpPerHour: 3.8, effects: { nobleSlotsUnlocked: 1, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 3, cost: { wood: 590, clay: 535, iron: 460, crop: 195 }, buildTimeSeconds: 3180, cpPerHour: 4.2, effects: { nobleSlotsUnlocked: 2, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 4, cost: { wood: 755, clay: 690, iron: 590, crop: 250 }, buildTimeSeconds: 3960, cpPerHour: 4.9, effects: { nobleSlotsUnlocked: 2, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 5, cost: { wood: 975, clay: 890, iron: 755, crop: 320 }, buildTimeSeconds: 4920, cpPerHour: 5.7, effects: { nobleSlotsUnlocked: 2, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 6, cost: { wood: 1260, clay: 1145, iron: 965, crop: 410 }, buildTimeSeconds: 6120, cpPerHour: 6.6, effects: { nobleSlotsUnlocked: 3, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 7, cost: { wood: 1630, clay: 1470, iron: 1230, crop: 525 }, buildTimeSeconds: 7680, cpPerHour: 7.6, effects: { nobleSlotsUnlocked: 3, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 8, cost: { wood: 2110, clay: 1890, iron: 1570, crop: 675 }, buildTimeSeconds: 9660, cpPerHour: 8.8, effects: { nobleSlotsUnlocked: 3, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 9, cost: { wood: 2740, clay: 2435, iron: 2000, crop: 865 }, buildTimeSeconds: 12180, cpPerHour: 10.2, effects: { nobleSlotsUnlocked: 4, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
        { level: 10, cost: { wood: 3560, clay: 3130, iron: 2550, crop: 1105 }, buildTimeSeconds: 15360, cpPerHour: 11.8, effects: { nobleSlotsUnlocked: 4, loyaltyDropMin: 20, loyaltyDropMax: 35 } },
      ],
    },
    smithy: {
      key: "smithy",
      displayName: "Smithy",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 3, barracks: 1 },
      effects: { researchModel: "military" },
      levels: createScaledLevels({
        baseCost: { wood: 180, clay: 250, iron: 130, crop: 100 },
        costGrowth: 1.28,
        baseTimeSeconds: 1380,
        timeGrowth: 1.17,
        baseCpPerHour: 2.4,
        cpGrowth: 1.18,
        effectFactory: (level) => {
          // Smithy levels accelerate research while gating advanced unit unlocks.
          return {
            researchSpeedMultiplier: parseFloat(Math.max(0.5, 1 - 0.04 * (level - 1)).toFixed(2)),
            unlocksAdvancedUnits: level >= 3,
          }
        },
      }),
    },
    stable: {
      key: "stable",
      displayName: "Stable",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 5, smithy: 3 },
      effects: { unlocks: ["cavalry", "scout"] },
      levels: createScaledLevels({
        baseCost: { wood: 240, clay: 210, iron: 260, crop: 140 },
        costGrowth: 1.28,
        baseTimeSeconds: 1560,
        timeGrowth: 1.2,
        baseCpPerHour: 2.6,
        cpGrowth: 1.18,
        effectFactory: createTrainingSpeedFactory({ base: 1, decrement: 0.035, floor: 0.45 }),
      }),
    },
    workshop: {
      key: "workshop",
      displayName: "Workshop",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 5, smithy: 10, barracks: 5 },
      effects: { unlocks: ["siege"] },
      levels: createScaledLevels({
        baseCost: { wood: 460, clay: 510, iron: 600, crop: 320 },
        costGrowth: 1.28,
        baseTimeSeconds: 1980,
        timeGrowth: 1.22,
        baseCpPerHour: 3.2,
        cpGrowth: 1.18,
        effectFactory: createTrainingSpeedFactory({ base: 1, decrement: 0.04, floor: 0.4 }),
      }),
    },
    market: {
      key: "market",
      displayName: "Market",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 3, warehouse: 1 },
      effects: { unlocksTrading: true },
      levels: createScaledLevels({
        baseCost: { wood: 120, clay: 180, iron: 150, crop: 120 },
        costGrowth: 1.26,
        baseTimeSeconds: 1080,
        timeGrowth: 1.15,
        baseCpPerHour: 2.2,
        cpGrowth: 1.16,
        effectFactory: (level) => {
          // Merchants scale linearly; capacity reflects base world settings.
          return {
            merchants: 3 + (level - 1),
            merchantCapacity: 500,
          }
        },
      }),
    },
    rally_point: {
      key: "rally_point",
      displayName: "Rally Point",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 1 },
      effects: { unlocksCommandCenter: true },
      levels: createScaledLevels({
        baseCost: { wood: 110, clay: 160, iron: 90, crop: 70 },
        costGrowth: 1.24,
        baseTimeSeconds: 900,
        timeGrowth: 1.14,
        baseCpPerHour: 2,
        cpGrowth: 1.15,
        effectFactory: (level) => {
          // Higher levels expand mission throughput and extend cancel precision windows slightly.
          return {
            maxConcurrentCommands: 2 + level * 2,
            cancelWindowSeconds: 180 + level * 12,
          }
        },
      }),
    },
    wall: {
      key: "wall",
      displayName: "Wall",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 1 },
      effects: { defenseStructure: true },
      levels: createScaledLevels({
        baseCost: { wood: 120, clay: 200, iron: 90, crop: 50 },
        costGrowth: 1.27,
        baseTimeSeconds: 1020,
        timeGrowth: 1.18,
        baseCpPerHour: 2.2,
        cpGrowth: 1.16,
        effectFactory: (level) => ({
          defenseMultiplier: parseFloat((1 + 0.08 * level).toFixed(2)),
        }),
      }),
    },
    watchtower: {
      key: "watchtower",
      displayName: "Watchtower",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 5, wall: 1 },
      effects: { detectionStructure: true },
      levels: createScaledLevels({
        baseCost: { wood: 180, clay: 150, iron: 210, crop: 90 },
        costGrowth: 1.25,
        baseTimeSeconds: 960,
        timeGrowth: 1.17,
        baseCpPerHour: 2.4,
        cpGrowth: 1.16,
        effectFactory: (level) => {
          // Radius increases steadily while noble detection unlocks mid-tier.
          return {
            detectionRadius: 6 + level * 2,
            revealsNobles: level >= 5,
          }
        },
      }),
    },
    church: {
      key: "church",
      displayName: "Church",
      category: "inner",
      maxLevel: 3,
      uniquePerVillage: true,
      prerequisites: { main_building: 5, academy: 1 },
      effects: { providesFaith: true },
      levels: createScaledLevels({
        baseCost: { wood: 450, clay: 500, iron: 600, crop: 350 },
        costGrowth: 1.45,
        baseTimeSeconds: 3600,
        timeGrowth: 1.4,
        baseCpPerHour: 5,
        cpGrowth: 1.3,
        levels: 3,
        effectFactory: (level) => ({
          faithRadius: 8 + level * 4,
          faithStrength: 1,
        }),
      }),
    },
    farm: {
      key: "farm",
      displayName: "Farm",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 1 },
      effects: { populationStructure: true },
      levels: createScaledLevels({
        baseCost: { wood: 110, clay: 140, iron: 100, crop: 70 },
        costGrowth: 1.26,
        baseTimeSeconds: 960,
        timeGrowth: 1.15,
        baseCpPerHour: 1.8,
        cpGrowth: 1.14,
        effectFactory: (level) => ({
          populationCap: 100 + level * 50,
        }),
      }),
    },
    hiding_place: {
      key: "hiding_place",
      displayName: "Hiding Place",
      category: "inner",
      maxLevel: 20,
      prerequisites: { main_building: 1 },
      effects: { stashProtection: true },
      levels: createScaledLevels({
        baseCost: { wood: 40, clay: 50, iron: 30, crop: 10 },
        costGrowth: 1.32,
        baseTimeSeconds: 540,
        timeGrowth: 1.12,
        baseCpPerHour: 1.5,
        cpGrowth: 1.12,
        effectFactory: (level) => ({
          stashCapacity: Math.round(150 * 1.6 ** (level - 1)),
        }),
      }),
    },
    wood_field: {
      key: "wood_field",
      displayName: "Wood Field",
      category: "field",
      maxLevel: 20,
      prerequisites: {},
      effects: { resourceType: "wood" },
      levels: [
        { level: 1, cost: { wood: 40, clay: 100, iron: 50, crop: 60 }, buildTimeSeconds: 260, cpPerHour: 1, effects: { productionPerHour: 5 } },
        { level: 2, cost: { wood: 65, clay: 165, iron: 85, crop: 100 }, buildTimeSeconds: 360, cpPerHour: 1.2, effects: { productionPerHour: 9 } },
        { level: 3, cost: { wood: 110, clay: 280, iron: 145, crop: 165 }, buildTimeSeconds: 470, cpPerHour: 1.4, effects: { productionPerHour: 15 } },
        { level: 4, cost: { wood: 185, clay: 465, iron: 245, crop: 275 }, buildTimeSeconds: 620, cpPerHour: 1.6, effects: { productionPerHour: 23 } },
        { level: 5, cost: { wood: 310, clay: 780, iron: 410, crop: 465 }, buildTimeSeconds: 770, cpPerHour: 1.8, effects: { productionPerHour: 33 } },
        { level: 6, cost: { wood: 520, clay: 1300, iron: 685, crop: 780 }, buildTimeSeconds: 1000, cpPerHour: 2.1, effects: { productionPerHour: 46 } },
        { level: 7, cost: { wood: 870, clay: 2170, iron: 1145, crop: 1300 }, buildTimeSeconds: 1270, cpPerHour: 2.4, effects: { productionPerHour: 60 } },
        { level: 8, cost: { wood: 1450, clay: 3620, iron: 1925, crop: 2170 }, buildTimeSeconds: 1630, cpPerHour: 2.7, effects: { productionPerHour: 78 } },
        { level: 9, cost: { wood: 2420, clay: 6040, iron: 3230, crop: 3630 }, buildTimeSeconds: 1980, cpPerHour: 3, effects: { productionPerHour: 99 } },
        { level: 10, cost: { wood: 4040, clay: 10080, iron: 5480, crop: 6150 }, buildTimeSeconds: 2460, cpPerHour: 3.4, effects: { productionPerHour: 124 } },
      ],
    },
    clay_pit: {
      key: "clay_pit",
      displayName: "Clay Pit",
      category: "field",
      maxLevel: 20,
      prerequisites: {},
      effects: { resourceType: "clay" },
      levels: [
        { level: 1, cost: { wood: 80, clay: 40, iron: 80, crop: 50 }, buildTimeSeconds: 260, cpPerHour: 1, effects: { productionPerHour: 5 } },
        { level: 2, cost: { wood: 135, clay: 65, iron: 135, crop: 85 }, buildTimeSeconds: 360, cpPerHour: 1.2, effects: { productionPerHour: 9 } },
        { level: 3, cost: { wood: 225, clay: 110, iron: 225, crop: 140 }, buildTimeSeconds: 470, cpPerHour: 1.4, effects: { productionPerHour: 15 } },
        { level: 4, cost: { wood: 375, clay: 185, iron: 375, crop: 235 }, buildTimeSeconds: 620, cpPerHour: 1.6, effects: { productionPerHour: 23 } },
        { level: 5, cost: { wood: 620, clay: 310, iron: 620, crop: 390 }, buildTimeSeconds: 770, cpPerHour: 1.8, effects: { productionPerHour: 33 } },
        { level: 6, cost: { wood: 1035, clay: 520, iron: 1035, crop: 650 }, buildTimeSeconds: 1000, cpPerHour: 2.1, effects: { productionPerHour: 46 } },
        { level: 7, cost: { wood: 1725, clay: 870, iron: 1725, crop: 1085 }, buildTimeSeconds: 1270, cpPerHour: 2.4, effects: { productionPerHour: 60 } },
        { level: 8, cost: { wood: 2875, clay: 1450, iron: 2875, crop: 1810 }, buildTimeSeconds: 1630, cpPerHour: 2.7, effects: { productionPerHour: 78 } },
        { level: 9, cost: { wood: 4800, clay: 2420, iron: 4800, crop: 3020 }, buildTimeSeconds: 1980, cpPerHour: 3, effects: { productionPerHour: 99 } },
        { level: 10, cost: { wood: 8000, clay: 4040, iron: 8000, crop: 5040 }, buildTimeSeconds: 2460, cpPerHour: 3.4, effects: { productionPerHour: 124 } },
      ],
    },
    iron_mine: {
      key: "iron_mine",
      displayName: "Iron Mine",
      category: "field",
      maxLevel: 20,
      prerequisites: {},
      effects: { resourceType: "iron" },
      levels: [
        { level: 1, cost: { wood: 100, clay: 80, iron: 30, crop: 60 }, buildTimeSeconds: 320, cpPerHour: 1, effects: { productionPerHour: 5 } },
        { level: 2, cost: { wood: 170, clay: 135, iron: 50, crop: 100 }, buildTimeSeconds: 430, cpPerHour: 1.2, effects: { productionPerHour: 9 } },
        { level: 3, cost: { wood: 280, clay: 225, iron: 85, crop: 165 }, buildTimeSeconds: 550, cpPerHour: 1.4, effects: { productionPerHour: 15 } },
        { level: 4, cost: { wood: 465, clay: 375, iron: 140, crop: 275 }, buildTimeSeconds: 710, cpPerHour: 1.6, effects: { productionPerHour: 23 } },
        { level: 5, cost: { wood: 780, clay: 620, iron: 235, crop: 465 }, buildTimeSeconds: 890, cpPerHour: 1.8, effects: { productionPerHour: 33 } },
        { level: 6, cost: { wood: 1300, clay: 1035, iron: 390, crop: 780 }, buildTimeSeconds: 1130, cpPerHour: 2.1, effects: { productionPerHour: 46 } },
        { level: 7, cost: { wood: 2170, clay: 1725, iron: 650, crop: 1300 }, buildTimeSeconds: 1420, cpPerHour: 2.4, effects: { productionPerHour: 60 } },
        { level: 8, cost: { wood: 3620, clay: 2875, iron: 1085, crop: 2170 }, buildTimeSeconds: 1800, cpPerHour: 2.7, effects: { productionPerHour: 78 } },
        { level: 9, cost: { wood: 6040, clay: 4800, iron: 1810, crop: 3630 }, buildTimeSeconds: 2190, cpPerHour: 3, effects: { productionPerHour: 99 } },
        { level: 10, cost: { wood: 10080, clay: 8000, iron: 3020, crop: 6050 }, buildTimeSeconds: 2710, cpPerHour: 3.4, effects: { productionPerHour: 124 } },
      ],
    },
    crop_field: {
      key: "crop_field",
      displayName: "Crop Field",
      category: "field",
      maxLevel: 20,
      prerequisites: {},
      effects: { resourceType: "crop" },
      levels: [
        { level: 1, cost: { wood: 70, clay: 90, iron: 70, crop: 20 }, buildTimeSeconds: 260, cpPerHour: 1, effects: { productionPerHour: 7 } },
        { level: 2, cost: { wood: 115, clay: 150, iron: 115, crop: 35 }, buildTimeSeconds: 360, cpPerHour: 1.2, effects: { productionPerHour: 11 } },
        { level: 3, cost: { wood: 190, clay: 250, iron: 190, crop: 60 }, buildTimeSeconds: 470, cpPerHour: 1.4, effects: { productionPerHour: 17 } },
        { level: 4, cost: { wood: 305, clay: 400, iron: 305, crop: 100 }, buildTimeSeconds: 620, cpPerHour: 1.6, effects: { productionPerHour: 24 } },
        { level: 5, cost: { wood: 490, clay: 650, iron: 490, crop: 160 }, buildTimeSeconds: 780, cpPerHour: 1.8, effects: { productionPerHour: 35 } },
        { level: 6, cost: { wood: 790, clay: 1050, iron: 790, crop: 270 }, buildTimeSeconds: 1000, cpPerHour: 2.1, effects: { productionPerHour: 50 } },
        { level: 7, cost: { wood: 1270, clay: 1680, iron: 1270, crop: 430 }, buildTimeSeconds: 1270, cpPerHour: 2.4, effects: { productionPerHour: 68 } },
        { level: 8, cost: { wood: 2040, clay: 2680, iron: 2040, crop: 690 }, buildTimeSeconds: 1610, cpPerHour: 2.7, effects: { productionPerHour: 88 } },
        { level: 9, cost: { wood: 3270, clay: 4280, iron: 3270, crop: 1100 }, buildTimeSeconds: 1980, cpPerHour: 3, effects: { productionPerHour: 113 } },
        { level: 10, cost: { wood: 5240, clay: 6830, iron: 5240, crop: 1765 }, buildTimeSeconds: 2460, cpPerHour: 3.4, effects: { productionPerHour: 140 } },
      ],
    },
  },
  culturePoints: {
    tickPolicy: "lazy",
    thresholds: [
      { villageNumber: 2, cpRequired: 1200 },
      { villageNumber: 3, cpRequired: 3000 },
      { villageNumber: 4, cpRequired: 7000 },
      { villageNumber: 5, cpRequired: 15000 },
      { villageNumber: 6, cpRequired: 28000 },
      { villageNumber: 7, cpRequired: 45000 },
      { villageNumber: 8, cpRequired: 70000 },
      { villageNumber: 9, cpRequired: 100000 },
      { villageNumber: 10, cpRequired: 140000 },
    ],
  },
}

export const DEFAULT_QUEUE_PRESET_KEY = "free"

export function getQueuePreset(key?: string): QueuePreset {
  if (key && CONSTRUCTION_CONFIG.queuePresets[key]) {
    return CONSTRUCTION_CONFIG.queuePresets[key]
  }
  return CONSTRUCTION_CONFIG.queuePresets[DEFAULT_QUEUE_PRESET_KEY]
}

export type ConstructionEntityKey = keyof typeof CONSTRUCTION_CONFIG.buildingBlueprints

export function getBlueprint(key: ConstructionEntityKey): BuildingBlueprintDefinition {
  const blueprint = CONSTRUCTION_CONFIG.buildingBlueprints[key]
  if (!blueprint) {
    throw new Error(`Blueprint not found for ${key}`)
  }
  return blueprint
}

export function getLevelData(key: ConstructionEntityKey, level: number): BuildingLevelDefinition {
  const blueprint = getBlueprint(key)
  const levelData = blueprint.levels.find((entry) => entry.level === level)
  if (levelData) return levelData
  const highest = blueprint.levels[blueprint.levels.length - 1]
  const factor = 1.2 ** (level - highest.level)
  return {
    level,
    cost: {
      wood: Math.round(highest.cost.wood * factor),
      clay: Math.round(highest.cost.clay * factor),
      iron: Math.round(highest.cost.iron * factor),
      crop: Math.round(highest.cost.crop * factor),
    },
    buildTimeSeconds: Math.round(highest.buildTimeSeconds * factor),
    cpPerHour: parseFloat((highest.cpPerHour * factor).toFixed(2)),
    effects: highest.effects,
  }
}

export function getMainBuildingMultiplier(level: number): number {
  const reduction = CONSTRUCTION_CONFIG.mainBuildingReduction
    .slice()
    .reverse()
    .find((entry) => level >= entry.level)
  return reduction?.multiplier ?? 1
}

export function getCulturePointThreshold(villageNumber: number): number | null {
  const threshold = CONSTRUCTION_CONFIG.culturePoints.thresholds
    .slice()
    .sort((a, b) => a.villageNumber - b.villageNumber)
    .find((entry) => entry.villageNumber === villageNumber)
  return threshold?.cpRequired ?? null
}
