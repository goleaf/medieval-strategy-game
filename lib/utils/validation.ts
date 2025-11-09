import { z } from "zod"
import { AttackPresetMission, AttackType, TroopType } from "@prisma/client"
import { TRIBE_PERMISSION_VALUES } from "@/lib/tribes/permissions"
import { NOTIFICATION_PRIORITY_ORDER, NOTIFICATION_SOUND_PRESETS, NOTIFICATION_TYPE_IDS } from "@/lib/config/notification-types"
export type { TribePermissionValue } from "@/lib/tribes/permissions"

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
  troopType: z.string().min(1, "Troop type required"),
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

export const sendSettlersSchema = z.object({
  sourceVillageId: z.string().min(1, "Source village ID required"),
  targetX: z.number().int().min(0).max(1000),
  targetY: z.number().int().min(0).max(1000),
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

export const directResourceSendSchema = z
  .object({
    fromVillageId: z.string().min(1, "From village ID required"),
    toVillageId: z.string().min(1, "To village ID required").optional(),
    toX: z.number().int().min(0).max(1000).optional(),
    toY: z.number().int().min(0).max(1000).optional(),
    resources: z.object({
      wood: z.number().int().min(0).default(0),
      stone: z.number().int().min(0).default(0),
      iron: z.number().int().min(0).default(0),
      gold: z.number().int().min(0).default(0),
      food: z.number().int().min(0).default(0),
    }),
  })
  .refine(
    (data) => {
      if (data.toVillageId) return true
      const hasCoords = data.toX !== undefined && data.toX !== null && data.toY !== undefined && data.toY !== null
      return hasCoords
    },
    {
      message: "Provide destination village coordinates or ID",
      path: ["destination"],
    },
  )

export const messageSchema = z.object({
  senderId: z.string().min(1, "Sender ID required"),
  villageId: z.string().min(1).optional(),
  recipientId: z.string().min(1).optional(),
  allianceRole: z.enum(["ally", "def", "off"]).optional(), // For alliance messaging
  type: z.enum([
    "ATTACK_INCOMING",
    "ATTACK_RESULT",
    "SCOUT_RESULT",
    "SCOUT_DETECTED",
    "ALLY_REQUEST",
    "DIPLOMACY",
    "TRADE_OFFER",
    "SYSTEM",
    "ALLIANCE_ATTACK",
    "PLAYER",
  ]),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
})

const tribePermissionEnum = z.enum(TRIBE_PERMISSION_VALUES)

export const tribeCreateSchema = z.object({
  name: z.string().min(3).max(60),
  tag: z
    .string()
    .min(2)
    .max(6)
    .regex(/^[A-Z0-9]+$/, "Tag must be alphanumeric"),
  leaderId: z.string().min(1, "Leader ID required"),
  description: z.string().max(500).optional().nullable(),
  profileBody: z.string().max(4000).optional().nullable(),
  joinPolicy: z.enum(["INVITE_ONLY", "OPEN", "APPLICATION"]).optional(),
  memberDefaultPermissions: z.array(tribePermissionEnum).max(TRIBE_PERMISSION_VALUES.length).optional(),
  usePremiumBypass: z.boolean().optional(),
})

export const tribeInviteSchema = z.object({
  tribeId: z.string().min(1, "Tribe ID required"),
  playerId: z.string().min(1, "Player ID required"),
  invitedById: z.string().min(1, "Inviter ID required"),
  message: z.string().max(500).optional().nullable(),
  expiresInHours: z.number().int().min(1).max(168).optional(),
})

export const tribeJoinSchema = z.object({
  tribeId: z.string().min(1, "Tribe ID required"),
  playerId: z.string().min(1, "Player ID required"),
})

export const tribeBulkInviteSchema = z.object({
  tribeId: z.string().min(1, "Tribe ID required"),
  invitedById: z.string().min(1, "Inviter ID required"),
  playerIds: z.array(z.string().min(1)).optional(),
  playerNames: z.array(z.string().min(1)).optional(),
  coordinates: z
    .array(
      z.object({
        x: z.number().int(),
        y: z.number().int(),
      }),
    )
    .optional(),
  message: z.string().max(500).optional().nullable(),
})

export const tribeApplicationSubmitSchema = z.object({
  tribeId: z.string().min(1),
  playerId: z.string().min(1),
  message: z.string().max(1000).optional().nullable(),
})

export const tribeApplicationReviewSchema = z.object({
  applicationId: z.string().min(1),
  reviewerId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  responseMessage: z.string().max(1000).optional().nullable(),
})

export const tribeInviteResponseSchema = z.object({
  inviteId: z.string().min(1),
  playerId: z.string().min(1),
  action: z.enum(["ACCEPT", "DECLINE"]),
})

export const tribeRoleUpdateSchema = z.object({
  tribeId: z.string().min(1),
  actorId: z.string().min(1),
  targetPlayerId: z.string().min(1),
  role: z.enum(["CO_FOUNDER", "OFFICER", "MEMBER"]),
  customPermissions: z.array(tribePermissionEnum).max(TRIBE_PERMISSION_VALUES.length).optional(),
})

export const tribeDefaultPermissionSchema = z.object({
  tribeId: z.string().min(1),
  actorId: z.string().min(1),
  memberDefaultPermissions: z.array(tribePermissionEnum).max(TRIBE_PERMISSION_VALUES.length),
})

export const tribeMemberRemovalSchema = z.object({
  tribeId: z.string().min(1),
  actorId: z.string().min(1),
  targetPlayerId: z.string().min(1),
  reason: z.string().max(500).optional().nullable(),
})

const hhmmRegex = /^\d{2}:\d{2}$/
const notificationTypeSettingSchema = z.object({
  enabled: z.boolean().optional(),
  sound: z.enum(NOTIFICATION_SOUND_PRESETS).optional(),
  channels: z
    .object({
      popup: z.boolean().optional(),
      sound: z.boolean().optional(),
      desktop: z.boolean().optional(),
      push: z.boolean().optional(),
      email: z.enum(["none", "critical", "digest"]).optional(),
    })
    .optional(),
})

export const notificationPreferenceUpdateSchema = z.object({
  playerId: z.string().min(1, "Player ID required"),
  importanceThreshold: z.enum(NOTIFICATION_PRIORITY_ORDER).optional(),
  desktopEnabled: z.boolean().optional(),
  mobilePushEnabled: z.boolean().optional(),
  emailFrequency: z.enum(["daily_summary", "critical_only", "disabled"]).optional(),
  suppressNonCriticalDuringQuietHours: z.boolean().optional(),
  quietHours: z
    .object({
      enabled: z.boolean(),
      start: z.string().regex(hhmmRegex).nullable().optional(),
      end: z.string().regex(hhmmRegex).nullable().optional(),
    })
    .optional(),
  typeSettings: z.record(z.string(), notificationTypeSettingSchema).optional(),
  soundProfiles: z.record(z.string(), z.enum(NOTIFICATION_SOUND_PRESETS)).optional(),
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

const attackPresetUnitSchema = z.object({
  troopType: z.nativeEnum(TroopType),
  quantity: z.number().int().min(1).max(100000),
})

const attackPresetBaseSchema = z.object({
  playerId: z.string().min(1, "Player ID required"),
  villageId: z.string().min(1).optional(),
  name: z.string().min(1).max(50),
  type: z.nativeEnum(AttackType),
  mission: z.nativeEnum(AttackPresetMission).default(AttackPresetMission.ATTACK),
  requiresGoldClub: z.boolean().optional(),
  targetVillageId: z.string().min(1).nullable().optional(),
  targetX: z.number().int().min(0).max(1000).nullable().optional(),
  targetY: z.number().int().min(0).max(1000).nullable().optional(),
  preferredArrival: z.string().datetime().optional(),
  waveWindowMs: z.number().int().min(0).max(3_600_000).optional(),
  catapultTargets: z.array(z.string().min(1).max(64)).max(6).optional(),
  units: z.array(attackPresetUnitSchema).min(1),
})

function validateAttackPresetTargetsRequired(data: z.infer<typeof attackPresetBaseSchema>, ctx: z.RefinementCtx) {
  const hasVillageTarget = !!data.targetVillageId
  const hasCoords = data.targetX !== undefined && data.targetX !== null && data.targetY !== undefined && data.targetY !== null

  if (!hasVillageTarget && !hasCoords) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide either targetVillageId or target coordinates",
      path: ["target"],
    })
  }

  if ((data.targetX !== undefined && data.targetX !== null) !== (data.targetY !== undefined && data.targetY !== null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Both targetX and targetY must be supplied together",
      path: ["target"],
    })
  }
}

function validateAttackPresetTargetsOptional(
  data: z.infer<typeof attackPresetBaseSchema> & { presetId?: string },
  ctx: z.RefinementCtx,
) {
  const touchedVillage = data.targetVillageId !== undefined
  const touchedX = data.targetX !== undefined
  const touchedY = data.targetY !== undefined

  if (!touchedVillage && !touchedX && !touchedY) {
    return
  }

  const hasVillageTarget = !!data.targetVillageId
  const hasCoords =
    data.targetX !== undefined && data.targetX !== null && data.targetY !== undefined && data.targetY !== null

  if (!hasVillageTarget && !hasCoords) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide either targetVillageId or target coordinates",
      path: ["target"],
    })
  }

  if (touchedX !== touchedY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Both targetX and targetY must be supplied together",
      path: ["target"],
    })
  }
}

export const attackPresetCreateSchema = attackPresetBaseSchema.superRefine(validateAttackPresetTargetsRequired)

export const attackPresetUpdateSchema = attackPresetBaseSchema
  .extend({
    presetId: z.string().min(1, "Preset ID required"),
    units: z.array(attackPresetUnitSchema).min(1).optional(),
  })
  .partial({
    name: true,
    type: true,
    requiresGoldClub: true,
    targetVillageId: true,
    targetX: true,
    targetY: true,
    preferredArrival: true,
    waveWindowMs: true,
    catapultTargets: true,
    villageId: true,
  })
  .superRefine(validateAttackPresetTargetsOptional)

export const attackPresetQuerySchema = z.object({
  playerId: z.string().min(1, "Player ID required"),
  villageId: z.string().min(1).optional(),
  mission: z.nativeEnum(AttackPresetMission).optional(),
})

export const quicklinkUpdateSchema = z
  .object({
    playerId: z.string().min(1, "Player ID required"),
    scope: z.enum(["PLAYER", "VILLAGE"]),
    villageId: z.string().min(1).optional(),
    slots: z
      .array(
        z.object({
          slotNumber: z.number().int().min(1).max(5),
          quickLinkOptionId: z.string().min(1).nullable(),
        }),
      )
      .max(5),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "PLAYER") {
      if (data.slots.some((slot) => slot.slotNumber > 4)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Player quicklinks only support slots 1-4",
          path: ["slots"],
        })
      }
    } else {
      if (!data.villageId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "villageId is required for village quicklinks",
          path: ["villageId"],
        })
      }
    }
  })

// ============================================================================
// PLAYER PROFILE & SOCIAL GRAPH
// ============================================================================

const profileVisibilityEnum = z.enum(["PUBLIC", "TRIBE_ONLY", "PRIVATE"])
const contactStanceEnum = z.enum(["ALLY", "ENEMY", "FARM", "TRADE", "NEUTRAL"])

export const playerProfileUpdateSchema = z.object({
  playerId: z.string().min(1, "Player ID required"),
  profileHeadline: z.string().max(120).optional().nullable(),
  profileBio: z.string().max(2000).optional().nullable(),
  countryCode: z
    .union([
      z
        .string()
        .length(2)
        .regex(/^[A-Za-z]{2}$/, "Use ISO 3166-1 alpha-2 country codes")
        .transform((value) => value.toUpperCase()),
      z.literal(null),
    ])
    .optional(),
  preferredLanguage: z.string().max(32).optional().nullable(),
  profileVisibility: profileVisibilityEnum.optional(),
  allowFriendRequests: z.boolean().optional(),
  allowMentorship: z.boolean().optional(),
  socialFeedOptIn: z.boolean().optional(),
})

export const playerFriendActionSchema = z.object({
  actorId: z.string().min(1),
  targetId: z.string().min(1),
  action: z.enum(["REQUEST", "ACCEPT", "DECLINE", "REMOVE", "CANCEL"]),
  message: z.string().max(250).optional().nullable(),
})

export const playerContactNoteSchema = z.object({
  ownerId: z.string().min(1),
  targetId: z.string().min(1),
  noteId: z.string().min(1).optional(),
  stance: contactStanceEnum.optional(),
  note: z.string().min(1).max(2000),
  tags: z.array(z.string().min(1).max(32)).max(8).optional(),
})

export const playerBlockActionSchema = z.object({
  actorId: z.string().min(1),
  targetId: z.string().min(1),
  reason: z.string().max(500).optional().nullable(),
  action: z.enum(["BLOCK", "UNBLOCK"]),
})

export const playerEndorsementSchema = z.object({
  actorId: z.string().min(1),
  targetId: z.string().min(1),
  action: z.enum(["ENDORSE", "REVOKE"]),
  message: z.string().max(500).optional().nullable(),
  strength: z.number().int().min(1).max(5).optional(),
})

export const playerMentorshipActionSchema = z.object({
  actorId: z.string().min(1),
  mentorId: z.string().min(1),
  menteeId: z.string().min(1),
  action: z.enum(["REQUEST", "ACCEPT", "DECLINE", "COMPLETE", "CANCEL"]),
  notes: z.string().max(2000).optional().nullable(),
})

const socialActivityTypeEnum = z.enum(["CONQUEST", "DEFENSE", "ACHIEVEMENT", "EXPANSION", "ECONOMY", "SOCIAL"])
const socialVisibilityEnum = z.enum(["PUBLIC", "FRIENDS", "PRIVATE"])

export const playerSocialFeedPostSchema = z.object({
  actorId: z.string().min(1),
  playerId: z.string().min(1),
  summary: z.string().min(1).max(280),
  activityType: socialActivityTypeEnum,
  visibility: socialVisibilityEnum.optional(),
  payload: z.record(z.any()).optional(),
})
