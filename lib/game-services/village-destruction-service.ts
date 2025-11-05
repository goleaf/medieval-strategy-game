import { prisma } from "@/lib/db"
import type { BuildingType } from "@prisma/client"

/**
 * Population contribution per building level
 * Based on Travian mechanics where different buildings provide population
 */
const POPULATION_CONTRIBUTIONS: Record<BuildingType, number> = {
  HEADQUARTER: 4, // Main building provides base population
  BARRACKS: 1,
  STABLES: 1,
  WATCHTOWER: 1,
  WALL: 2,
  WAREHOUSE: 0,
  GRANARY: 0,
  SAWMILL: 0,
  QUARRY: 0,
  IRON_MINE: 0,
  TREASURY: 0,
  ACADEMY: 0,
  TEMPLE: 0,
  HOSPITAL: 0,
  FARM: 0, // Farm provides housing capacity, not direct population
  SNOB: 0,
  // Huns-specific buildings
  COMMAND_CENTER: 4, // Similar to headquarters
  MAKESHIFT_WALL: 1,
  // Defensive buildings
  TRAPPER: 0,
  // Teutonic-specific buildings
  EARTH_WALL: 2,
  BREWERY: 0,
  // Egyptian-specific buildings
  WATERWORKS: 0,
}

/**
 * Buildings that cannot be destroyed (protected structures)
 */
const PROTECTED_BUILDINGS: BuildingType[] = [
  // World Wonder villages cannot be destroyed
  // Artefact-holding villages cannot be destroyed
  // Last remaining villages cannot be destroyed
]

export class VillageDestructionService {
  /**
   * Calculate total population for a village based on its buildings
   * Population = sum of population contributions from all buildings
   */
  static async calculateVillagePopulation(villageId: string): Promise<number> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) return 0

    let totalPopulation = 0

    for (const building of village.buildings) {
      const contribution = POPULATION_CONTRIBUTIONS[building.type] || 0
      totalPopulation += contribution * building.level
    }

    // Ensure population doesn't exceed farm capacity
    const maxPopulation = this.calculateMaxPopulation(village.buildings)
    return Math.min(totalPopulation, maxPopulation)
  }

  /**
   * Calculate maximum population capacity based on Farm levels
   * Base 100 + 50 per farm level
   */
  static calculateMaxPopulation(buildings: Array<{ type: BuildingType; level: number }>): number {
    const farm = buildings.find((b) => b.type === "FARM")
    const farmLevel = farm?.level || 0
    return 100 + farmLevel * 50
  }

  /**
   * Check if a village can be destroyed
   * Villages cannot be destroyed if they are:
   * - World Wonder villages
   * - Holding artefacts
   * - The player's last remaining village
   */
  static async canVillageBeDestroyed(villageId: string): Promise<{ canDestroy: boolean; reason?: string }> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        player: {
          include: {
            villages: {
              where: { isDestroyed: false }
            }
          }
        },
        buildings: true
      },
    })

    if (!village) {
      return { canDestroy: false, reason: "Village not found" }
    }

    if (village.isDestroyed) {
      return { canDestroy: false, reason: "Village is already destroyed" }
    }

    // Check if this is the player's last remaining village
    const activeVillages = village.player.villages.filter(v => v.id !== villageId)
    if (activeVillages.length === 0) {
      return { canDestroy: false, reason: "Cannot destroy player's last remaining village" }
    }

    // Check for World Wonder (not implemented yet, but placeholder)
    const hasWorldWonder = village.buildings.some(b => b.type === "WORLD_WONDER")
    if (hasWorldWonder) {
      return { canDestroy: false, reason: "Cannot destroy World Wonder village" }
    }

    // Check for artefacts (not implemented yet, but placeholder)
    const hasArtefact = false // TODO: Implement artefact check
    if (hasArtefact) {
      return { canDestroy: false, reason: "Cannot destroy village holding an artefact" }
    }

    return { canDestroy: true }
  }

  /**
   * Reduce village population by destroying buildings
   * Returns the amount of population reduction achieved
   */
  static async destroyBuildingsAndReducePopulation(
    villageId: string,
    targetPopulationReduction: number
  ): Promise<{ populationReduced: number; buildingsDestroyed: Array<{ id: string; type: BuildingType; level: number }> }> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) {
      return { populationReduced: 0, buildingsDestroyed: [] }
    }

    let remainingReduction = targetPopulationReduction
    const buildingsToDestroy: Array<{ id: string; type: BuildingType; level: number }> = []

    // Sort buildings by population contribution (destroy highest contribution first)
    const sortedBuildings = village.buildings
      .filter(b => !PROTECTED_BUILDINGS.includes(b.type))
      .sort((a, b) => {
        const aContribution = (POPULATION_CONTRIBUTIONS[a.type] || 0) * a.level
        const bContribution = (POPULATION_CONTRIBUTIONS[b.type] || 0) * b.level
        return bContribution - aContribution
      })

    for (const building of sortedBuildings) {
      if (remainingReduction <= 0) break

      const contribution = (POPULATION_CONTRIBUTIONS[building.type] || 0) * building.level

      if (contribution > 0) {
        // Destroy this building
        buildingsToDestroy.push({
          id: building.id,
          type: building.type,
          level: building.level
        })

        remainingReduction -= contribution

        // Remove the building from database
        await prisma.building.delete({
          where: { id: building.id }
        })
      }
    }

    const populationReduced = targetPopulationReduction - remainingReduction
    return { populationReduced, buildingsDestroyed: buildingsToDestroy }
  }

  /**
   * Destroy a village completely when population reaches zero
   */
  static async destroyVillage(villageId: string, destroyerId?: string): Promise<void> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { player: true },
    })

    if (!village) return

    // Verify village can be destroyed
    const canDestroy = await this.canVillageBeDestroyed(villageId)
    if (!canDestroy.canDestroy) {
      throw new Error(canDestroy.reason)
    }

    // Mark village as destroyed
    await prisma.village.update({
      where: { id: villageId },
      data: {
        isDestroyed: true,
        destroyedAt: new Date(),
        destroyedById: destroyerId,
        population: 0,
        // Clear resources
        wood: 0,
        stone: 0,
        iron: 0,
        gold: 0,
        food: 0,
        // Clear production
        woodProduction: 0,
        stoneProduction: 0,
        ironProduction: 0,
        goldProduction: 0,
        foodProduction: 0,
      },
    })

    // Remove all remaining buildings
    await prisma.building.deleteMany({
      where: { villageId },
    })

    // Remove all troops
    await prisma.troop.deleteMany({
      where: { villageId },
    })

    // Cancel all ongoing attacks from this village
    await prisma.attack.updateMany({
      where: { fromVillageId: villageId },
      data: { status: "CANCELLED" },
    })

    // Cancel all reinforcements from this village
    await prisma.reinforcement.updateMany({
      where: { fromVillageId: villageId },
      data: { status: "CANCELLED" },
    })

    // Remove all market orders
    await prisma.marketOrder.deleteMany({
      where: { villageId },
    })

    // Convert to abandoned valley (could be respawned later)
    // The village record remains but is marked as destroyed
  }

  /**
   * Update village population based on current buildings
   * Called after building construction/destruction
   */
  static async updateVillagePopulation(villageId: string): Promise<void> {
    const currentPopulation = await this.calculateVillagePopulation(villageId)

    await prisma.village.update({
      where: { id: villageId },
      data: { population: currentPopulation },
    })

    // Check if village should be destroyed (population <= 0)
    if (currentPopulation <= 0) {
      const canDestroy = await this.canVillageBeDestroyed(villageId)
      if (canDestroy.canDestroy) {
        await this.destroyVillage(villageId)
      }
    }
  }

  /**
   * Get village destruction statistics
   */
  static async getVillageDestructionStats(villageId: string): Promise<{
    population: number
    maxPopulation: number
    canBeDestroyed: boolean
    destructionReason?: string
    isDestroyed: boolean
    destroyedAt?: Date
    destroyedBy?: string
  }> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    })

    if (!village) {
      throw new Error("Village not found")
    }

    const maxPopulation = this.calculateMaxPopulation(village.buildings)
    const canDestroyCheck = await this.canVillageBeDestroyed(villageId)

    return {
      population: village.population,
      maxPopulation,
      canBeDestroyed: canDestroyCheck.canDestroy,
      destructionReason: canDestroyCheck.reason,
      isDestroyed: village.isDestroyed,
      destroyedAt: village.destroyedAt || undefined,
      destroyedBy: village.destroyedById || undefined,
    }
  }
}

