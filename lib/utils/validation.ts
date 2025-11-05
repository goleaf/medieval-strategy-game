import { z } from "zod"

// Common validation schemas
export const villageSchema = z.object({
  playerId: z.string().min(1, "Player ID required"),
  continentId: z.string().min(1, "Continent ID required"),
  name: z.string().min(1).max(50).optional(),
  x: z.number().int().min(0).max(1000),
  y: z.number().int().min(0).max(1000),
  selectedTribe: z.string().optional(), // Reign of Fire: tribe selection for first 3 villages
})

export const buildingUpgradeSchema = z.object({
  buildingId: z.string().min(1, "Building ID required"),
})

export const buildingDemolishSchema = z.object({
  buildingId: z.string().min(1, "Building ID required"),
  mode: z.enum(["LEVEL_BY_LEVEL", "INSTANT_COMPLETE", "FULL_BUILDING"]).optional(),
})

export const buildingCancelDemolitionSchema = z.object({
  buildingId: z.string().min(1, "Building ID required"),
})

export const troopTrainSchema = z.object({
  villageId: z.string().min(1, "Village ID required"),
  troopType: z.enum([
    "WARRIOR",
    "SPEARMAN",
    "BOWMAN",
    "HORSEMAN",
    "PALADIN",
    "EAGLE_KNIGHT",
    "RAM",
    "CATAPULT",
    "KNIGHT",
    "NOBLEMAN",
    // Huns-specific units
    "STEPPE_ARCHER",
    "HUN_WARRIOR",
    "LOGADES",
  ]),
  quantity: z.number().int().min(1).max(10000),
})

export const attackLaunchSchema = z.object({
  fromVillageId: z.string().min(1, "From village ID required"),
  toVillageId: z.string().min(1, "To village ID required").optional(),
  toX: z.number().int().min(0).max(1000).optional(),
  toY: z.number().int().min(0).max(1000).optional(),
  type: z.enum(["RAID", "CONQUEST", "SUPPRESSION", "SCOUT"]),
  units: z.array(
    z.object({
      troopId: z.string().min(1),
      quantity: z.number().int().min(1),
    }),
  ),
})

export const reinforcementSendSchema = z.object({
  fromVillageId: z.string().min(1, "From village ID required"),
  toVillageId: z.string().min(1, "To village ID required").optional(),
  toX: z.number().int().min(0).max(1000).optional(),
  toY: z.number().int().min(0).max(1000).optional(),
  units: z.array(
    z.object({
      troopId: z.string().min(1),
      quantity: z.number().int().min(1),
    }),
  ),
})

export const attackCancelSchema = z.object({
  attackId: z.string().min(1, "Attack ID required"),
})

export const marketOrderSchema = z.object({
  villageId: z.string().min(1, "Village ID required"),
  type: z.enum(["SELL", "BUY"]),
  offeringResource: z.enum(["WOOD", "STONE", "IRON", "GOLD", "FOOD"]),
  offeringAmount: z.number().int().min(1),
  requestResource: z.enum(["WOOD", "STONE", "IRON", "GOLD", "FOOD"]),
  requestAmount: z.number().int().min(1),
  expiresAt: z.string().datetime().optional(),
})

export const messageSchema = z.object({
  senderId: z.string().min(1, "Sender ID required"),
  villageId: z.string().min(1).optional(),
  recipientId: z.string().min(1).optional(),
  type: z.enum([
    "ATTACK_INCOMING",
    "ATTACK_RESULT",
    "SCOUT_RESULT",
    "SCOUT_DETECTED",
    "ALLY_REQUEST",
    "DIPLOMACY",
    "TRADE_OFFER",
    "SYSTEM",
  ]),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
})

export const tribeCreateSchema = z.object({
  name: z.string().min(1).max(50),
  tag: z.string().min(1).max(4),
  leaderId: z.string().min(1, "Leader ID required"),
  description: z.string().max(500).optional(),
  joinPolicy: z.enum(["INVITE_ONLY", "OPEN", "APPLICATION"]).optional(),
})

export const tribeInviteSchema = z.object({
  tribeId: z.string().min(1, "Tribe ID required"),
  playerId: z.string().min(1, "Player ID required"),
})

export const tribeJoinSchema = z.object({
  tribeId: z.string().min(1, "Tribe ID required"),
  playerId: z.string().min(1, "Player ID required"),
})

export const mapQuerySchema = z.object({
  centerX: z.number().int().min(0).max(1000).optional(),
  centerY: z.number().int().min(0).max(1000).optional(),
  zoom: z.number().min(0.1).max(10).optional(),
  playerId: z.string().min(1).optional(), // For fog of war
})

export const npcMerchantExchangeSchema = z.object({
  villageId: z.string().min(1, "Village ID required"),
  fromResource: z.enum(["WOOD", "STONE", "IRON", "GOLD", "FOOD"]),
  toResource: z.enum(["WOOD", "STONE", "IRON", "GOLD", "FOOD"]),
  amount: z.number().int().min(50, "Exchange amount must be at least 50"),
})

export const npcMerchantBalanceSchema = z.object({
  villageId: z.string().min(1, "Village ID required"),
})

