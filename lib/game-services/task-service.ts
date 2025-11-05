import { BuildingType, Resource, TaskType, TaskCategory } from '@prisma/client';
import { prisma } from '@/lib/db';

// Task definition interface
export interface TaskDefinition {
  type: TaskType;
  category: TaskCategory;
  level: number;
  buildingType?: BuildingType;
  resourceType?: Resource;
  targetLevel?: number;
  targetPopulation?: number;
  targetCulturePoints?: number;
  rewards: {
    wood: number;
    stone: number;
    iron: number;
    gold: number;
    food: number;
    heroExperience: number;
  };
}

// Base reward multipliers (similar to Travian system)
const REWARD_MULTIPLIERS = {
  BUILDING_LEVEL: 50,
  RESOURCE_FIELD_LEVEL: 30,
  POPULATION_REACH: 100,
  CULTURE_POINTS_PRODUCTION: 75,
  CELEBRATION_HOLD: 200,
};

// Task definitions based on Travian: Legends system
function createTaskDefinitions(): TaskDefinition[] {
  return [
    // Village-specific building tasks
    // Warehouse levels
    ...[1, 3, 7, 12, 20].map(level => ({
      type: TaskType.BUILDING_LEVEL,
      category: TaskCategory.VILLAGE_SPECIFIC,
      level,
      buildingType: BuildingType.WAREHOUSE,
      targetLevel: level,
      rewards: {
        wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
        stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
        iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
        gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
        food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
        heroExperience: level * 10,
      },
    })),

  // Granary levels
  ...[1, 3, 7, 12, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.GRANARY,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 10,
    },
  })),

  // Barracks levels
  ...[1, 3, 7, 12, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.BARRACKS,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 10,
    },
  })),

  // Stable levels
  ...[1, 3, 7, 12, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.STABLES,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 10,
    },
  })),

  // Academy levels
  ...[1, 10, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.ACADEMY,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 15,
    },
  })),

  // Smithy levels
  ...[1, 10, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.SMITHY,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 15,
    },
  })),

  // Town Hall levels
  ...[1, 10, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.TOWNHALL,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 15,
    },
  })),

  // Main Building levels
  ...[1, 3, 7, 12, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.HEADQUARTER,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 12,
    },
  })),

  // Cranny levels
  ...[1, 3, 6, 10].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.Cranny,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 8,
    },
  })),

  // Marketplace levels
  ...[1, 3, 7, 12, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.MARKETPLACE,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 10,
    },
  })),

  // Residence levels
  ...[1, 3, 7, 10, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.RESIDENCE,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 12,
    },
  })),

  // Palace/Command Center levels
  ...[1, 3, 7, 12, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.PALACE,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 15,
    },
  })),

  // Wall levels
  ...[1, 3, 7, 12, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.WALL,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 10,
    },
  })),

  // Rally Point levels
  ...[1, 10, 20].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.RALLY_POINT,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 12,
    },
  })),

  // Resource field levels - Sawmill
  ...[1, 5].map(level => ({
    type: TaskType.RESOURCE_FIELD_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    resourceType: Resource.WOOD,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      stone: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      iron: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      gold: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      food: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      heroExperience: level * 8,
    },
  })),

  // Brickyard
  ...[1, 5].map(level => ({
    type: TaskType.RESOURCE_FIELD_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    resourceType: Resource.STONE,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      stone: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      iron: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      gold: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      food: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      heroExperience: level * 8,
    },
  })),

  // Iron Foundry
  ...[1, 5].map(level => ({
    type: TaskType.RESOURCE_FIELD_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    resourceType: Resource.IRON,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      stone: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      iron: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      gold: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      food: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      heroExperience: level * 8,
    },
  })),

  // Grain Mill
  ...[1, 5].map(level => ({
    type: TaskType.RESOURCE_FIELD_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    resourceType: Resource.FOOD,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      stone: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      iron: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      gold: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      food: REWARD_MULTIPLIERS.RESOURCE_FIELD_LEVEL * level,
      heroExperience: level * 8,
    },
  })),

  // Bakery
  ...[1, 5].map(level => ({
    type: TaskType.BUILDING_LEVEL,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level,
    buildingType: BuildingType.BAKERY,
    targetLevel: level,
    rewards: {
      wood: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      stone: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      iron: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      gold: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      food: REWARD_MULTIPLIERS.BUILDING_LEVEL * level,
      heroExperience: level * 8,
    },
  })),

  // Population tasks
  ...[50, 100, 150, 250, 350, 500, 750, 1000].map(population => ({
    type: TaskType.POPULATION_REACH,
    category: TaskCategory.VILLAGE_SPECIFIC,
    level: population,
    targetPopulation: population,
    rewards: {
      wood: REWARD_MULTIPLIERS.POPULATION_REACH,
      stone: REWARD_MULTIPLIERS.POPULATION_REACH,
      iron: REWARD_MULTIPLIERS.POPULATION_REACH,
      gold: REWARD_MULTIPLIERS.POPULATION_REACH,
      food: REWARD_MULTIPLIERS.POPULATION_REACH,
      heroExperience: 50,
    },
  })),

  // Culture Points Production tasks (global)
  ...[50, 100, 150, 250, 350, 500].map(cp => ({
    type: TaskType.CULTURE_POINTS_PRODUCTION,
    category: TaskCategory.PLAYER_GLOBAL,
    level: cp,
    targetCulturePoints: cp,
    rewards: {
      wood: REWARD_MULTIPLIERS.CULTURE_POINTS_PRODUCTION,
      stone: REWARD_MULTIPLIERS.CULTURE_POINTS_PRODUCTION,
      iron: REWARD_MULTIPLIERS.CULTURE_POINTS_PRODUCTION,
      gold: REWARD_MULTIPLIERS.CULTURE_POINTS_PRODUCTION,
      food: REWARD_MULTIPLIERS.CULTURE_POINTS_PRODUCTION,
      heroExperience: 75,
    },
  })),

  // Global Population tasks
  ...[500, 1000, 1500, 2500, 5000, 10000, 20000].map(population => ({
    type: TaskType.POPULATION_REACH,
    category: TaskCategory.PLAYER_GLOBAL,
    level: population,
    targetPopulation: population,
    rewards: {
      wood: REWARD_MULTIPLIERS.POPULATION_REACH * 2,
      stone: REWARD_MULTIPLIERS.POPULATION_REACH * 2,
      iron: REWARD_MULTIPLIERS.POPULATION_REACH * 2,
      gold: REWARD_MULTIPLIERS.POPULATION_REACH * 2,
      food: REWARD_MULTIPLIERS.POPULATION_REACH * 2,
      heroExperience: 100,
    },
  })),
  ];
}

// Lazy-loaded task definitions
let _taskDefinitions: TaskDefinition[] | null = null;

/**
 * Get all task definitions
 */
export function getAllTaskDefinitions(): TaskDefinition[] {
  if (!_taskDefinitions) {
    _taskDefinitions = createTaskDefinitions();
  }
  return _taskDefinitions;
}

// Export for backward compatibility - this will be lazy-loaded when first accessed
export const TASK_DEFINITIONS = new Proxy([] as TaskDefinition[], {
  get(target, prop) {
    if (!_taskDefinitions) {
      _taskDefinitions = createTaskDefinitions();
    }
    return (_taskDefinitions as any)[prop];
  }
});

/**
 * Get task definitions for a specific category
 */
export function getTaskDefinitionsByCategory(category: TaskCategory): TaskDefinition[] {
  return TASK_DEFINITIONS.filter(task => task.category === category);
}

/**
 * Get task definition by type, category, and level
 */
export function getTaskDefinition(
  type: TaskType,
  category: TaskCategory,
  level: number
): TaskDefinition | undefined {
  return TASK_DEFINITIONS.find(
    task => task.type === type && task.category === category && task.level === level
  );
}

/**
 * Calculate reward multiplier based on task completion count
 * Each subsequent completion of the same task type gives larger rewards
 */
export function calculateRewardMultiplier(completionCount: number): number {
  // Base multiplier + bonus for repeated completions
  return 1 + (completionCount - 1) * 0.5;
}

/**
 * Calculate hero experience bonus based on hero level
 */
export function calculateHeroExperienceBonus(heroLevel: number): number {
  return Math.floor(heroLevel * 0.1); // 10% bonus per hero level
}

/**
 * Create task progress records for a new village
 * Only creates village-specific tasks
 */
export async function createTasksForVillage(villageId: string, playerId: string): Promise<void> {
  const villageTasks = getTaskDefinitionsByCategory(TaskCategory.VILLAGE_SPECIFIC);

  // Since we can't use the TaskProgress model directly due to schema issues,
  // we'll create a simple in-memory implementation for now
  // In production, this would create database records

  console.log(`Creating ${villageTasks.length} tasks for village ${villageId}`);

  // TODO: Create TaskProgress records in database when schema is fixed
  // For now, we'll implement this as a placeholder
}

/**
 * Create task progress records for a new player
 * Creates both village-specific tasks for their capital and global tasks
 */
export async function createTasksForPlayer(playerId: string, capitalVillageId: string): Promise<void> {
  // Create village-specific tasks for capital
  await createTasksForVillage(capitalVillageId, playerId);

  // Create global tasks
  const globalTasks = getTaskDefinitionsByCategory(TaskCategory.PLAYER_GLOBAL);

  console.log(`Creating ${globalTasks.length} global tasks for player ${playerId}`);

  // TODO: Create TaskProgress records in database when schema is fixed
}

/**
 * Check if a task is completed based on current game state
 */
export async function checkTaskCompletion(
  taskDefinition: TaskDefinition,
  playerId: string,
  villageId?: string
): Promise<boolean> {
  try {
    // This is a simplified implementation
    // In production, this would check actual game state from database

    switch (taskDefinition.type) {
      case TaskType.BUILDING_LEVEL:
        if (!taskDefinition.buildingType || !taskDefinition.targetLevel || !villageId) {
          return false;
        }
        return await checkBuildingLevel(villageId, taskDefinition.buildingType, taskDefinition.targetLevel);

      case TaskType.RESOURCE_FIELD_LEVEL:
        if (!taskDefinition.resourceType || !taskDefinition.targetLevel || !villageId) {
          return false;
        }
        return await checkResourceFieldLevel(villageId, taskDefinition.resourceType, taskDefinition.targetLevel);

      case TaskType.POPULATION_REACH:
        if (!taskDefinition.targetPopulation) {
          return false;
        }

        if (taskDefinition.category === TaskCategory.VILLAGE_SPECIFIC && villageId) {
          return await checkVillagePopulation(villageId, taskDefinition.targetPopulation);
        } else {
          return await checkTotalPlayerPopulation(playerId, taskDefinition.targetPopulation);
        }

      case TaskType.CULTURE_POINTS_PRODUCTION:
        if (!taskDefinition.targetCulturePoints) {
          return false;
        }
        return await checkCulturePointsProduction(playerId, taskDefinition.targetCulturePoints);

      case TaskType.CELEBRATION_HOLD:
        // TODO: Implement celebration tracking
        return false;

      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking task completion:', error);
    return false;
  }
}

/**
 * Update task progress and check for completions
 */
export async function updateTaskProgress(playerId: string, villageId?: string): Promise<void> {
  try {
    // Get all active tasks for this player/village combination
    const tasks = villageId
      ? getTaskDefinitionsByCategory(TaskCategory.VILLAGE_SPECIFIC)
      : getTaskDefinitionsByCategory(TaskCategory.PLAYER_GLOBAL);

    for (const taskDefinition of tasks) {
      const isCompleted = await checkTaskCompletion(taskDefinition, playerId, villageId);

      if (isCompleted) {
        // Mark task as completed and award rewards
        await completeTask(taskDefinition, playerId, villageId);
      }
    }
  } catch (error) {
    console.error('Error updating task progress:', error);
  }
}

/**
 * Complete a task and award rewards
 */
export async function completeTask(
  taskDefinition: TaskDefinition,
  playerId: string,
  villageId?: string
): Promise<void> {
  try {
    console.log(`Completing task: ${taskDefinition.type} level ${taskDefinition.level} for player ${playerId}`);

    // Award resources
    await awardTaskRewards(taskDefinition, playerId, villageId);

    // TODO: Mark task as completed in database
    // TODO: Send notification to player

  } catch (error) {
    console.error('Error completing task:', error);
  }
}

/**
 * Check if a building exists at the required level
 */
export async function checkBuildingLevel(villageId: string, buildingType: BuildingType, targetLevel: number): Promise<boolean> {
  try {
    const building = await prisma.building.findFirst({
      where: {
        villageId,
        type: buildingType,
      },
    });

    return building ? building.level >= targetLevel : false;
  } catch (error) {
    console.error('Error checking building level:', error);
    return false;
  }
}

/**
 * Check if a resource field exists at the required level
 */
export async function checkResourceFieldLevel(villageId: string, resourceType: Resource, targetLevel: number): Promise<boolean> {
  try {
    // For resource fields, we need to check how many fields of that type are at or above the target level
    // This is a simplified implementation - in Travian, resource fields are separate buildings
    const resourceFieldType = getResourceFieldBuildingType(resourceType);

    if (!resourceFieldType) return false;

    const buildings = await prisma.building.findMany({
      where: {
        villageId,
        type: resourceFieldType,
      },
    });

    // Check if at least one building of this type is at target level
    return buildings.some(building => building.level >= targetLevel);
  } catch (error) {
    console.error('Error checking resource field level:', error);
    return false;
  }
}

/**
 * Check if village has reached target population
 */
export async function checkVillagePopulation(villageId: string, targetPopulation: number): Promise<boolean> {
  try {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
    });

    return village ? village.population >= targetPopulation : false;
  } catch (error) {
    console.error('Error checking village population:', error);
    return false;
  }
}

/**
 * Check total population across all player villages
 */
export async function checkTotalPlayerPopulation(playerId: string, targetPopulation: number): Promise<boolean> {
  try {
    const villages = await prisma.village.findMany({
      where: { playerId },
      select: { population: true },
    });

    const totalPopulation = villages.reduce((sum, village) => sum + village.population, 0);
    return totalPopulation >= targetPopulation;
  } catch (error) {
    console.error('Error checking total player population:', error);
    return false;
  }
}

/**
 * Check total culture points production across all player villages
 */
export async function checkCulturePointsProduction(playerId: string, targetCulturePoints: number): Promise<boolean> {
  try {
    // Culture points production is typically calculated based on town hall levels and other factors
    // For now, we'll use a simplified calculation based on buildings that produce culture points
    const villages = await prisma.village.findMany({
      where: { playerId },
      include: {
        buildings: {
          where: {
            type: { in: [BuildingType.TOWNHALL, BuildingType.RESIDENCE, BuildingType.PALACE] },
          },
        },
      },
    });

    let totalCulturePoints = 0;
    for (const village of villages) {
      for (const building of village.buildings) {
        // Simplified culture points calculation
        totalCulturePoints += building.level * 10; // 10 CP per level per building
      }
    }

    return totalCulturePoints >= targetCulturePoints;
  } catch (error) {
    console.error('Error checking culture points production:', error);
    return false;
  }
}

/**
 * Get building type for resource field
 */
function getResourceFieldBuildingType(resourceType: Resource): BuildingType | null {
  switch (resourceType) {
    case Resource.WOOD:
      return BuildingType.SAWMILL;
    case Resource.STONE:
      return BuildingType.QUARRY;
    case Resource.IRON:
      return BuildingType.IRON_MINE;
    case Resource.FOOD:
      return BuildingType.FARM;
    default:
      return null;
  }
}

/**
 * Award resources and experience for completing a task
 */
export async function awardTaskRewards(
  taskDefinition: TaskDefinition,
  playerId: string,
  villageId?: string
): Promise<void> {
  try {
    // Get hero level for experience bonus
    const hero = await prisma.hero.findUnique({
      where: { playerId },
    });
    const heroLevel = hero?.level || 1;
    const heroBonus = calculateHeroExperienceBonus(heroLevel);

    // Calculate final rewards
    const finalRewards = {
      wood: taskDefinition.rewards.wood,
      stone: taskDefinition.rewards.stone,
      iron: taskDefinition.rewards.iron,
      gold: taskDefinition.rewards.gold,
      food: taskDefinition.rewards.food,
      heroExperience: taskDefinition.rewards.heroExperience + heroBonus,
    };

    console.log(`Awarding rewards:`, finalRewards);

    // Update village resources if village-specific task
    if (villageId) {
      await prisma.village.update({
        where: { id: villageId },
        data: {
          wood: { increment: finalRewards.wood },
          stone: { increment: finalRewards.stone },
          iron: { increment: finalRewards.iron },
          gold: { increment: finalRewards.gold },
          food: { increment: finalRewards.food },
        },
      });
    } else {
      // For global tasks, distribute rewards to capital village
      const capitalVillage = await prisma.village.findFirst({
        where: { playerId, isCapital: true },
      });

      if (capitalVillage) {
        await prisma.village.update({
          where: { id: capitalVillage.id },
          data: {
            wood: { increment: finalRewards.wood },
            stone: { increment: finalRewards.stone },
            iron: { increment: finalRewards.iron },
            gold: { increment: finalRewards.gold },
            food: { increment: finalRewards.food },
          },
        });
      }
    }

    // Update hero experience
    if (hero) {
      await prisma.hero.update({
        where: { id: hero.id },
        data: {
          experience: { increment: finalRewards.heroExperience },
          level: {
            // Simple level calculation - every 1000 XP = 1 level
            set: Math.floor((hero.experience + finalRewards.heroExperience) / 1000) + 1,
          },
        },
      });
    }

  } catch (error) {
    console.error('Error awarding task rewards:', error);
  }
}

/**
 * Handle task transfer/reset when a village is conquered
 * Based on Travian: Legends rules - most tasks transfer but some reset
 */
export async function handleVillageConquest(villageId: string, newPlayerId: string): Promise<void> {
  try {
    console.log(`Handling task transfer for conquered village ${villageId} to player ${newPlayerId}`);

    // Get all task progress for the village
    // TODO: Once database models are working, implement this:
    // const taskProgress = await prisma.taskProgress.findMany({
    //   where: { villageId },
    //   include: { task: true },
    // });

    // For each task progress:
    // - If it's a loyalty task, create a new one for the new owner
    // - For other tasks, transfer ownership but don't give rewards if already completed
    // - Reset progress for tasks that should reset on conquest

    // Tasks that reset on conquest (from Travian documentation):
    // - Loyalty tasks (always reset)
    // - Residence/Palace/Command Center level tasks (replaces existing)

    // Tasks that transfer:
    // - All other building and resource tasks
    // - Population and culture points tasks (if not completed)

    // For now, recreate all tasks for the new owner
    await createTasksForVillage(villageId, newPlayerId);

  } catch (error) {
    console.error('Error handling village conquest tasks:', error);
  }
}

/**
 * Get task progress for a player/village combination
 */
export async function getTaskProgress(playerId: string, villageId?: string): Promise<any[]> {
  try {
    // TODO: Implement once database models are working
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error getting task progress:', error);
    return [];
  }
}

/**
 * Mark a task as completed and claimed
 */
export async function claimTaskReward(taskId: string, playerId: string, villageId?: string): Promise<void> {
  try {
    // TODO: Implement once database models are working
    console.log(`Claiming reward for task ${taskId} for player ${playerId}`);
  } catch (error) {
    console.error('Error claiming task reward:', error);
  }
}
