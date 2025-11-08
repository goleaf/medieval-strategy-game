import { prisma } from "@/lib/db"
import { VillageDestructionService } from "./village-destruction-service"
import { updateTaskProgress } from "./task-service"
import { CulturePointService } from "./culture-point-service"
import { getBlueprintKeyForBuilding, mapBlueprintCost, type ResourceCost } from "./construction-helpers"
import { BUILDING_BONUSES, LEGACY_BUILDING_COSTS, LEGACY_BUILDING_TIMES } from "./building-data"
import { CONSTRUCTION_CONFIG, getLevelData, getMainBuildingMultiplier, getQueuePreset } from "@/lib/config/construction"
import { getSubsystemEffectsConfig } from "@/lib/config/subsystem-effects"
import type {
  BuildQueueTask,
  BuildTaskStatus,
  BuildTaskSource,
  BuildingCategory,
  BuildingType,
  DemolitionMode,
  GameTribe,
} from "@prisma/client"

type QueueLimits = {
  maxWaiting: number
  parallelFieldSlots: number
  parallelInnerSlots: number
}

type UpgradeComputation = {
  cost: ResourceCost
  baseTimeSeconds: number
  effectiveTimeSeconds: number
  blueprintKey?: string
  category: BuildingCategory
}

const SUBSYSTEM_EFFECTS = getSubsystemEffectsConfig()

export function getBuildingBonuses(buildingType: BuildingType, level: number = 1) {
  const baseBonuses = BUILDING_BONUSES[buildingType] || {};
  const scaledBonuses: any = {};

  // Scale bonuses by building level
  Object.entries(baseBonuses).forEach(([key, value]) => {
    if (typeof value === 'number') {
      scaledBonuses[key] = value * level;
    } else {
      scaledBonuses[key] = value;
    }
  });

  return scaledBonuses;
}

// Get total bonuses for all buildings in a village
export async function getVillageBuildingBonuses(villageId: string) {
  const buildings = await prisma.building.findMany({
    where: { villageId },
    select: { type: true, level: true }
  });

  const totalBonuses = {
    woodProduction: 0,
    stoneProduction: 0,
    ironProduction: 0,
    goldProduction: 0,
    foodProduction: 0,
    visibility: 0,
  };

  buildings.forEach(building => {
    const bonuses = getBuildingBonuses(building.type as BuildingType, building.level);
    Object.entries(bonuses).forEach(([key, value]) => {
      if (typeof value === 'number' && key in totalBonuses) {
        (totalBonuses as any)[key] += value;
      }
    });
  });

  return totalBonuses;
}

export class BuildingService {
  /**
   * Get current construction queue for a village
   */
  static async getConstructionQueue(villageId: string) {
    return prisma.buildQueueTask.findMany({
      where: {
        villageId,
        status: { in: [BuildTaskStatus.WAITING, BuildTaskStatus.BUILDING, BuildTaskStatus.PAUSED] },
      },
      orderBy: { position: "asc" },
    })
  }

  /**
   * Calculate production bonuses from buildings
   */
  static calculateProductionBonuses(buildings: Array<{ type: BuildingType; level: number }>): {
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  } {
    const bonuses = { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }

    for (const building of buildings) {
      switch (building.type) {
        case "SAWMILL":
          bonuses.wood += building.level * 5 // +5 wood per level
          break
        case "QUARRY":
          bonuses.stone += building.level * 4 // +4 stone per level
          break
        case "IRON_MINE":
          bonuses.iron += building.level * 3 // +3 iron per level
          break
        case "TREASURY":
          bonuses.gold += building.level * 2 // +2 gold per level
          break
        case "FARM":
          bonuses.food += building.level * 6 // +6 food per level
          break
        case "WATERWORKS":
          // Egyptian Waterworks: boosts resource production through oasis bonuses
          // +3 to all resources per level (simulating oasis bonus enhancement)
          bonuses.wood += building.level * 3
          bonuses.stone += building.level * 3
          bonuses.iron += building.level * 3
          bonuses.gold += building.level * 3
          bonuses.food += building.level * 3
          break
        case "CITY":
          // Reign of Fire City: provides resource production bonuses
          bonuses.wood += building.level * 10
          bonuses.stone += building.level * 10
          bonuses.iron += building.level * 5
          bonuses.gold += building.level * 3
          bonuses.food += building.level * 15
          break
      }
    }

    return bonuses
  }

  /**
   * Calculate population limit based on Farm level
   */
  static calculatePopulationLimit(buildings: Array<{ type: BuildingType; level: number }>): number {
    const farm = buildings.find((b) => b.type === "FARM")
    const farmLevel = farm?.level ?? 0

    if (farmLevel > 0) {
      // Pull the configured population cap from the blueprint so game rules and docs stay in sync.
      const blueprintKey = getBlueprintKeyForBuilding("FARM" as BuildingType)
      if (blueprintKey) {
        const levelData = getLevelData(blueprintKey, farmLevel)
        const rawCap = levelData.effects ? (levelData.effects as Record<string, unknown>)["populationCap"] : undefined
        if (typeof rawCap === "number" && rawCap > 0) {
          return rawCap
        }
      }
    }

    // Fallback preserves the legacy behaviour if the blueprint is missing or misconfigured.
    return 100 + farmLevel * 50
  }

  private static async getQueueLimitsForVillage(villageId: string, tribe?: GameTribe | null): Promise<QueueLimits> {
    const override = await prisma.villageQueueLimit.findUnique({ where: { villageId } })
    if (override) {
      return {
        maxWaiting: override.maxWaiting,
        parallelFieldSlots: override.parallelFieldSlots,
        parallelInnerSlots: override.parallelInnerSlots,
      }
    }
    const base = { ...getQueuePreset() }
    const romanCfg = SUBSYSTEM_EFFECTS.roman_build_queue
    if (!romanCfg) {
      return base
    }

    let effectiveTribe = tribe ?? null
    if (!effectiveTribe) {
      const owner = await prisma.village.findUnique({
        where: { id: villageId },
        select: { player: { select: { gameTribe: true } } },
      })
      effectiveTribe = owner?.player?.gameTribe ?? null
    }

    return this.applyQueueModifiers(base, effectiveTribe)
  }

  private static applyQueueModifiers(base: QueueLimits, tribe: GameTribe | null | undefined): QueueLimits {
    const romanCfg = SUBSYSTEM_EFFECTS.roman_build_queue
    if (!romanCfg) return base
    const normalize = (value: number | undefined) => Math.max(0, Math.floor(value ?? 0))

    if (tribe === "ROMANS") {
      return {
        ...base,
        parallelFieldSlots: normalize(romanCfg.field_lane_slots),
        parallelInnerSlots: normalize(romanCfg.inner_lane_slots),
      }
    }

    if (romanCfg.other_tribes_slot_count > 1) {
      const slots = normalize(romanCfg.other_tribes_slot_count)
      return {
        ...base,
        parallelFieldSlots: slots,
        parallelInnerSlots: slots,
      }
    }

    return base
  }

  private static usesParallelSlots(limits: QueueLimits): boolean {
    return limits.parallelFieldSlots > 0 || limits.parallelInnerSlots > 0
  }

  private static getAllowedActiveSlots(category: BuildingCategory, limits: QueueLimits): number {
    if (!this.usesParallelSlots(limits)) return 1
    const value = category === "FIELD" ? limits.parallelFieldSlots : limits.parallelInnerSlots
    return Math.max(1, value)
  }

  private static async countActiveTasks(
    villageId: string,
    category?: BuildingCategory,
  ): Promise<number> {
    return prisma.buildQueueTask.count({
      where: {
        villageId,
        status: BuildTaskStatus.BUILDING,
        ...(category ? { category } : {}),
      },
    })
  }

  private static async canStartTask(
    villageId: string,
    category: BuildingCategory,
    limits: QueueLimits,
  ): Promise<boolean> {
    if (!this.usesParallelSlots(limits)) {
      const active = await this.countActiveTasks(villageId)
      return active === 0
    }
    const allowed = this.getAllowedActiveSlots(category, limits)
    if (allowed <= 0) return false
    const active = await this.countActiveTasks(villageId, category)
    return active < allowed
  }

  private static computeUpgradeDetails(
    type: BuildingType,
    currentLevel: number,
    targetLevel: number,
    mainBuildingLevel: number,
    serverSpeed: number,
  ): UpgradeComputation {
    const blueprintKey = getBlueprintKeyForBuilding(type)
    let category: BuildingCategory = BuildingCategory.INNER
    let cost: ResourceCost
    let baseTimeSeconds: number

    if (blueprintKey) {
      const blueprint = CONSTRUCTION_CONFIG.buildingBlueprints[blueprintKey]
      category = blueprint.category === "field" ? BuildingCategory.FIELD : BuildingCategory.INNER
      const levelData = getLevelData(blueprintKey, targetLevel)
      cost = mapBlueprintCost(levelData.cost)
      baseTimeSeconds = levelData.buildTimeSeconds
    } else {
      const legacy = LEGACY_BUILDING_COSTS[type] || {}
      const scale = Math.pow(1.2, currentLevel)
      cost = {
        wood: Math.round((legacy.wood ?? 0) * scale),
        stone: Math.round((legacy.stone ?? 0) * scale),
        iron: Math.round((legacy.iron ?? 0) * scale),
        gold: Math.round((legacy.gold ?? 0) * scale),
        food: Math.round((legacy.food ?? 0) * scale),
      }
      baseTimeSeconds = ((LEGACY_BUILDING_TIMES[type] ?? 3600) * (1 + currentLevel * 0.1))
    }

    const mbMultiplier = getMainBuildingMultiplier(mainBuildingLevel)
    const effectiveTimeSeconds = Math.max(
      30,
      Math.round((baseTimeSeconds * mbMultiplier) / Math.max(serverSpeed, 1)),
    )

    return {
      cost,
      baseTimeSeconds,
      effectiveTimeSeconds,
      blueprintKey: blueprintKey ?? undefined,
      category,
    }
  }

  private static async startTask(task: BuildQueueTask): Promise<void> {
    if (!task.buildingId) return
    const building = await prisma.building.findUnique({
      where: { id: task.buildingId },
      include: {
        village: {
          include: {
            player: { include: { gameWorld: true } },
            buildings: { select: { id: true, type: true, level: true } },
          },
        },
      },
    })

    if (!building || !building.village) return

    const mainBuilding = building.village.buildings.find((b) => b.type === "HEADQUARTER")
    const mainBuildingLevel = mainBuilding?.level ?? 1
    const serverSpeed = building.village.player?.gameWorld?.speed ?? 1
    const upgrade = this.computeUpgradeDetails(
      building.type as BuildingType,
      building.level,
      task.toLevel,
      mainBuildingLevel,
      serverSpeed,
    )
    const now = new Date()
    const finishesAt = new Date(now.getTime() + upgrade.effectiveTimeSeconds * 1000)

    await prisma.buildQueueTask.update({
      where: { id: task.id },
      data: {
        status: BuildTaskStatus.BUILDING,
        startedAt: now,
        finishesAt,
        speedSnapshot: {
          baseTimeSeconds: upgrade.baseTimeSeconds,
          effectiveTimeSeconds: upgrade.effectiveTimeSeconds,
          serverSpeed,
          mainBuildingLevel,
        },
      },
    })

    await prisma.building.update({
      where: { id: building.id },
      data: {
        isBuilding: true,
        completionAt: finishesAt,
        queuePosition: task.position,
      },
    })
  }

  private static async startNextTasks(villageId: string): Promise<void> {
    const limits = await this.getQueueLimitsForVillage(villageId)
    if (!this.usesParallelSlots(limits)) {
      const active = await this.countActiveTasks(villageId)
      if (active > 0) return
      const next = await prisma.buildQueueTask.findFirst({
        where: { villageId, status: BuildTaskStatus.WAITING },
        orderBy: { position: "asc" },
      })
      if (next) {
        await this.startTask(next)
      }
      return
    }

    for (const category of [BuildingCategory.INNER, BuildingCategory.FIELD]) {
      const allowed = this.getAllowedActiveSlots(category, limits)
      if (allowed <= 0) continue
      let active = await this.countActiveTasks(villageId, category)
      while (active < allowed) {
        const next = await prisma.buildQueueTask.findFirst({
          where: { villageId, status: BuildTaskStatus.WAITING, category },
          orderBy: { position: "asc" },
        })
        if (!next) break
        await this.startTask(next)
        active += 1
      }
    }
  }

  /**
   * Upgrade building - adds to construction queue
   * Costs are deducted at enqueue
   */
  static async upgradeBuilding(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        village: {
          include: {
            player: { include: { gameWorld: true } },
            buildings: { select: { id: true, type: true, level: true } },
          },
        },
        queueTasks: {
          where: {
            status: { in: [BuildTaskStatus.WAITING, BuildTaskStatus.BUILDING, BuildTaskStatus.PAUSED] },
          },
        },
      },
    })

    if (!building) throw new Error("Building not found")
    if (!building.village) throw new Error("Village not found")
    if (building.queueTasks.length > 0) throw new Error("Building already under construction")

    // Check Brewery building restrictions (Teutonic-only)
    if (building.type === "BREWERY") {
      const restrictedBuildings = building.village.buildings.filter((b) =>
        ["RESIDENCE", "PALACE", "COMMAND_CENTER"].includes(b.type),
      )
      if (restrictedBuildings.length > 0) {
        throw new Error(
          "Cannot build Brewery in a village that contains Residence, Palace, or Command Center",
        )
      }
    }

    const limits = await this.getQueueLimitsForVillage(building.villageId, building.village.player?.gameTribe ?? null)
    const waitingCount = await prisma.buildQueueTask.count({
      where: { villageId: building.villageId, status: BuildTaskStatus.WAITING },
    })
    if (waitingCount >= limits.maxWaiting) {
      throw new Error(`Construction queue is full (max waiting ${limits.maxWaiting})`)
    }

    const village = building.village
    const mainBuilding = village.buildings.find((b) => b.type === "HEADQUARTER")
    const mainBuildingLevel = mainBuilding?.level ?? 1
    const serverSpeed = village.player?.gameWorld?.speed ?? 1
    const targetLevel = building.level + 1
    const upgrade = this.computeUpgradeDetails(
      building.type as BuildingType,
      building.level,
      targetLevel,
      mainBuildingLevel,
      serverSpeed,
    )

    const hasResources =
      village.wood >= upgrade.cost.wood &&
      village.stone >= upgrade.cost.stone &&
      village.iron >= upgrade.cost.iron &&
      village.gold >= upgrade.cost.gold &&
      village.food >= upgrade.cost.food
    if (!hasResources) {
      throw new Error("Insufficient resources")
    }

    // Deduct costs immediately
    await prisma.village.update({
      where: { id: village.id },
      data: {
        wood: { decrement: upgrade.cost.wood },
        stone: { decrement: upgrade.cost.stone },
        iron: { decrement: upgrade.cost.iron },
        gold: { decrement: upgrade.cost.gold },
        food: { decrement: upgrade.cost.food },
      },
    })

    const canStart = await this.canStartTask(building.villageId, upgrade.category, limits)
    const lastTask = await prisma.buildQueueTask.findFirst({
      where: { villageId: building.villageId },
      orderBy: { position: "desc" },
      select: { position: true },
    })
    const position = (lastTask?.position ?? 0) + 1
    const now = new Date()
    const finishesAt = canStart
      ? new Date(now.getTime() + upgrade.effectiveTimeSeconds * 1000)
      : null

    await prisma.buildQueueTask.create({
      data: {
        villageId: building.villageId,
        buildingId: building.id,
        entityKey: upgrade.blueprintKey ?? building.type.toLowerCase(),
        category: upgrade.category,
        fromLevel: building.level,
        toLevel: targetLevel,
        status: canStart ? BuildTaskStatus.BUILDING : BuildTaskStatus.WAITING,
        queuedAt: now,
        startedAt: canStart ? now : null,
        finishesAt,
        position,
        speedSnapshot: {
          baseTimeSeconds: upgrade.baseTimeSeconds,
          effectiveTimeSeconds: canStart ? upgrade.effectiveTimeSeconds : null,
          serverSpeed,
          mainBuildingLevel,
        },
        metadata: { cost: upgrade.cost },
        createdBy: BuildTaskSource.PLAYER,
      },
    })

    await prisma.building.update({
      where: { id: buildingId },
      data: {
        isBuilding: true,
        completionAt: finishesAt,
        queuePosition: position,
        constructionCostWood: upgrade.cost.wood,
        constructionCostStone: upgrade.cost.stone,
        constructionCostIron: upgrade.cost.iron,
        constructionCostGold: upgrade.cost.gold,
        constructionCostFood: upgrade.cost.food,
      },
    })

    if (!canStart) {
      await this.startNextTasks(building.villageId)
    }
  }

  /**
   * Cancel building construction with refund based on Travian system
   * - Level 1 upgrades: full refund
   * - Higher level upgrades: refund the cost difference between levels
   * - Research actions cannot be canceled
   */
  static async cancelBuilding(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        village: true,
        research: true,
        queueTasks: {
          where: { status: { in: [BuildTaskStatus.WAITING, BuildTaskStatus.BUILDING, BuildTaskStatus.PAUSED] } },
          orderBy: { position: "asc" },
        },
      },
    })

    if (!building) throw new Error("Building not found")
    if (!building.queueTasks.length) {
      throw new Error("Building is not under construction")
    }

    // Prevent canceling buildings that are currently researching (Travian rule)
    if (building.research?.isResearching) {
      throw new Error("Cannot cancel building that is currently researching")
    }

    const task = building.queueTasks[0]

    let refund = {
      wood: 0,
      stone: 0,
      iron: 0,
      gold: 0,
      food: 0,
    }

    // Calculate refund based on Travian system
    if (task.status === BuildTaskStatus.WAITING) {
      // Level 1 upgrade - full refund
      refund = {
        wood: building.constructionCostWood,
        stone: building.constructionCostStone,
        iron: building.constructionCostIron,
        gold: building.constructionCostGold,
        food: building.constructionCostFood,
      }
    } else {
      // Higher level upgrade - refund difference between new and current level costs
      const currentLevelCost = this.getBuildingCosts(building.type as BuildingType)
      const newLevelCost = LEGACY_BUILDING_COSTS[building.type as BuildingType] || currentLevelCost

      // Apply level scaling to both costs
      const currentLevelScaled = {
        wood: Math.floor(currentLevelCost.wood * Math.pow(1.2, building.level - 1)),
        stone: Math.floor(currentLevelCost.stone * Math.pow(1.2, building.level - 1)),
        iron: Math.floor(currentLevelCost.iron * Math.pow(1.2, building.level - 1)),
        gold: Math.floor(currentLevelCost.gold * Math.pow(1.2, building.level - 1)),
        food: Math.floor(currentLevelCost.food * Math.pow(1.2, building.level - 1)),
      }

      const newLevelScaled = {
        wood: Math.floor(newLevelCost.wood * Math.pow(1.2, building.level)),
        stone: Math.floor(newLevelCost.stone * Math.pow(1.2, building.level)),
        iron: Math.floor(newLevelCost.iron * Math.pow(1.2, building.level)),
        gold: Math.floor(newLevelCost.gold * Math.pow(1.2, building.level)),
        food: Math.floor(newLevelCost.food * Math.pow(1.2, building.level)),
      }

      // Refund is the difference between invested cost and current level cost
      refund = {
        wood: Math.max(0, building.constructionCostWood - currentLevelScaled.wood),
        stone: Math.max(0, building.constructionCostStone - currentLevelScaled.stone),
        iron: Math.max(0, building.constructionCostIron - currentLevelScaled.iron),
        gold: Math.max(0, building.constructionCostGold - currentLevelScaled.gold),
        food: Math.max(0, building.constructionCostFood - currentLevelScaled.food),
      }
    }

    // Refund resources
    await prisma.village.update({
      where: { id: building.villageId },
      data: {
        wood: { increment: refund.wood },
        stone: { increment: refund.stone },
        iron: { increment: refund.iron },
        gold: { increment: refund.gold },
        food: { increment: refund.food },
      },
    })

    // Remove from queue and update positions
    const queuePosition = building.queuePosition
    await prisma.building.update({
      where: { id: buildingId },
      data: {
        isBuilding: false,
        completionAt: null,
        queuePosition: null,
        constructionCostWood: 0,
        constructionCostStone: 0,
        constructionCostIron: 0,
        constructionCostGold: 0,
        constructionCostFood: 0,
      },
    })

    await prisma.buildQueueTask.update({
      where: { id: task.id },
      data: {
        status: BuildTaskStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    })

    await this.startNextTasks(building.villageId)
  }

  /**
   * Complete building construction and start next in queue
   */
  static async completeBuilding(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: { include: { buildings: true } } },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isBuilding) return

    const task = await prisma.buildQueueTask.findFirst({
      where: { buildingId, status: BuildTaskStatus.BUILDING },
      orderBy: { startedAt: "desc" },
    })

    // Complete the building
    await prisma.building.update({
      where: { id: buildingId },
      data: {
        level: building.level + 1,
        isBuilding: false,
        completionAt: null,
        queuePosition: null,
        constructionCostWood: 0,
        constructionCostStone: 0,
        constructionCostIron: 0,
        constructionCostGold: 0,
        constructionCostFood: 0,
      },
    })

    if (task) {
      await prisma.buildQueueTask.update({
        where: { id: task.id },
        data: {
          status: BuildTaskStatus.DONE,
          completedAt: new Date(),
        },
      })
    }

    // Update production rates based on new building levels
    const village = await prisma.village.findUnique({
      where: { id: building.villageId },
      include: { buildings: true },
    })

    if (village) {
      const bonuses = this.calculateProductionBonuses(village.buildings)
      const baseProduction = {
        wood: 10,
        stone: 8,
        iron: 5,
        gold: 2,
        food: 15,
      }

      await prisma.village.update({
        where: { id: building.villageId },
        data: {
          woodProduction: baseProduction.wood + bonuses.wood,
          stoneProduction: baseProduction.stone + bonuses.stone,
          ironProduction: baseProduction.iron + bonuses.iron,
          goldProduction: baseProduction.gold + bonuses.gold,
          foodProduction: baseProduction.food + bonuses.food,
        },
      })

      // Update population limit if Farm was upgraded
      if (building.type === "FARM") {
        const populationLimit = this.calculatePopulationLimit(village.buildings)
        await prisma.village.update({
          where: { id: building.villageId },
          data: { population: Math.min(village.population, populationLimit) },
        })
      }
    }
    await CulturePointService.recalculateVillageContribution(building.villageId)
    await this.startNextTasks(building.villageId)
    await updateTaskProgress(building.village.playerId, building.villageId)
  }

  static getBuildingCosts(type: BuildingType) {
    return (
      LEGACY_BUILDING_COSTS[type] || { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }
    )
  }

  static getBuildingUpgradeTime(type: BuildingType, level: number) {
    const baseTime = LEGACY_BUILDING_TIMES[type] ?? 3600
    return baseTime * (1 + level * 0.1)
  }

  /**
   * Get demolition time for a building level (in seconds)
   * Demolition time is roughly half the construction time
   */
  static getDemolitionTime(type: BuildingType, level: number): number {
    const baseTime = LEGACY_BUILDING_TIMES[type] ?? 3600
    return Math.floor((baseTime * (1 + level * 0.1)) * 0.5) // 50% of construction time
  }

  /**
   * Calculate gold cost for instant demolition operations
   */
  static getInstantDemolitionCost(buildingLevel: number, mode: DemolitionMode): number {
    const baseCost = buildingLevel * 2 // 2 gold per level

    switch (mode) {
      case "INSTANT_COMPLETE":
        return baseCost // Cost to complete current demolition instantly
      case "FULL_BUILDING":
        return baseCost * 3 // Higher cost for instant full building demolition
      default:
        return 0
    }
  }

  /**
   * Start demolishing a building level by level (normal speed)
   */
  static async startDemolition(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (building.isBuilding) throw new Error("Cannot demolish building that is currently under construction")
    if (building.isDemolishing) throw new Error("Building is already being demolished")
    if (building.level <= 1) throw new Error("Cannot demolish the last level of a building")

    // Check if Main Building is at least level 10 (Travian requirement)
    const mainBuilding = building.village.buildings.find(b => b.type === "HEADQUARTER")
    if (!mainBuilding || mainBuilding.level < 10) {
      throw new Error("Main Building must be at least level 10 to demolish buildings")
    }

    const demolitionTime = this.getDemolitionTime(building.type as BuildingType, building.level)

    await prisma.building.update({
      where: { id: buildingId },
      data: {
        isDemolishing: true,
        demolitionAt: new Date(Date.now() + demolitionTime * 1000),
        demolitionMode: "LEVEL_BY_LEVEL",
        demolitionCost: 0,
      },
    })
  }

  /**
   * Complete current demolition instantly using gold
   */
  static async completeDemolitionInstantly(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isDemolishing) throw new Error("Building is not being demolished")

    const goldCost = this.getInstantDemolitionCost(building.level, "INSTANT_COMPLETE")

    // Check if village has enough gold
    if (building.village.gold < goldCost) {
      throw new Error(`Insufficient gold. Required: ${goldCost}, Available: ${building.village.gold}`)
    }

    // Deduct gold and complete demolition
    await prisma.village.update({
      where: { id: building.villageId },
      data: { gold: building.village.gold - goldCost },
    })

    await this.completeDemolition(buildingId)
  }

  /**
   * Demolish entire building instantly using gold
   */
  static async demolishBuildingInstantly(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (building.isBuilding) throw new Error("Cannot demolish building that is currently under construction")
    if (building.isDemolishing) throw new Error("Building is already being demolished")

    // Check if Main Building is at least level 10
    const mainBuilding = building.village.buildings.find(b => b.type === "HEADQUARTER")
    if (!mainBuilding || mainBuilding.level < 10) {
      throw new Error("Main Building must be at least level 10 to demolish buildings")
    }

    const goldCost = this.getInstantDemolitionCost(building.level, "FULL_BUILDING")

    // Check if village has enough gold
    if (building.village.gold < goldCost) {
      throw new Error(`Insufficient gold. Required: ${goldCost}, Available: ${building.village.gold}`)
    }

    // Deduct gold and demolish entire building
    await prisma.village.update({
      where: { id: building.villageId },
      data: { gold: building.village.gold - goldCost },
    })

    // Reduce building to level 1 instantly
    await prisma.building.update({
      where: { id: buildingId },
      data: {
        level: 1,
        isDemolishing: false,
        demolitionAt: null,
        demolitionMode: null,
        demolitionCost: 0,
      },
    })

    // Update production rates
    await this.updateVillageProductionRates(building.villageId)
  }

  /**
   * Complete demolition process (reduce building level by 1)
   */
  static async completeDemolition(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isDemolishing) return

    // Reduce building level by 1
    const newLevel = Math.max(1, building.level - 1)

    await prisma.building.update({
      where: { id: buildingId },
      data: {
        level: newLevel,
        isDemolishing: false,
        demolitionAt: null,
        demolitionMode: null,
        demolitionCost: 0,
      },
    })

    // Update production rates
    await this.updateVillageProductionRates(building.villageId)
  }

  /**
   * Cancel ongoing demolition
   */
  static async cancelDemolition(buildingId: string): Promise<void> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { village: true },
    })

    if (!building) throw new Error("Building not found")
    if (!building.isDemolishing) throw new Error("Building is not being demolished")

    // For instant operations, no refund
    if (building.demolitionMode !== "LEVEL_BY_LEVEL") {
      await prisma.building.update({
        where: { id: buildingId },
        data: {
          isDemolishing: false,
          demolitionAt: null,
          demolitionMode: null,
          demolitionCost: 0,
        },
      })
      return
    }

    // For level-by-level demolition, provide partial refund based on time remaining
    const now = new Date()
    const totalTime = building.demolitionAt ? building.demolitionAt.getTime() - building.updatedAt.getTime() : 0
    const remainingTime = building.demolitionAt ? building.demolitionAt.getTime() - now.getTime() : 0

    let refundPercentage = 0
    if (totalTime > 0) {
      refundPercentage = Math.max(0, remainingTime / totalTime)
    }

    // Refund a portion of the "virtual" resources that would be gained from demolition
    const baseCosts = LEGACY_BUILDING_COSTS[building.type as BuildingType] || {
      wood: 0,
      stone: 0,
      iron: 0,
    }
    const refundWood = Math.floor(baseCosts.wood * refundPercentage * 0.1) // 10% of construction cost
    const refundStone = Math.floor(baseCosts.stone * refundPercentage * 0.1)
    const refundIron = Math.floor(baseCosts.iron * refundPercentage * 0.1)

    await prisma.village.update({
      where: { id: building.villageId },
      data: {
        wood: { increment: refundWood },
        stone: { increment: refundStone },
        iron: { increment: refundIron },
      },
    })

    await prisma.building.update({
      where: { id: buildingId },
      data: {
        isDemolishing: false,
        demolitionAt: null,
        demolitionMode: null,
        demolitionCost: 0,
      },
    })
  }

  /**
   * Update village production rates after building changes
   */
  private static async updateVillageProductionRates(villageId: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) return

    const bonuses = this.calculateProductionBonuses(village.buildings)

    await prisma.village.update({
      where: { id: villageId },
      data: {
        woodProduction: 10 + bonuses.wood,
        stoneProduction: 8 + bonuses.stone,
        ironProduction: 5 + bonuses.iron,
        goldProduction: 2 + bonuses.gold,
        foodProduction: 15 + bonuses.food,
      },
    })
  }
}
