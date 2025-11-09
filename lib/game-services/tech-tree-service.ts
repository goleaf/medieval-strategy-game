import { prisma } from "@/lib/db"
import { EventQueueService } from "@/lib/game-services/event-queue-service"
import { ResourceReservationService } from "@/lib/game-services/resource-reservation-service"
import type { BuildingType, EventQueueType, Technology, TechnologyCategory } from "@prisma/client"

export type TechStatus = "COMPLETED" | "IN_PROGRESS" | "AVAILABLE" | "LOCKED"

export type TechNode = {
  id: string
  key: string
  name: string
  description?: string | null
  category: TechnologyCategory
  costs: { wood: number; stone: number; iron: number; gold: number; food: number }
  baseTimeSeconds: number
  academyLevelRequired: number
  prerequisites: {
    tech: string[]
    buildings: Array<{ type: BuildingType | string; level: number }>
  }
  status: TechStatus
  lockedReasons?: string[]
  progress?: { startedAt: string; completionAt: string }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  try {
    if (typeof value === "string") return JSON.parse(value) as T
    return value as T
  } catch {
    return fallback
  }
}

export class TechTreeService {
  static async getTechTreeForVillage(playerId: string, villageId: string): Promise<TechNode[]> {
    const [village, techs, completed, job] = await Promise.all([
      prisma.village.findUnique({
        where: { id: villageId },
        include: { buildings: true, player: { select: { gameWorld: true } } },
      }),
      prisma.technology.findMany({ orderBy: { key: "asc" } }),
      prisma.playerTechnology.findMany({ where: { playerId } }),
      prisma.researchJob.findFirst({
        where: { villageId, completedAt: null },
        orderBy: { startedAt: "desc" },
      }),
    ])

    if (!village) throw new Error("Village not found")
    if (village.playerId !== playerId) throw new Error("Village does not belong to player")

    const academy = village.buildings.find((b) => b.type === "ACADEMY")
    const academyLevel = academy?.level ?? 0
    const completedSet = new Set(completed.map((pt) => pt.technologyId))
    const completedByKey = new Set(
      completed
        .map((pt) => techs.find((t) => t.id === pt.technologyId)?.key)
        .filter((k): k is string => Boolean(k)),
    )

    const statusList: TechNode[] = techs.map((tech) => {
      const isCompleted = completedSet.has(tech.id)
      const prereq = parseJson<{ tech?: string[]; buildings?: Array<{ type: string; level: number }> }>(
        tech.prerequisites,
        { tech: [], buildings: [] },
      )
      const neededTech = prereq.tech ?? []
      const neededBuildings = prereq.buildings ?? []

      const unmet: string[] = []
      // Check academy requirement first
      if (academyLevel < (tech.academyLevelRequired ?? 1)) {
        unmet.push(`Academy level ${tech.academyLevelRequired}`)
      }
      // Building requirements
      for (const req of neededBuildings) {
        const type = String(req.type).toUpperCase()
        const level = req.level || 1
        const own = village.buildings.find((b) => b.type === type)
        const ok = (own?.level ?? 0) >= level
        if (!ok) unmet.push(`${type} level ${level}`)
      }
      // Tech requirements
      for (const key of neededTech) {
        if (!completedByKey.has(key)) {
          unmet.push(`Technology ${key}`)
        }
      }

      let status: TechStatus = "LOCKED"
      let progress: TechNode["progress"]
      if (isCompleted) {
        status = "COMPLETED"
      } else if (job && job.technologyId === tech.id) {
        status = "IN_PROGRESS"
        progress = { startedAt: job.startedAt.toISOString(), completionAt: job.completionAt.toISOString() }
      } else if (unmet.length === 0) {
        status = "AVAILABLE"
      }

      return {
        id: tech.id,
        key: tech.key,
        name: tech.displayName,
        description: tech.description,
        category: tech.category,
        costs: {
          wood: tech.costWood,
          stone: tech.costStone,
          iron: tech.costIron,
          gold: tech.costGold,
          food: tech.costFood,
        },
        baseTimeSeconds: tech.baseTimeSeconds,
        academyLevelRequired: tech.academyLevelRequired,
        prerequisites: {
          tech: neededTech,
          buildings: neededBuildings.map((b) => ({ type: b.type, level: b.level })),
        },
        status,
        lockedReasons: status === "LOCKED" ? unmet : undefined,
        progress,
      }
    })

    return statusList
  }

  static async startResearchAtVillage(
    playerId: string,
    villageId: string,
    techKey: string,
  ): Promise<{ jobId: string; completionAt: Date }>
  {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true, player: { select: { gameWorld: true } } },
    })
    if (!village) throw new Error("Village not found")
    if (village.playerId !== playerId) throw new Error("Village does not belong to player")

    const academy = village.buildings.find((b) => b.type === "ACADEMY")
    if (!academy) throw new Error("Academy required to research technologies")

    const active = await prisma.researchJob.findFirst({ where: { villageId, completedAt: null } })
    if (active) throw new Error("This village is already researching a technology")

    const tech = await prisma.technology.findUnique({ where: { key: techKey } })
    if (!tech) throw new Error("Technology not found")

    if (academy.level < (tech.academyLevelRequired ?? 1)) {
      throw new Error(`Requires Academy level ${tech.academyLevelRequired}`)
    }

    // Check completion
    const already = await prisma.playerTechnology.findUnique({
      where: { playerId_technologyId: { playerId, technologyId: tech.id } },
    })
    if (already?.completedAt) {
      throw new Error("Technology already researched")
    }

    // Check prerequisites
    const prereq = parseJson<{ tech?: string[]; buildings?: Array<{ type: string; level: number }> }>(
      tech.prerequisites,
      { tech: [], buildings: [] },
    )
    const neededTech = prereq.tech ?? []
    const neededBuildings = prereq.buildings ?? []

    for (const req of neededBuildings) {
      const type = String(req.type).toUpperCase()
      const level = req.level || 1
      const b = village.buildings.find((bb) => bb.type === type)
      if ((b?.level ?? 0) < level) {
        throw new Error(`Requires ${type} level ${level}`)
      }
    }

    if (neededTech.length > 0) {
      const completed = await prisma.playerTechnology.findMany({
        where: { playerId },
        include: { technology: true },
      })
      const keys = new Set(completed.filter((p) => p.completedAt).map((p) => p.technology.key))
      for (const k of neededTech) {
        if (!keys.has(k)) {
          throw new Error(`Requires technology ${k}`)
        }
      }
    }

    // Compute effective time
    const speed = village.player?.gameWorld?.speed ?? 1
    const timeSeconds = Math.ceil((tech.baseTimeSeconds || 3600) / Math.max(1, speed))

    // Ensure resources
    const reserved = await ResourceReservationService.getVillageReservedTotals(villageId)
    const available = {
      wood: village.wood - (reserved.wood ?? 0),
      stone: village.stone - (reserved.stone ?? 0),
      iron: village.iron - (reserved.iron ?? 0),
      gold: village.gold - (reserved.gold ?? 0),
      food: village.food - (reserved.food ?? 0),
    }
    const cost = {
      wood: tech.costWood ?? 0,
      stone: tech.costStone ?? 0,
      iron: tech.costIron ?? 0,
      gold: tech.costGold ?? 0,
      food: tech.costFood ?? 0,
    }
    const enough =
      available.wood >= cost.wood &&
      available.stone >= cost.stone &&
      available.iron >= cost.iron &&
      available.gold >= cost.gold &&
      available.food >= cost.food
    if (!enough) throw new Error("Not enough resources for research")

    // Deduct immediately (research cannot be canceled)
    await prisma.village.update({
      where: { id: villageId },
      data: {
        wood: { decrement: cost.wood },
        stone: { decrement: cost.stone },
        iron: { decrement: cost.iron },
        gold: { decrement: cost.gold },
        food: { decrement: cost.food },
      },
    })

    const now = new Date()
    const completionAt = new Date(now.getTime() + timeSeconds * 1000)

    const job = await prisma.researchJob.create({
      data: {
        playerId,
        villageId,
        buildingId: academy.id,
        technologyId: tech.id,
        startedAt: now,
        completionAt,
      },
    })

    await EventQueueService.scheduleEvent(
      "RESEARCH_COMPLETION" as EventQueueType,
      completionAt,
      { jobId: job.id },
      { dedupeKey: `research:${job.id}`, priority: 55 },
    )

    // Ensure playerTechnology row exists for idempotency
    await prisma.playerTechnology.upsert({
      where: { playerId_technologyId: { playerId, technologyId: tech.id } },
      update: {},
      create: { playerId, technologyId: tech.id },
    })

    return { jobId: job.id, completionAt }
  }
}
