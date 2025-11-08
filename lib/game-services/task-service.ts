import crypto from "node:crypto"
import { prisma } from "@/lib/db"
import type { BuildingType } from "@prisma/client"
import { Prisma } from "@prisma/client"

/**
 * QuestPaneType enumerates the UI panes exposed by the new quest system.
 * We use string literal types so we are not blocked by Prisma client regeneration.
 */
export type QuestPaneType = "MAIN" | "TRIBE" | "EVENT" | "MENTOR"

/**
 * QuestMetricType identifies how progress is calculated for a quest.
 */
type QuestMetricType =
  | "BUILDING_LEVEL"
  | "JOIN_TRIBE"
  | "COMPLETE_TUTORIAL"
  | "OTHER"

/**
 * QuestRewardSourceType mirrors the QuestRewardSource enum in the Prisma schema.
 */
type QuestRewardSourceType = "QUEST" | "BUILDING_REFUND" | "SYSTEM"

/**
 * QuestBlueprints represent the canonical definition of quests we seed into the database.
 */
interface QuestBlueprint {
  key: string
  pane: QuestPaneType
  title: string
  description: string
  metric: QuestMetricType
  targetValue: number
  sortOrder: number
  rewards: {
    wood?: number
    stone?: number
    iron?: number
    gold?: number
    food?: number
    heroExperience?: number
  }
  isEventQuest?: boolean
  eventKey?: string
  metadata?: Record<string, unknown>
}

/**
 * QuestDefinitionRow reflects the persisted quest definition stored in SQLite.
 */
interface QuestDefinitionRow {
  id: string
  key: string
  pane: QuestPaneType
  title: string
  description: string
  metric: QuestMetricType
  targetValue: number
  rewardWood: number
  rewardStone: number
  rewardIron: number
  rewardGold: number
  rewardFood: number
  rewardHeroExperience: number
  isRepeatable: number
  isEventQuest: number
  eventKey: string | null
  sortOrder: number
  metadata: string | null
}

/**
 * QuestProgressRow captures current progress for a player/quest pair.
 */
interface QuestProgressRow {
  id: string
  questId: string
  playerId: string
  currentValue: number
  targetValue: number
  completedAt: string | null
  metadata: string | null
}

/**
 * QuestRewardRow models an unclaimed reward entry.
 */
interface QuestRewardRow {
  id: string
  playerId: string
  questId: string | null
  source: QuestRewardSourceType
  sourceReference: string | null
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  heroExperience: number
  metadata: string | null
  createdAt: string
  claimedAt: string | null
}

/**
 * QuestSummary is returned to the API caller for each quest.
 */
export interface QuestSummary {
  id: string
  key: string
  title: string
  description: string
  pane: QuestPaneType
  status: "NOT_STARTED" | "IN_PROGRESS" | "READY_TO_CLAIM" | "COMPLETE"
  progress: number
  targetValue: number
  rewardPreview: {
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
    heroExperience: number
  }
  metadata: Record<string, unknown>
}

/**
 * QuestPaneSummary describes a pane and the quests/rewards within it.
 */
export interface QuestPaneSummary {
  pane: QuestPaneType | "REWARDS"
  visible: boolean
  quests: QuestSummary[]
  rewards: QuestRewardRow[]
}

/**
 * Blueprint catalog describing the new quest system.
 * The rewards map intentionally mirrors the flexible resource refund system.
 */
const QUEST_BLUEPRINTS: QuestBlueprint[] = [
  {
    key: "MAIN_BUILD_HEADQUARTERS_L3",
    pane: "MAIN",
    title: "Raise Headquarters to Level 3",
    description: "Upgrade your Headquarters to accelerate every future build order.",
    metric: "BUILDING_LEVEL",
    targetValue: 3,
    sortOrder: 10,
    rewards: { wood: 300, stone: 300, iron: 300, gold: 0, food: 300, heroExperience: 25 },
    metadata: { buildingType: "HEADQUARTER" },
  },
  {
    key: "MAIN_BUILD_MARKETPLACE_L1",
    pane: "MAIN",
    title: "Open the Marketplace",
    description: "Construct a Marketplace so you can trade or send support.",
    metric: "BUILDING_LEVEL",
    targetValue: 1,
    sortOrder: 20,
    rewards: { wood: 200, stone: 200, iron: 200, gold: 0, food: 200, heroExperience: 15 },
    metadata: { buildingType: "MARKETPLACE" },
  },
  {
    key: "MAIN_BUILD_BARRACKS_L3",
    pane: "MAIN",
    title: "Train an Army",
    description: "Push your Barracks to level 3 to unlock reliable troop production.",
    metric: "BUILDING_LEVEL",
    targetValue: 3,
    sortOrder: 30,
    rewards: { wood: 350, stone: 350, iron: 350, gold: 0, food: 350, heroExperience: 35 },
    metadata: { buildingType: "BARRACKS" },
  },
  {
    key: "TRIBE_JOIN_ALLIANCE",
    pane: "TRIBE",
    title: "Join a Tribe",
    description: "Find allies or accept an invitation to unlock social quests.",
    metric: "JOIN_TRIBE",
    targetValue: 1,
    sortOrder: 10,
    rewards: { wood: 400, stone: 400, iron: 400, gold: 0, food: 400, heroExperience: 30 },
  },
  {
    key: "MENTOR_STARTER_KIT",
    pane: "MENTOR",
    title: "Claim Your Starter Kit",
    description: "Log in after the tutorial to receive a stocked warehouse boost.",
    metric: "COMPLETE_TUTORIAL",
    targetValue: 1,
    sortOrder: 5,
    rewards: { wood: 500, stone: 500, iron: 500, gold: 0, food: 500, heroExperience: 20 },
    metadata: { autoComplete: true },
  },
  {
    key: "MENTOR_BUILD_WAREHOUSE_L2",
    pane: "MENTOR",
    title: "Secure Storage",
    description: "Upgrade a Warehouse to level 2 so resource refunds never overflow.",
    metric: "BUILDING_LEVEL",
    targetValue: 2,
    sortOrder: 15,
    rewards: { wood: 250, stone: 250, iron: 250, gold: 0, food: 250, heroExperience: 20 },
    metadata: { buildingType: "WAREHOUSE" },
  },
  {
    key: "EVENT_WINTER_MARKET",
    pane: "EVENT",
    title: "Complete a Winter Market Delivery",
    description: "Deliver any event item during the Winter Fair to earn bonus refunds.",
    metric: "OTHER",
    targetValue: 1,
    sortOrder: 10,
    rewards: { wood: 200, stone: 200, iron: 200, gold: 200, food: 200, heroExperience: 50 },
    isEventQuest: true,
    eventKey: "WINTER_FAIR",
  },
]

/**
 * Helper returning the immutable quest blueprint list.
 */
export function getQuestBlueprints(): QuestBlueprint[] {
  return QUEST_BLUEPRINTS.map((entry) => ({ ...entry, metadata: entry.metadata ? { ...entry.metadata } : undefined }))
}

/**
 * Ensure all blueprint quests exist in the database.
 * We rely on SQLite upserts so repeated calls are safe.
 */
async function ensureQuestDefinitions(): Promise<void> {
  for (const blueprint of QUEST_BLUEPRINTS) {
    const metadataJson = blueprint.metadata ? JSON.stringify(blueprint.metadata) : null
    const nowIso = new Date().toISOString()

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "QuestDefinition"
          ("id", "key", "pane", "title", "description", "metric", "targetValue", "rewardWood",
           "rewardStone", "rewardIron", "rewardGold", "rewardFood", "rewardHeroExperience",
           "isRepeatable", "isEventQuest", "eventKey", "sortOrder", "metadata", "createdAt", "updatedAt")
        VALUES
          (${crypto.randomUUID()}, ${blueprint.key}, ${blueprint.pane}, ${blueprint.title}, ${blueprint.description},
           ${blueprint.metric}, ${blueprint.targetValue}, ${blueprint.rewards.wood ?? 0}, ${blueprint.rewards.stone ?? 0},
           ${blueprint.rewards.iron ?? 0}, ${blueprint.rewards.gold ?? 0}, ${blueprint.rewards.food ?? 0},
           ${blueprint.rewards.heroExperience ?? 0}, 0, ${blueprint.isEventQuest ? 1 : 0}, ${blueprint.eventKey ?? null},
           ${blueprint.sortOrder}, ${metadataJson}, ${nowIso}, ${nowIso})
        ON CONFLICT("key") DO UPDATE SET
          "pane" = excluded."pane",
          "title" = excluded."title",
          "description" = excluded."description",
          "metric" = excluded."metric",
          "targetValue" = excluded."targetValue",
          "rewardWood" = excluded."rewardWood",
          "rewardStone" = excluded."rewardStone",
          "rewardIron" = excluded."rewardIron",
          "rewardGold" = excluded."rewardGold",
          "rewardFood" = excluded."rewardFood",
          "rewardHeroExperience" = excluded."rewardHeroExperience",
          "isEventQuest" = excluded."isEventQuest",
          "eventKey" = excluded."eventKey",
          "sortOrder" = excluded."sortOrder",
          "metadata" = excluded."metadata",
          "updatedAt" = excluded."updatedAt"
      `,
    )
  }
}

/**
 * Pull quest definitions from SQLite so we have canonical IDs for progress tracking.
 */
async function fetchQuestDefinitions(): Promise<QuestDefinitionRow[]> {
  const rows = await prisma.$queryRaw<QuestDefinitionRow[]>(Prisma.sql`
    SELECT
      "id", "key", "pane", "title", "description", "metric", "targetValue",
      "rewardWood", "rewardStone", "rewardIron", "rewardGold", "rewardFood", "rewardHeroExperience",
      "isRepeatable", "isEventQuest", "eventKey", "sortOrder", "metadata"
    FROM "QuestDefinition"
  `)
  return rows
}

/**
 * Query quest progress rows for a given player.
 */
async function fetchQuestProgress(playerId: string): Promise<QuestProgressRow[]> {
  return prisma.$queryRaw<QuestProgressRow[]>(Prisma.sql`
    SELECT "id", "questId", "playerId", "currentValue", "targetValue", "completedAt", "metadata"
    FROM "QuestProgress"
    WHERE "playerId" = ${playerId}
  `)
}

/**
 * Query all rewards tied to the provided player.
 */
async function fetchQuestRewards(playerId: string): Promise<QuestRewardRow[]> {
  return prisma.$queryRaw<QuestRewardRow[]>(Prisma.sql`
    SELECT
      "id", "playerId", "questId", "source", "sourceReference", "wood", "stone", "iron", "gold", "food",
      "heroExperience", "metadata", "createdAt", "claimedAt"
    FROM "QuestReward"
    WHERE "playerId" = ${playerId}
    ORDER BY "createdAt" ASC
  `)
}

/**
 * Resolve currently active event keys. In the absence of a live event service we return an empty list,
 * but the hook is preserved so event quests only appear when an event is configured.
 */
async function resolveActiveEventKeys(playerId: string): Promise<Set<string>> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { gameWorld: { select: { id: true } } },
  })

  if (!player?.gameWorld?.id) {
    return new Set()
  }

  // Future: inspect worldConfig.metadata for event toggles. For now we surface an empty set.
  return new Set<string>()
}

/**
 * Evaluate a quest for a player and refresh their progress + rewards.
 */
async function evaluateQuestForPlayer(quest: QuestDefinitionRow, playerId: string): Promise<void> {
  const metadata = quest.metadata ? JSON.parse(quest.metadata) as Record<string, unknown> : {}
  let currentValue = 0

  if (quest.metric === "BUILDING_LEVEL") {
    const buildingType = (metadata?.buildingType ?? "") as string
    if (buildingType) {
      const aggregate = await prisma.building.aggregate({
        where: {
          type: buildingType as BuildingType,
          village: { playerId },
        },
        _max: { level: true },
      })
      currentValue = aggregate._max.level ?? 0
    }
  } else if (quest.metric === "JOIN_TRIBE") {
    const player = await prisma.player.findUnique({ where: { id: playerId }, select: { tribeId: true } })
    currentValue = player?.tribeId ? 1 : 0
  } else if (quest.metric === "COMPLETE_TUTORIAL") {
    currentValue = metadata?.autoComplete ? quest.targetValue : 0
  } else {
    currentValue = metadata?.autoComplete ? quest.targetValue : 0
  }

  const nowIso = new Date().toISOString()
  const metadataJson = JSON.stringify({ ...metadata, snapshotValue: currentValue })

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "QuestProgress"
        ("id", "questId", "playerId", "currentValue", "targetValue", "completedAt", "metadata", "createdAt", "updatedAt")
      VALUES
        (${crypto.randomUUID()}, ${quest.id}, ${playerId}, ${currentValue}, ${quest.targetValue},
         ${currentValue >= quest.targetValue ? nowIso : null}, ${metadataJson}, ${nowIso}, ${nowIso})
      ON CONFLICT("questId", "playerId") DO UPDATE SET
        "currentValue" = excluded."currentValue",
        "targetValue" = excluded."targetValue",
        "metadata" = excluded."metadata",
        "updatedAt" = ${nowIso},
        "completedAt" = CASE
          WHEN excluded."currentValue" >= excluded."targetValue" THEN COALESCE("QuestProgress"."completedAt", ${nowIso})
          ELSE NULL
        END
    `,
  )

  if (currentValue >= quest.targetValue) {
    const hasReward =
      quest.rewardWood ||
      quest.rewardStone ||
      quest.rewardIron ||
      quest.rewardGold ||
      quest.rewardFood ||
      quest.rewardHeroExperience

    if (hasReward) {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "QuestReward"
            ("id", "playerId", "questId", "source", "sourceReference", "wood", "stone", "iron", "gold", "food",
             "heroExperience", "metadata", "createdAt")
          VALUES
            (${crypto.randomUUID()}, ${playerId}, ${quest.id}, ${"QUEST" satisfies QuestRewardSourceType}, NULL,
             ${quest.rewardWood}, ${quest.rewardStone}, ${quest.rewardIron}, ${quest.rewardGold}, ${quest.rewardFood},
             ${quest.rewardHeroExperience}, ${metadataJson}, ${nowIso})
          ON CONFLICT("questId", "playerId", "source") DO NOTHING
      `,
      )
    }
  }
}

/**
 * Synchronise quest progress for a player. Event keys can be supplied to expose temporary panes.
 */
export async function syncQuestProgressForPlayer(
  playerId: string,
  options?: { eventKeys?: string[] },
): Promise<void> {
  await ensureQuestDefinitions()
  const activeEventKeys = new Set(options?.eventKeys ?? [])
  if (activeEventKeys.size === 0) {
    const resolved = await resolveActiveEventKeys(playerId)
    resolved.forEach((key) => activeEventKeys.add(key))
  }

  const definitions = await fetchQuestDefinitions()

  for (const quest of definitions) {
    if (quest.isEventQuest && (!quest.eventKey || !activeEventKeys.has(quest.eventKey))) {
      continue
    }
    await evaluateQuestForPlayer(quest, playerId)
  }
}

/**
 * Collect quest pane summaries, always including the Rewards pane even if empty.
 */
export async function getQuestPaneState(
  playerId: string,
  options?: { eventKeys?: string[] },
): Promise<QuestPaneSummary[]> {
  await syncQuestProgressForPlayer(playerId, options)

  const [definitions, progressRows, rewardRows] = await Promise.all([
    fetchQuestDefinitions(),
    fetchQuestProgress(playerId),
    fetchQuestRewards(playerId),
  ])

  const progressMap = new Map<string, QuestProgressRow>()
  for (const progress of progressRows) {
    progressMap.set(progress.questId, progress)
  }

  const rewardsByQuest = new Map<string, QuestRewardRow[]>()
  for (const reward of rewardRows) {
    if (reward.questId) {
      const list = rewardsByQuest.get(reward.questId) ?? []
      list.push(reward)
      rewardsByQuest.set(reward.questId, list)
    }
  }

  const activeEventKeys = new Set(options?.eventKeys ?? [])
  if (activeEventKeys.size === 0) {
    const resolved = await resolveActiveEventKeys(playerId)
    resolved.forEach((key) => activeEventKeys.add(key))
  }

  const panes = new Map<string, QuestSummary[]>()

  for (const quest of definitions) {
    if (quest.isEventQuest && (!quest.eventKey || !activeEventKeys.has(quest.eventKey))) {
      continue
    }

    const metadata = quest.metadata ? (JSON.parse(quest.metadata) as Record<string, unknown>) : {}
    const progress = progressMap.get(quest.id)
    const rewardList = rewardsByQuest.get(quest.id) ?? []
    const hasUnclaimed = rewardList.some((reward) => reward.claimedAt === null)
    let status: QuestSummary["status"] = "NOT_STARTED"

    if (progress?.currentValue) {
      status = "IN_PROGRESS"
    }
    if (progress?.completedAt) {
      status = hasUnclaimed ? "READY_TO_CLAIM" : "COMPLETE"
    }

    const summary: QuestSummary = {
      id: quest.id,
      key: quest.key,
      title: quest.title,
      description: quest.description,
      pane: quest.pane,
      status,
      progress: progress?.currentValue ?? 0,
      targetValue: quest.targetValue,
      rewardPreview: {
        wood: quest.rewardWood,
        stone: quest.rewardStone,
        iron: quest.rewardIron,
        gold: quest.rewardGold,
        food: quest.rewardFood,
        heroExperience: quest.rewardHeroExperience,
      },
      metadata,
    }

    const list = panes.get(quest.pane) ?? []
    list.push(summary)
    panes.set(quest.pane, list)
  }

  const paneSummaries: QuestPaneSummary[] = []
  for (const pane of ["MAIN", "TRIBE", "MENTOR", "EVENT"] as QuestPaneType[]) {
    const quests = (panes.get(pane) ?? []).sort((a, b) => a.targetValue - b.targetValue)
    const visible = pane !== "EVENT" ? true : quests.length > 0
    paneSummaries.push({ pane, visible, quests, rewards: [] })
  }

  paneSummaries.push({ pane: "REWARDS", visible: true, quests: [], rewards: rewardRows.filter((r) => !r.claimedAt) })
  return paneSummaries
}

/**
 * Register a building completion refund. Refunds are stored as claimable rewards to respect the new Rewards pane.
 */
export async function registerBuildingRefund(args: {
  playerId: string
  villageId: string
  buildingType: BuildingType
  newLevel: number
  cost: { wood: number; stone: number; iron: number; gold: number; food: number }
  queueTaskId?: string | null
  worldConfigId?: string | null
}): Promise<QuestRewardRow | null> {
  const { playerId, villageId, buildingType, newLevel, cost, queueTaskId } = args

  const worldConfig = await prisma.worldConfig.findFirst({
    where: { gameWorld: { players: { some: { id: playerId } } } },
    select: { questRefundPercentage: true },
  })
  const refundRatio = worldConfig?.questRefundPercentage ?? 0.1

  if (refundRatio <= 0) {
    return null
  }

  const wood = Math.round(cost.wood * refundRatio)
  const stone = Math.round(cost.stone * refundRatio)
  const iron = Math.round(cost.iron * refundRatio)
  const gold = Math.round(cost.gold * refundRatio)
  const food = Math.round(cost.food * refundRatio)

  if (wood + stone + iron + gold + food === 0) {
    return null
  }

  const metadataJson = JSON.stringify({ villageId, buildingType, newLevel, refundRatio })
  const rewardId = crypto.randomUUID()
  const nowIso = new Date().toISOString()

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "QuestReward"
        ("id", "playerId", "questId", "source", "sourceReference", "wood", "stone", "iron", "gold", "food",
         "heroExperience", "metadata", "createdAt")
      VALUES
        (${rewardId}, ${playerId}, NULL, ${"BUILDING_REFUND" satisfies QuestRewardSourceType}, ${queueTaskId ?? null},
         ${wood}, ${stone}, ${iron}, ${gold}, ${food}, 0, ${metadataJson}, ${nowIso})
      ON CONFLICT("sourceReference", "playerId", "source") DO NOTHING
  `,
  )

  const rewards = await fetchQuestRewards(playerId)
  const inserted = rewards.find((reward) => reward.id === rewardId)
  if (inserted) {
    return inserted
  }

  if (queueTaskId) {
    return rewards.find(
      (reward) => reward.source === "BUILDING_REFUND" && reward.sourceReference === queueTaskId,
    ) ?? null
  }

  return null
}

/**
 * Claim quest rewards and deposit them into a chosen village.
 */
export async function claimQuestRewards(
  playerId: string,
  rewardIds: string[],
  villageId: string,
): Promise<{ claimedRewards: QuestRewardRow[]; total: { wood: number; stone: number; iron: number; gold: number; food: number; heroExperience: number } }> {
  if (!rewardIds.length) {
    return { claimedRewards: [], total: { wood: 0, stone: 0, iron: 0, gold: 0, food: 0, heroExperience: 0 } }
  }

  const rewards = await prisma.$queryRaw<QuestRewardRow[]>(
    Prisma.sql`
      SELECT "id", "playerId", "questId", "source", "sourceReference", "wood", "stone", "iron", "gold", "food",
             "heroExperience", "metadata", "createdAt", "claimedAt"
      FROM "QuestReward"
      WHERE "playerId" = ${playerId} AND "id" IN (${Prisma.join(rewardIds)}) AND "claimedAt" IS NULL
    `,
  )

  if (!rewards.length) {
    return { claimedRewards: [], total: { wood: 0, stone: 0, iron: 0, gold: 0, food: 0, heroExperience: 0 } }
  }

  const village = await prisma.village.findFirst({ where: { id: villageId, playerId } })
  if (!village) {
    throw new Error("Village not found or not owned by player")
  }

  const total = rewards.reduce(
    (acc, reward) => ({
      wood: acc.wood + reward.wood,
      stone: acc.stone + reward.stone,
      iron: acc.iron + reward.iron,
      gold: acc.gold + reward.gold,
      food: acc.food + reward.food,
      heroExperience: acc.heroExperience + reward.heroExperience,
    }),
    { wood: 0, stone: 0, iron: 0, gold: 0, food: 0, heroExperience: 0 },
  )

  await prisma.$transaction([
    prisma.village.update({
      where: { id: villageId },
      data: {
        wood: { increment: total.wood },
        stone: { increment: total.stone },
        iron: { increment: total.iron },
        gold: { increment: total.gold },
        food: { increment: total.food },
      },
    }),
    ...rewards.map((reward) =>
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE "QuestReward"
          SET "claimedAt" = ${new Date().toISOString()}
          WHERE "id" = ${reward.id}
        `,
      ),
    ),
  ])

  if (total.heroExperience > 0) {
    const hero = await prisma.hero.findFirst({ where: { playerId }, select: { id: true, experience: true } })
    if (hero) {
      await prisma.hero.update({
        where: { id: hero.id },
        data: {
          experience: hero.experience + total.heroExperience,
        },
      })
    }
  }

  return { claimedRewards: rewards, total }
}

/**
 * Legacy helper retained for compatibility: refresh quests when a building finishes.
 */
export async function updateTaskProgress(playerId: string, _villageId?: string): Promise<void> {
  await syncQuestProgressForPlayer(playerId)
}

/**
 * Legacy helper retained for compatibility: ensure quests exist when a new village is created.
 */
export async function createTasksForVillage(villageId: string, playerId: string): Promise<void> {
  await syncQuestProgressForPlayer(playerId)
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "QuestReward"
      SET "metadata" = json_set(COALESCE("metadata", '{}'), '$.lastVillageId', ${villageId})
      WHERE "playerId" = ${playerId} AND "metadata" IS NOT NULL
    `,
  )
}

/**
 * Legacy helper retained for compatibility: re-sync quests on conquest transfer.
 */
export async function handleVillageConquest(_villageId: string, newPlayerId: string): Promise<void> {
  await syncQuestProgressForPlayer(newPlayerId)
}

/**
 * Legacy helper retained for compatibility with the test harness. Returns the seeded quest definitions.
 */
export function getAllTaskDefinitions(): QuestBlueprint[] {
  return getQuestBlueprints()
}
