import { prisma } from "@/lib/db"
import type { BuildingType, Prisma } from "@prisma/client"

const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const
const MIN_WAREHOUSE_CAPACITY = 1200
const MIN_GRANARY_CAPACITY = 1200
type ResourceKey = (typeof RESOURCE_KEYS)[number]
type CapacityBreakdownEntry = { buildingId: string; level: number; capacity: number }

type PrismaCtx = Prisma.TransactionClient | typeof prisma

const FALLBACK_CURVE: Record<BuildingType, { base: number; growth: number }> = {
  WAREHOUSE: { base: 1200, growth: 1.25 },
  GRANARY: { base: 1200, growth: 1.25 },
  HEADQUARTER: { base: 0, growth: 1 },
  MARKETPLACE: { base: 0, growth: 1 },
  BARRACKS: { base: 0, growth: 1 },
  STABLES: { base: 0, growth: 1 },
  WALL: { base: 0, growth: 1 },
  SAWMILL: { base: 0, growth: 1 },
  QUARRY: { base: 0, growth: 1 },
  IRON_MINE: { base: 0, growth: 1 },
  TREASURY: { base: 0, growth: 1 },
  ACADEMY: { base: 0, growth: 1 },
  TEMPLE: { base: 0, growth: 1 },
  HOSPITAL: { base: 0, growth: 1 },
  FARM: { base: 0, growth: 1 },
  SNOB: { base: 0, growth: 1 },
  CITY: { base: 0, growth: 1 },
  WATCHTOWER: { base: 0, growth: 1 },
  EARTH_WALL: { base: 0, growth: 1 },
  BREWERY: { base: 0, growth: 1 },
}

export type CapacitySummary = {
  totals: Record<ResourceKey, number>
  warehouses: CapacityBreakdownEntry[]
  granaries: CapacityBreakdownEntry[]
}

export class CapacityService {
  private static cacheLoaded = false
  private static capacityCache = new Map<BuildingType, Map<number, number>>()

  static get resourceKeys(): readonly ResourceKey[] {
    return RESOURCE_KEYS
  }

  static async refreshCurveCache() {
    this.cacheLoaded = false
    await this.ensureCache()
  }

  private static async ensureCache() {
    if (this.cacheLoaded) return

    const entries = await prisma.storageCapacityCurve.findMany()
    this.capacityCache.clear()
    for (const entry of entries) {
      if (!this.capacityCache.has(entry.buildingType)) {
        this.capacityCache.set(entry.buildingType, new Map())
      }
      this.capacityCache.get(entry.buildingType)!.set(entry.level, entry.capacity)
    }

    this.cacheLoaded = true
  }

  static async getCapacityForLevel(buildingType: BuildingType, level: number): Promise<number> {
    if (level <= 0) return 0
    await this.ensureCache()

    const curve = this.capacityCache.get(buildingType)
    if (curve?.has(level)) {
      return curve.get(level) ?? 0
    }

    if (!curve || curve.size === 0) {
      return this.applyFallback(buildingType, level)
    }

    const highestKnownLevel = Math.max(...curve.keys())
    const highestCapacity = curve.get(highestKnownLevel) ?? 0
    const extraLevels = Math.max(0, level - highestKnownLevel)
    if (extraLevels === 0) return highestCapacity

    const growth = FALLBACK_CURVE[buildingType]?.growth ?? 1.2
    return Math.round(highestCapacity * Math.pow(growth, extraLevels))
  }

  static async getVillageCapacitySummary(villageId: string, client: PrismaCtx = prisma): Promise<CapacitySummary> {
    const buildings = await client.building.findMany({
      where: { villageId, type: { in: ["WAREHOUSE", "GRANARY"] } },
      select: { id: true, type: true, level: true },
      orderBy: [{ type: "asc" }, { level: "desc" }],
    })

    let warehouseCap = 0
    let granaryCap = 0
    const warehouses: CapacityBreakdownEntry[] = []
    const granaries: CapacityBreakdownEntry[] = []

    for (const building of buildings) {
      const cap = await this.getCapacityForLevel(building.type as BuildingType, building.level)
      if (building.type === "GRANARY") {
        granaryCap += cap
        granaries.push({ buildingId: building.id, level: building.level, capacity: cap })
      } else {
        warehouseCap += cap
        warehouses.push({ buildingId: building.id, level: building.level, capacity: cap })
      }
    }

    warehouseCap = Math.max(warehouseCap, MIN_WAREHOUSE_CAPACITY)
    granaryCap = Math.max(granaryCap, MIN_GRANARY_CAPACITY)

    const totals: Record<ResourceKey, number> = {
      wood: warehouseCap,
      stone: warehouseCap,
      iron: warehouseCap,
      gold: warehouseCap,
      food: granaryCap,
    }

    return { totals, warehouses, granaries }
  }

  private static applyFallback(buildingType: BuildingType, level: number): number {
    const curve = FALLBACK_CURVE[buildingType]
    if (!curve || curve.base === 0) {
      return 0
    }

    return Math.round(curve.base * Math.pow(curve.growth, level - 1))
  }
}
