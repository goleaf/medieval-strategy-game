/*
  Warnings:

  - You are about to drop the column `endsAt` on the `Alliance` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Alliance` table. All the data in the column will be lost.
  - You are about to drop the column `tribe1Id` on the `Alliance` table. All the data in the column will be lost.
  - You are about to drop the column `tribe2Id` on the `Alliance` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionAt` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionCost` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionMode` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `isDemolishing` on the `Building` table. All the data in the column will be lost.
  - You are about to alter the column `nightPolicyConfig` on the `WorldConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `scoutingConfig` on the `WorldConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - Added the required column `founderId` to the `Alliance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Alliance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `normalizedName` to the `Alliance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Alliance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tag` to the `Alliance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Alliance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "BuildingBlueprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL,
    "prerequisites" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BuildingLevel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "blueprintId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "costWood" INTEGER NOT NULL,
    "costClay" INTEGER NOT NULL,
    "costIron" INTEGER NOT NULL,
    "costCrop" INTEGER NOT NULL,
    "buildTimeSeconds" INTEGER NOT NULL,
    "cpPerHour" REAL NOT NULL DEFAULT 0,
    "effects" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BuildingLevel_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "BuildingBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VillageQueueLimit" (
    "villageId" TEXT NOT NULL PRIMARY KEY,
    "maxWaiting" INTEGER NOT NULL DEFAULT 1,
    "parallelFieldSlots" INTEGER NOT NULL DEFAULT 0,
    "parallelInnerSlots" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VillageQueueLimit_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuildQueueTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "buildingId" TEXT,
    "slot" INTEGER,
    "entityKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishesAt" DATETIME,
    "cancelledAt" DATETIME,
    "completedAt" DATETIME,
    "position" INTEGER NOT NULL,
    "speedSnapshot" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'PLAYER',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BuildQueueTask_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuildQueueTask_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountCulturePoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "total" REAL NOT NULL DEFAULT 0,
    "perHour" REAL NOT NULL DEFAULT 0,
    "villagesAllowed" INTEGER NOT NULL DEFAULT 1,
    "villagesUsed" INTEGER NOT NULL DEFAULT 1,
    "lastAccruedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountCulturePoint_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CulturePointThreshold" (
    "villageNumber" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cpRequired" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnitType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "attack" INTEGER NOT NULL,
    "defInf" INTEGER NOT NULL,
    "defCav" INTEGER NOT NULL,
    "speedTilesPerHour" REAL NOT NULL,
    "carry" INTEGER NOT NULL,
    "upkeepCropPerHour" REAL NOT NULL,
    "popCost" INTEGER NOT NULL,
    "trainTimeSec" INTEGER NOT NULL,
    "costWood" INTEGER NOT NULL,
    "costClay" INTEGER NOT NULL,
    "costIron" INTEGER NOT NULL,
    "costCrop" INTEGER NOT NULL,
    "buildingReqJson" TEXT NOT NULL,
    "researchReqJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnitTech" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "attackLevel" INTEGER NOT NULL DEFAULT 0,
    "defenseLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitTech_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitTech_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnitStack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitStack_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitStack_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "startAt" DATETIME NOT NULL,
    "finishAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingQueueItem_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingQueueItem_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpansionLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceVillageId" TEXT NOT NULL,
    "targetVillageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpansionLink_sourceVillageId_fkey" FOREIGN KEY ("sourceVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpansionLink_targetVillageId_fkey" FOREIGN KEY ("targetVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RallyPoint" (
    "villageId" TEXT NOT NULL PRIMARY KEY,
    "level" INTEGER NOT NULL DEFAULT 1,
    "waveWindowMs" INTEGER NOT NULL DEFAULT 150,
    "optionsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RallyPoint_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RallyPointPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RallyPointPreset_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RallyPointBookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetVillageId" TEXT,
    "targetX" INTEGER,
    "targetY" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RallyPointBookmark_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RallyPointBookmark_targetVillageId_fkey" FOREIGN KEY ("targetVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RallyPointWaveGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "arriveAt" DATETIME NOT NULL,
    "jitterMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RallyPointWaveGroup_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RallyPointWaveMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "waveGroupId" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "targetVillageId" TEXT,
    "targetX" INTEGER NOT NULL,
    "targetY" INTEGER NOT NULL,
    "unitsJson" TEXT NOT NULL,
    "catapultTargetsJson" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "arriveAt" DATETIME NOT NULL,
    "departAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RallyPointWaveMember_waveGroupId_fkey" FOREIGN KEY ("waveGroupId") REFERENCES "RallyPointWaveGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RallyPointWaveMember_targetVillageId_fkey" FOREIGN KEY ("targetVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RallyPointMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mission" TEXT NOT NULL,
    "ownerAccountId" TEXT NOT NULL,
    "fromVillageId" TEXT NOT NULL,
    "toVillageId" TEXT,
    "toTileX" INTEGER NOT NULL,
    "toTileY" INTEGER NOT NULL,
    "departAt" DATETIME NOT NULL,
    "arriveAt" DATETIME NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_ROUTE',
    "createdBy" TEXT NOT NULL DEFAULT 'PLAYER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "idempotencyKey" TEXT,
    "waveGroupId" TEXT,
    "waveMemberId" TEXT,
    CONSTRAINT "RallyPointMovement_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RallyPointMovement_fromVillageId_fkey" FOREIGN KEY ("fromVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RallyPointMovement_toVillageId_fkey" FOREIGN KEY ("toVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RallyPointMovement_waveGroupId_fkey" FOREIGN KEY ("waveGroupId") REFERENCES "RallyPointWaveGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RallyPointMovement_waveMemberId_fkey" FOREIGN KEY ("waveMemberId") REFERENCES "RallyPointWaveMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RallyPointMovementReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movementId" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RallyPointMovementReport_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "RallyPointMovement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GarrisonStack" (
    "villageId" TEXT NOT NULL,
    "ownerAccountId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("villageId", "ownerAccountId", "unitTypeId"),
    CONSTRAINT "GarrisonStack_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GarrisonStack_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TribeTreaty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tribe1Id" TEXT NOT NULL,
    "tribe2Id" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TribeTreaty_tribe1Id_fkey" FOREIGN KEY ("tribe1Id") REFERENCES "Tribe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TribeTreaty_tribe2Id_fkey" FOREIGN KEY ("tribe2Id") REFERENCES "Tribe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceQuestionnaireTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT,
    "name" TEXT NOT NULL,
    "questions" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceQuestionnaireTemplate_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rankId" TEXT,
    "squadId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'PROSPECT',
    "joinedAt" DATETIME,
    "probationEndsAt" DATETIME,
    "lastPromotionAt" DATETIME,
    "contributionScore" INTEGER NOT NULL DEFAULT 0,
    "isBarredFromLeadership" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" DATETIME,
    "noteCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceMember_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceMember_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "AllianceRank" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AllianceMember_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "AllianceSquad" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceRank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "color" TEXT,
    "canLead" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "inheritsFromId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "permissionsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceRank_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceRank_inheritsFromId_fkey" FOREIGN KEY ("inheritsFromId") REFERENCES "AllianceRank" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlliancePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlliancePermission_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceRankPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rankId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "allow" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceRankPermission_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "AllianceRank" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceRankPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "AlliancePermission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceMemberPermissionOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "allow" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceMemberPermissionOverride_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "AllianceMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceMemberPermissionOverride_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "AlliancePermission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlliancePermissionVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlliancePermissionVersion_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceSquad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AllianceSquad_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceForum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "postingRules" TEXT,
    "pinLimit" INTEGER NOT NULL DEFAULT 5,
    "archiveAfterDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceForum_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceBoard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forumId" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibilityScope" TEXT NOT NULL DEFAULT 'ALL',
    "visibilityConfig" TEXT,
    "postingRules" TEXT,
    "pinLimit" INTEGER NOT NULL DEFAULT 3,
    "archiveAfterDays" INTEGER,
    "quotaPerDay" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AllianceBoard_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "AllianceForum" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceBoard_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "authorMemberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "lastPostAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AllianceThread_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceThread_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "AllianceBoard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceThread_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "AllianceMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlliancePost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "authorMemberId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "moderationLog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AlliancePost_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AllianceThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlliancePost_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlliancePost_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "AllianceMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceThreadReadState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "lastReadPostId" TEXT,
    "lastReadAt" DATETIME,
    "shard" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceThreadReadState_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AllianceThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceThreadReadState_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "AllianceMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceThreadReadState_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "authorMemberId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "targetingScope" TEXT NOT NULL DEFAULT 'ALL',
    "targetingFilters" TEXT,
    "localizedPayload" TEXT NOT NULL,
    "requireAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursBypassed" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" DATETIME,
    "sentAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceAnnouncement_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceAnnouncement_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "AllianceMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceAnnouncementReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" DATETIME,
    "escalatedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AllianceAnnouncementReceipt_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "AllianceAnnouncement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceAnnouncementReceipt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "AllianceMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceAnnouncementTargetLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "memberId" TEXT,
    "deliveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quietHourBypassed" BOOLEAN NOT NULL DEFAULT false,
    "decision" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AllianceAnnouncementTargetLog_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceAnnouncementTargetLog_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "AllianceAnnouncement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceAnnouncementTargetLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "AllianceMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "actorId" TEXT,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeState" TEXT,
    "afterState" TEXT,
    "confirmationToken" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AllianceAuditLog_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "message" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceInvite_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceInvite_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "answers" TEXT,
    "expiresAt" DATETIME,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceApplication_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceApplication_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceMemberNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'STANDARD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AllianceMemberNote_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceMemberNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "AllianceMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceMemberNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AllianceMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceGovernanceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "loneLeader" BOOLEAN NOT NULL DEFAULT false,
    "pendingTransfers" INTEGER NOT NULL DEFAULT 0,
    "probationCount" INTEGER NOT NULL DEFAULT 0,
    "auditHotspots" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AllianceGovernanceSnapshot_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllianceDiplomacySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "targetAllianceId" TEXT,
    "relationType" TEXT NOT NULL,
    "notes" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceDiplomacySnapshot_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllianceDiplomacySnapshot_targetAllianceId_fkey" FOREIGN KEY ("targetAllianceId") REFERENCES "Alliance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AllianceDiplomacySnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AllianceMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alliance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldId" TEXT,
    "founderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "description" TEXT,
    "motto" TEXT,
    "motd" TEXT,
    "seedPreset" TEXT NOT NULL DEFAULT 'DEFAULT_GLOBAL',
    "recruitmentStatus" TEXT NOT NULL DEFAULT 'CLOSED',
    "state" TEXT NOT NULL DEFAULT 'FORMING',
    "allowMultiMembership" BOOLEAN NOT NULL DEFAULT false,
    "allowAutoJoin" BOOLEAN NOT NULL DEFAULT false,
    "creationCostPaid" BOOLEAN NOT NULL DEFAULT false,
    "softCapWarningThreshold" INTEGER NOT NULL DEFAULT 54,
    "hardCap" INTEGER NOT NULL DEFAULT 60,
    "maxPendingInvites" INTEGER NOT NULL DEFAULT 90,
    "maxPendingApplications" INTEGER NOT NULL DEFAULT 100,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "questionnaireTemplateId" TEXT,
    "disbandedAt" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Alliance_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "GameWorld" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alliance_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alliance_questionnaireTemplateId_fkey" FOREIGN KEY ("questionnaireTemplateId") REFERENCES "AllianceQuestionnaireTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Alliance" ("createdAt", "id") SELECT "createdAt", "id" FROM "Alliance";
DROP TABLE "Alliance";
ALTER TABLE "new_Alliance" RENAME TO "Alliance";
CREATE UNIQUE INDEX "Alliance_tag_key" ON "Alliance"("tag");
CREATE UNIQUE INDEX "Alliance_slug_key" ON "Alliance"("slug");
CREATE INDEX "Alliance_worldId_idx" ON "Alliance"("worldId");
CREATE INDEX "Alliance_language_idx" ON "Alliance"("language");
CREATE INDEX "Alliance_state_idx" ON "Alliance"("state");
CREATE INDEX "Alliance_recruitmentStatus_idx" ON "Alliance"("recruitmentStatus");
CREATE INDEX "Alliance_normalizedName_idx" ON "Alliance"("normalizedName");
CREATE TABLE "new_Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "slot" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isBuilding" BOOLEAN NOT NULL DEFAULT false,
    "completionAt" DATETIME,
    "queuePosition" INTEGER,
    "constructionCostWood" INTEGER NOT NULL DEFAULT 0,
    "constructionCostStone" INTEGER NOT NULL DEFAULT 0,
    "constructionCostIron" INTEGER NOT NULL DEFAULT 0,
    "constructionCostGold" INTEGER NOT NULL DEFAULT 0,
    "constructionCostFood" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Building_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Building" ("completionAt", "constructionCostFood", "constructionCostGold", "constructionCostIron", "constructionCostStone", "constructionCostWood", "createdAt", "id", "isBuilding", "level", "queuePosition", "type", "updatedAt", "villageId") SELECT "completionAt", "constructionCostFood", "constructionCostGold", "constructionCostIron", "constructionCostStone", "constructionCostWood", "createdAt", "id", "isBuilding", "level", "queuePosition", "type", "updatedAt", "villageId" FROM "Building";
DROP TABLE "Building";
ALTER TABLE "new_Building" RENAME TO "Building";
CREATE INDEX "Building_villageId_slot_idx" ON "Building"("villageId", "slot");
CREATE INDEX "Building_villageId_idx" ON "Building"("villageId");
CREATE INDEX "Building_villageId_queuePosition_idx" ON "Building"("villageId", "queuePosition");
CREATE INDEX "Building_isBuilding_completionAt_idx" ON "Building"("isBuilding", "completionAt");
CREATE INDEX "Building_completionAt_idx" ON "Building"("completionAt");
CREATE INDEX "Building_type_level_idx" ON "Building"("type", "level");
CREATE UNIQUE INDEX "Building_villageId_type_key" ON "Building"("villageId", "type");
CREATE TABLE "new_Movement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "troopId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'TROOP',
    "fromVillageId" TEXT,
    "toVillageId" TEXT,
    "fromX" INTEGER NOT NULL,
    "fromY" INTEGER NOT NULL,
    "toX" INTEGER NOT NULL,
    "toY" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivalAt" DATETIME NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "cancelledAt" DATETIME,
    CONSTRAINT "Movement_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Movement_fromVillageId_fkey" FOREIGN KEY ("fromVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Movement_toVillageId_fkey" FOREIGN KEY ("toVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movement" ("arrivalAt", "cancelledAt", "currentStep", "fromX", "fromY", "id", "path", "startedAt", "status", "toX", "toY", "totalSteps", "troopId") SELECT "arrivalAt", "cancelledAt", "currentStep", "fromX", "fromY", "id", "path", "startedAt", "status", "toX", "toY", "totalSteps", "troopId" FROM "Movement";
DROP TABLE "Movement";
ALTER TABLE "new_Movement" RENAME TO "Movement";
CREATE INDEX "Movement_troopId_idx" ON "Movement"("troopId");
CREATE INDEX "Movement_arrivalAt_idx" ON "Movement"("arrivalAt");
CREATE INDEX "Movement_status_idx" ON "Movement"("status");
CREATE INDEX "Movement_status_arrivalAt_idx" ON "Movement"("status", "arrivalAt");
CREATE INDEX "Movement_kind_idx" ON "Movement"("kind");
CREATE INDEX "Movement_fromVillageId_idx" ON "Movement"("fromVillageId");
CREATE INDEX "Movement_toVillageId_idx" ON "Movement"("toVillageId");
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameWorldId" TEXT,
    "gameTribe" TEXT,
    "playerName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "wavesSurvived" INTEGER NOT NULL DEFAULT 0,
    "troopsKilled" INTEGER NOT NULL DEFAULT 0,
    "troopsLost" INTEGER NOT NULL DEFAULT 0,
    "culturePoints" INTEGER NOT NULL DEFAULT 0,
    "cpTotal" INTEGER NOT NULL DEFAULT 0,
    "villagesAllowed" INTEGER NOT NULL DEFAULT 1,
    "villagesUsed" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "banReason" TEXT,
    "beginnerProtectionUntil" DATETIME,
    "tribeId" TEXT,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Player_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Player_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "Tribe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("banReason", "beginnerProtectionUntil", "createdAt", "deletedAt", "gameTribe", "gameWorldId", "id", "isDeleted", "lastActiveAt", "playerName", "rank", "totalPoints", "tribeId", "troopsKilled", "troopsLost", "updatedAt", "userId", "wavesSurvived") SELECT "banReason", "beginnerProtectionUntil", "createdAt", "deletedAt", "gameTribe", "gameWorldId", "id", "isDeleted", "lastActiveAt", "playerName", "rank", "totalPoints", "tribeId", "troopsKilled", "troopsLost", "updatedAt", "userId", "wavesSurvived" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_playerName_key" ON "Player"("playerName");
CREATE INDEX "Player_userId_idx" ON "Player"("userId");
CREATE INDEX "Player_gameWorldId_idx" ON "Player"("gameWorldId");
CREATE INDEX "Player_playerName_idx" ON "Player"("playerName");
CREATE INDEX "Player_totalPoints_idx" ON "Player"("totalPoints");
CREATE INDEX "Player_rank_idx" ON "Player"("rank");
CREATE INDEX "Player_lastActiveAt_idx" ON "Player"("lastActiveAt");
CREATE INDEX "Player_beginnerProtectionUntil_idx" ON "Player"("beginnerProtectionUntil");
CREATE INDEX "Player_isDeleted_lastActiveAt_idx" ON "Player"("isDeleted", "lastActiveAt");
CREATE INDEX "Player_tribeId_isDeleted_idx" ON "Player"("tribeId", "isDeleted");
CREATE TABLE "new_Village" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "continentId" TEXT NOT NULL,
    "regionId" TEXT,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'New Village',
    "isCapital" BOOLEAN NOT NULL DEFAULT false,
    "wood" INTEGER NOT NULL DEFAULT 1000,
    "stone" INTEGER NOT NULL DEFAULT 1000,
    "iron" INTEGER NOT NULL DEFAULT 500,
    "gold" INTEGER NOT NULL DEFAULT 200,
    "food" INTEGER NOT NULL DEFAULT 2000,
    "population" INTEGER NOT NULL DEFAULT 100,
    "woodProduction" INTEGER NOT NULL DEFAULT 10,
    "stoneProduction" INTEGER NOT NULL DEFAULT 8,
    "ironProduction" INTEGER NOT NULL DEFAULT 5,
    "goldProduction" INTEGER NOT NULL DEFAULT 2,
    "foodProduction" INTEGER NOT NULL DEFAULT 15,
    "culturePointsPerHour" REAL NOT NULL DEFAULT 0,
    "loyalty" INTEGER NOT NULL DEFAULT 100,
    "maxLoyalty" INTEGER NOT NULL DEFAULT 100,
    "loyaltyUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoyaltyAttackAt" DATETIME,
    "expansionSlotsUsed" INTEGER NOT NULL DEFAULT 0,
    "expansionSlotsTotal" INTEGER NOT NULL DEFAULT 0,
    "foundedByVillageId" TEXT,
    "conqueredFromPlayerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastTickAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Village_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Village_continentId_fkey" FOREIGN KEY ("continentId") REFERENCES "Continent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Village_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Village_foundedByVillageId_fkey" FOREIGN KEY ("foundedByVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Village_conqueredFromPlayerId_fkey" FOREIGN KEY ("conqueredFromPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Village" ("continentId", "createdAt", "food", "foodProduction", "gold", "goldProduction", "id", "iron", "ironProduction", "isCapital", "lastTickAt", "loyalty", "name", "playerId", "population", "regionId", "stone", "stoneProduction", "updatedAt", "wood", "woodProduction", "x", "y") SELECT "continentId", "createdAt", "food", "foodProduction", "gold", "goldProduction", "id", "iron", "ironProduction", "isCapital", "lastTickAt", "loyalty", "name", "playerId", "population", "regionId", "stone", "stoneProduction", "updatedAt", "wood", "woodProduction", "x", "y" FROM "Village";
DROP TABLE "Village";
ALTER TABLE "new_Village" RENAME TO "Village";
CREATE INDEX "Village_playerId_idx" ON "Village"("playerId");
CREATE INDEX "Village_continentId_idx" ON "Village"("continentId");
CREATE INDEX "Village_regionId_idx" ON "Village"("regionId");
CREATE INDEX "Village_isCapital_idx" ON "Village"("isCapital");
CREATE INDEX "Village_lastTickAt_idx" ON "Village"("lastTickAt");
CREATE INDEX "Village_playerId_isCapital_idx" ON "Village"("playerId", "isCapital");
CREATE INDEX "Village_continentId_playerId_idx" ON "Village"("continentId", "playerId");
CREATE INDEX "Village_foundedByVillageId_idx" ON "Village"("foundedByVillageId");
CREATE INDEX "Village_conqueredFromPlayerId_idx" ON "Village"("conqueredFromPlayerId");
CREATE UNIQUE INDEX "Village_x_y_key" ON "Village"("x", "y");
CREATE TABLE "new_WorldConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameWorldId" TEXT,
    "maxX" INTEGER NOT NULL DEFAULT 100,
    "maxY" INTEGER NOT NULL DEFAULT 100,
    "unitSpeed" REAL NOT NULL DEFAULT 1.0,
    "isRunning" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resourcePerTick" INTEGER NOT NULL DEFAULT 10,
    "productionMultiplier" REAL NOT NULL DEFAULT 1.0,
    "tickIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "constructionQueueLimit" INTEGER NOT NULL DEFAULT 3,
    "nightBonusMultiplier" REAL NOT NULL DEFAULT 1.2,
    "beginnerProtectionHours" INTEGER NOT NULL DEFAULT 72,
    "beginnerProtectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scoutingConfig" TEXT DEFAULT '{}',
    "nightPolicyConfig" TEXT DEFAULT '{}',
    "siegeRulesConfig" TEXT DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldConfig_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorldConfig" ("beginnerProtectionEnabled", "beginnerProtectionHours", "constructionQueueLimit", "createdAt", "gameWorldId", "id", "isRunning", "maxX", "maxY", "nightBonusMultiplier", "nightPolicyConfig", "productionMultiplier", "resourcePerTick", "scoutingConfig", "startedAt", "tickIntervalMinutes", "unitSpeed", "updatedAt") SELECT "beginnerProtectionEnabled", "beginnerProtectionHours", "constructionQueueLimit", "createdAt", "gameWorldId", "id", "isRunning", "maxX", "maxY", "nightBonusMultiplier", "nightPolicyConfig", "productionMultiplier", "resourcePerTick", "scoutingConfig", "startedAt", "tickIntervalMinutes", "unitSpeed", "updatedAt" FROM "WorldConfig";
DROP TABLE "WorldConfig";
ALTER TABLE "new_WorldConfig" RENAME TO "WorldConfig";
CREATE UNIQUE INDEX "WorldConfig_gameWorldId_key" ON "WorldConfig"("gameWorldId");
CREATE INDEX "WorldConfig_gameWorldId_idx" ON "WorldConfig"("gameWorldId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BuildingLevel_blueprintId_level_idx" ON "BuildingLevel"("blueprintId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingLevel_blueprintId_level_key" ON "BuildingLevel"("blueprintId", "level");

-- CreateIndex
CREATE INDEX "BuildQueueTask_villageId_category_status_position_idx" ON "BuildQueueTask"("villageId", "category", "status", "position");

-- CreateIndex
CREATE INDEX "BuildQueueTask_status_finishesAt_idx" ON "BuildQueueTask"("status", "finishesAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCulturePoint_playerId_key" ON "AccountCulturePoint"("playerId");

-- CreateIndex
CREATE INDEX "UnitType_role_idx" ON "UnitType"("role");

-- CreateIndex
CREATE INDEX "UnitTech_unitTypeId_idx" ON "UnitTech"("unitTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitTech_playerId_unitTypeId_key" ON "UnitTech"("playerId", "unitTypeId");

-- CreateIndex
CREATE INDEX "UnitStack_unitTypeId_idx" ON "UnitStack"("unitTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitStack_villageId_unitTypeId_key" ON "UnitStack"("villageId", "unitTypeId");

-- CreateIndex
CREATE INDEX "TrainingQueueItem_villageId_status_finishAt_idx" ON "TrainingQueueItem"("villageId", "status", "finishAt");

-- CreateIndex
CREATE INDEX "TrainingQueueItem_unitTypeId_idx" ON "TrainingQueueItem"("unitTypeId");

-- CreateIndex
CREATE INDEX "ExpansionLink_sourceVillageId_idx" ON "ExpansionLink"("sourceVillageId");

-- CreateIndex
CREATE INDEX "ExpansionLink_type_idx" ON "ExpansionLink"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ExpansionLink_targetVillageId_key" ON "ExpansionLink"("targetVillageId");

-- CreateIndex
CREATE INDEX "RallyPointPreset_villageId_idx" ON "RallyPointPreset"("villageId");

-- CreateIndex
CREATE INDEX "RallyPointBookmark_villageId_idx" ON "RallyPointBookmark"("villageId");

-- CreateIndex
CREATE INDEX "RallyPointBookmark_targetVillageId_idx" ON "RallyPointBookmark"("targetVillageId");

-- CreateIndex
CREATE INDEX "RallyPointWaveGroup_villageId_idx" ON "RallyPointWaveGroup"("villageId");

-- CreateIndex
CREATE INDEX "RallyPointWaveGroup_arriveAt_idx" ON "RallyPointWaveGroup"("arriveAt");

-- CreateIndex
CREATE INDEX "RallyPointWaveMember_waveGroupId_idx" ON "RallyPointWaveMember"("waveGroupId");

-- CreateIndex
CREATE INDEX "RallyPointWaveMember_arriveAt_idx" ON "RallyPointWaveMember"("arriveAt");

-- CreateIndex
CREATE INDEX "RallyPointWaveMember_status_idx" ON "RallyPointWaveMember"("status");

-- CreateIndex
CREATE INDEX "RallyPointMovement_arriveAt_status_idx" ON "RallyPointMovement"("arriveAt", "status");

-- CreateIndex
CREATE INDEX "RallyPointMovement_fromVillageId_idx" ON "RallyPointMovement"("fromVillageId");

-- CreateIndex
CREATE INDEX "RallyPointMovement_toTileX_toTileY_status_idx" ON "RallyPointMovement"("toTileX", "toTileY", "status");

-- CreateIndex
CREATE INDEX "RallyPointMovement_status_arriveAt_idx" ON "RallyPointMovement"("status", "arriveAt");

-- CreateIndex
CREATE INDEX "RallyPointMovement_idempotencyKey_idx" ON "RallyPointMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RallyPointMovementReport_movementId_idx" ON "RallyPointMovementReport"("movementId");

-- CreateIndex
CREATE INDEX "GarrisonStack_ownerAccountId_idx" ON "GarrisonStack"("ownerAccountId");

-- CreateIndex
CREATE INDEX "TribeTreaty_tribe1Id_idx" ON "TribeTreaty"("tribe1Id");

-- CreateIndex
CREATE INDEX "TribeTreaty_tribe2Id_idx" ON "TribeTreaty"("tribe2Id");

-- CreateIndex
CREATE INDEX "TribeTreaty_endsAt_idx" ON "TribeTreaty"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "TribeTreaty_tribe1Id_tribe2Id_key" ON "TribeTreaty"("tribe1Id", "tribe2Id");

-- CreateIndex
CREATE INDEX "AllianceQuestionnaireTemplate_isSystem_idx" ON "AllianceQuestionnaireTemplate"("isSystem");

-- CreateIndex
CREATE INDEX "AllianceMember_playerId_idx" ON "AllianceMember"("playerId");

-- CreateIndex
CREATE INDEX "AllianceMember_state_idx" ON "AllianceMember"("state");

-- CreateIndex
CREATE INDEX "AllianceMember_squadId_idx" ON "AllianceMember"("squadId");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceMember_allianceId_playerId_key" ON "AllianceMember"("allianceId", "playerId");

-- CreateIndex
CREATE INDEX "AllianceRank_allianceId_weight_idx" ON "AllianceRank"("allianceId", "weight");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceRank_allianceId_name_key" ON "AllianceRank"("allianceId", "name");

-- CreateIndex
CREATE INDEX "AlliancePermission_category_idx" ON "AlliancePermission"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AlliancePermission_allianceId_key_key" ON "AlliancePermission"("allianceId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceRankPermission_rankId_permissionId_key" ON "AllianceRankPermission"("rankId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceMemberPermissionOverride_memberId_permissionId_key" ON "AllianceMemberPermissionOverride"("memberId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AlliancePermissionVersion_allianceId_version_key" ON "AlliancePermissionVersion"("allianceId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceSquad_allianceId_name_key" ON "AllianceSquad"("allianceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceForum_allianceId_key" ON "AllianceForum"("allianceId");

-- CreateIndex
CREATE INDEX "AllianceBoard_allianceId_visibilityScope_idx" ON "AllianceBoard"("allianceId", "visibilityScope");

-- CreateIndex
CREATE INDEX "AllianceThread_boardId_status_idx" ON "AllianceThread"("boardId", "status");

-- CreateIndex
CREATE INDEX "AllianceThread_allianceId_lastPostAt_idx" ON "AllianceThread"("allianceId", "lastPostAt");

-- CreateIndex
CREATE INDEX "AlliancePost_threadId_createdAt_idx" ON "AlliancePost"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "AlliancePost_authorMemberId_idx" ON "AlliancePost"("authorMemberId");

-- CreateIndex
CREATE INDEX "AllianceThreadReadState_allianceId_memberId_idx" ON "AllianceThreadReadState"("allianceId", "memberId");

-- CreateIndex
CREATE INDEX "AllianceThreadReadState_shard_idx" ON "AllianceThreadReadState"("shard");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceThreadReadState_threadId_memberId_key" ON "AllianceThreadReadState"("threadId", "memberId");

-- CreateIndex
CREATE INDEX "AllianceAnnouncement_allianceId_status_idx" ON "AllianceAnnouncement"("allianceId", "status");

-- CreateIndex
CREATE INDEX "AllianceAnnouncement_scheduledFor_idx" ON "AllianceAnnouncement"("scheduledFor");

-- CreateIndex
CREATE INDEX "AllianceAnnouncementReceipt_memberId_acknowledged_idx" ON "AllianceAnnouncementReceipt"("memberId", "acknowledged");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceAnnouncementReceipt_announcementId_memberId_key" ON "AllianceAnnouncementReceipt"("announcementId", "memberId");

-- CreateIndex
CREATE INDEX "AllianceAnnouncementTargetLog_allianceId_announcementId_idx" ON "AllianceAnnouncementTargetLog"("allianceId", "announcementId");

-- CreateIndex
CREATE INDEX "AllianceAuditLog_allianceId_category_idx" ON "AllianceAuditLog"("allianceId", "category");

-- CreateIndex
CREATE INDEX "AllianceAuditLog_createdAt_idx" ON "AllianceAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AllianceInvite_playerId_idx" ON "AllianceInvite"("playerId");

-- CreateIndex
CREATE INDEX "AllianceInvite_status_idx" ON "AllianceInvite"("status");

-- CreateIndex
CREATE INDEX "AllianceInvite_expiresAt_idx" ON "AllianceInvite"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceInvite_allianceId_playerId_key" ON "AllianceInvite"("allianceId", "playerId");

-- CreateIndex
CREATE INDEX "AllianceApplication_allianceId_playerId_idx" ON "AllianceApplication"("allianceId", "playerId");

-- CreateIndex
CREATE INDEX "AllianceApplication_status_idx" ON "AllianceApplication"("status");

-- CreateIndex
CREATE INDEX "AllianceApplication_expiresAt_idx" ON "AllianceApplication"("expiresAt");

-- CreateIndex
CREATE INDEX "AllianceMemberNote_memberId_visibility_idx" ON "AllianceMemberNote"("memberId", "visibility");

-- CreateIndex
CREATE INDEX "AllianceGovernanceSnapshot_allianceId_capturedAt_idx" ON "AllianceGovernanceSnapshot"("allianceId", "capturedAt");

-- CreateIndex
CREATE INDEX "AllianceDiplomacySnapshot_allianceId_visibility_idx" ON "AllianceDiplomacySnapshot"("allianceId", "visibility");
