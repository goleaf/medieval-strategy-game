/*
  Warnings:

  - You are about to alter the column `localizedPayload` on the `AllianceAnnouncement` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `targetingFilters` on the `AllianceAnnouncement` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `decision` on the `AllianceAnnouncementTargetLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `answers` on the `AllianceApplication` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `afterState` on the `AllianceAuditLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `beforeState` on the `AllianceAuditLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `deviceInfo` on the `AllianceAuditLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `metadata` on the `AllianceAuditLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `postingRules` on the `AllianceBoard` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `visibilityConfig` on the `AllianceBoard` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `postingRules` on the `AllianceForum` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `auditHotspots` on the `AllianceGovernanceSnapshot` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `tags` on the `AllianceMemberNote` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `snapshot` on the `AlliancePermissionVersion` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `attachments` on the `AlliancePost` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `moderationLog` on the `AlliancePost` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `questions` on the `AllianceQuestionnaireTemplate` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `permissionsJson` on the `AllianceRank` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `tags` on the `AllianceThread` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `metadata` on the `BuildQueueTask` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `speedSnapshot` on the `BuildQueueTask` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to drop the column `demolitionAt` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionCost` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionMode` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `isDemolishing` on the `Building` table. All the data in the column will be lost.
  - You are about to alter the column `effects` on the `BuildingBlueprint` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `prerequisites` on the `BuildingBlueprint` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `effects` on the `BuildingLevel` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `payload` on the `Movement` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `optionsJson` on the `RallyPoint` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `payload` on the `RallyPointMovement` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `summary` on the `RallyPointMovementReport` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `unitsJson` on the `RallyPointPreset` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `catapultTargetsJson` on the `RallyPointWaveMember` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `unitsJson` on the `RallyPointWaveMember` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `buildingReqJson` on the `UnitType` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `researchReqJson` on the `UnitType` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `nightPolicyConfig` on the `WorldConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `scoutingConfig` on the `WorldConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `siegeRulesConfig` on the `WorldConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AllianceAnnouncement" (
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
INSERT INTO "new_AllianceAnnouncement" ("allianceId", "authorMemberId", "cancelledAt", "createdAt", "id", "localizedPayload", "quietHoursBypassed", "requireAcknowledgement", "scheduledFor", "sentAt", "status", "targetingFilters", "targetingScope", "type", "updatedAt") SELECT "allianceId", "authorMemberId", "cancelledAt", "createdAt", "id", "localizedPayload", "quietHoursBypassed", "requireAcknowledgement", "scheduledFor", "sentAt", "status", "targetingFilters", "targetingScope", "type", "updatedAt" FROM "AllianceAnnouncement";
DROP TABLE "AllianceAnnouncement";
ALTER TABLE "new_AllianceAnnouncement" RENAME TO "AllianceAnnouncement";
CREATE INDEX "AllianceAnnouncement_allianceId_status_idx" ON "AllianceAnnouncement"("allianceId", "status");
CREATE INDEX "AllianceAnnouncement_scheduledFor_idx" ON "AllianceAnnouncement"("scheduledFor");
CREATE TABLE "new_AllianceAnnouncementTargetLog" (
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
INSERT INTO "new_AllianceAnnouncementTargetLog" ("allianceId", "announcementId", "createdAt", "decision", "deliveredAt", "id", "memberId", "quietHourBypassed") SELECT "allianceId", "announcementId", "createdAt", "decision", "deliveredAt", "id", "memberId", "quietHourBypassed" FROM "AllianceAnnouncementTargetLog";
DROP TABLE "AllianceAnnouncementTargetLog";
ALTER TABLE "new_AllianceAnnouncementTargetLog" RENAME TO "AllianceAnnouncementTargetLog";
CREATE INDEX "AllianceAnnouncementTargetLog_allianceId_announcementId_idx" ON "AllianceAnnouncementTargetLog"("allianceId", "announcementId");
CREATE TABLE "new_AllianceApplication" (
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
INSERT INTO "new_AllianceApplication" ("allianceId", "answers", "createdAt", "expiresAt", "id", "playerId", "reviewedAt", "reviewerId", "status", "updatedAt") SELECT "allianceId", "answers", "createdAt", "expiresAt", "id", "playerId", "reviewedAt", "reviewerId", "status", "updatedAt" FROM "AllianceApplication";
DROP TABLE "AllianceApplication";
ALTER TABLE "new_AllianceApplication" RENAME TO "AllianceApplication";
CREATE INDEX "AllianceApplication_allianceId_playerId_idx" ON "AllianceApplication"("allianceId", "playerId");
CREATE INDEX "AllianceApplication_status_idx" ON "AllianceApplication"("status");
CREATE INDEX "AllianceApplication_expiresAt_idx" ON "AllianceApplication"("expiresAt");
CREATE TABLE "new_AllianceAuditLog" (
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
INSERT INTO "new_AllianceAuditLog" ("action", "actorId", "afterState", "allianceId", "beforeState", "category", "confirmationToken", "createdAt", "deviceInfo", "id", "ipAddress", "metadata") SELECT "action", "actorId", "afterState", "allianceId", "beforeState", "category", "confirmationToken", "createdAt", "deviceInfo", "id", "ipAddress", "metadata" FROM "AllianceAuditLog";
DROP TABLE "AllianceAuditLog";
ALTER TABLE "new_AllianceAuditLog" RENAME TO "AllianceAuditLog";
CREATE INDEX "AllianceAuditLog_allianceId_category_idx" ON "AllianceAuditLog"("allianceId", "category");
CREATE INDEX "AllianceAuditLog_createdAt_idx" ON "AllianceAuditLog"("createdAt");
CREATE TABLE "new_AllianceBoard" (
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
INSERT INTO "new_AllianceBoard" ("allianceId", "archiveAfterDays", "createdAt", "deletedAt", "description", "forumId", "id", "name", "orderIndex", "pinLimit", "postingRules", "quotaPerDay", "updatedAt", "visibilityConfig", "visibilityScope") SELECT "allianceId", "archiveAfterDays", "createdAt", "deletedAt", "description", "forumId", "id", "name", "orderIndex", "pinLimit", "postingRules", "quotaPerDay", "updatedAt", "visibilityConfig", "visibilityScope" FROM "AllianceBoard";
DROP TABLE "AllianceBoard";
ALTER TABLE "new_AllianceBoard" RENAME TO "AllianceBoard";
CREATE INDEX "AllianceBoard_allianceId_visibilityScope_idx" ON "AllianceBoard"("allianceId", "visibilityScope");
CREATE TABLE "new_AllianceForum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "postingRules" TEXT,
    "pinLimit" INTEGER NOT NULL DEFAULT 5,
    "archiveAfterDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllianceForum_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AllianceForum" ("allianceId", "archiveAfterDays", "createdAt", "id", "pinLimit", "postingRules", "updatedAt") SELECT "allianceId", "archiveAfterDays", "createdAt", "id", "pinLimit", "postingRules", "updatedAt" FROM "AllianceForum";
DROP TABLE "AllianceForum";
ALTER TABLE "new_AllianceForum" RENAME TO "AllianceForum";
CREATE UNIQUE INDEX "AllianceForum_allianceId_key" ON "AllianceForum"("allianceId");
CREATE TABLE "new_AllianceGovernanceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "loneLeader" BOOLEAN NOT NULL DEFAULT false,
    "pendingTransfers" INTEGER NOT NULL DEFAULT 0,
    "probationCount" INTEGER NOT NULL DEFAULT 0,
    "auditHotspots" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AllianceGovernanceSnapshot_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AllianceGovernanceSnapshot" ("allianceId", "auditHotspots", "capturedAt", "id", "loneLeader", "pendingTransfers", "probationCount") SELECT "allianceId", "auditHotspots", "capturedAt", "id", "loneLeader", "pendingTransfers", "probationCount" FROM "AllianceGovernanceSnapshot";
DROP TABLE "AllianceGovernanceSnapshot";
ALTER TABLE "new_AllianceGovernanceSnapshot" RENAME TO "AllianceGovernanceSnapshot";
CREATE INDEX "AllianceGovernanceSnapshot_allianceId_capturedAt_idx" ON "AllianceGovernanceSnapshot"("allianceId", "capturedAt");
CREATE TABLE "new_AllianceMemberNote" (
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
INSERT INTO "new_AllianceMemberNote" ("allianceId", "authorId", "content", "createdAt", "deletedAt", "id", "memberId", "tags", "updatedAt", "visibility") SELECT "allianceId", "authorId", "content", "createdAt", "deletedAt", "id", "memberId", "tags", "updatedAt", "visibility" FROM "AllianceMemberNote";
DROP TABLE "AllianceMemberNote";
ALTER TABLE "new_AllianceMemberNote" RENAME TO "AllianceMemberNote";
CREATE INDEX "AllianceMemberNote_memberId_visibility_idx" ON "AllianceMemberNote"("memberId", "visibility");
CREATE TABLE "new_AlliancePermissionVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlliancePermissionVersion_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AlliancePermissionVersion" ("allianceId", "createdAt", "id", "snapshot", "version") SELECT "allianceId", "createdAt", "id", "snapshot", "version" FROM "AlliancePermissionVersion";
DROP TABLE "AlliancePermissionVersion";
ALTER TABLE "new_AlliancePermissionVersion" RENAME TO "AlliancePermissionVersion";
CREATE UNIQUE INDEX "AlliancePermissionVersion_allianceId_version_key" ON "AlliancePermissionVersion"("allianceId", "version");
CREATE TABLE "new_AlliancePost" (
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
INSERT INTO "new_AlliancePost" ("allianceId", "attachments", "authorMemberId", "content", "createdAt", "deletedAt", "id", "moderationLog", "revision", "threadId", "updatedAt") SELECT "allianceId", "attachments", "authorMemberId", "content", "createdAt", "deletedAt", "id", "moderationLog", "revision", "threadId", "updatedAt" FROM "AlliancePost";
DROP TABLE "AlliancePost";
ALTER TABLE "new_AlliancePost" RENAME TO "AlliancePost";
CREATE INDEX "AlliancePost_threadId_createdAt_idx" ON "AlliancePost"("threadId", "createdAt");
CREATE INDEX "AlliancePost_authorMemberId_idx" ON "AlliancePost"("authorMemberId");
CREATE TABLE "new_AllianceQuestionnaireTemplate" (
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
INSERT INTO "new_AllianceQuestionnaireTemplate" ("allianceId", "createdAt", "id", "isSystem", "name", "questions", "updatedAt", "version") SELECT "allianceId", "createdAt", "id", "isSystem", "name", "questions", "updatedAt", "version" FROM "AllianceQuestionnaireTemplate";
DROP TABLE "AllianceQuestionnaireTemplate";
ALTER TABLE "new_AllianceQuestionnaireTemplate" RENAME TO "AllianceQuestionnaireTemplate";
CREATE INDEX "AllianceQuestionnaireTemplate_isSystem_idx" ON "AllianceQuestionnaireTemplate"("isSystem");
CREATE TABLE "new_AllianceRank" (
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
INSERT INTO "new_AllianceRank" ("allianceId", "canLead", "color", "createdAt", "id", "inheritsFromId", "isDefault", "name", "permissionsJson", "updatedAt", "version", "weight") SELECT "allianceId", "canLead", "color", "createdAt", "id", "inheritsFromId", "isDefault", "name", "permissionsJson", "updatedAt", "version", "weight" FROM "AllianceRank";
DROP TABLE "AllianceRank";
ALTER TABLE "new_AllianceRank" RENAME TO "AllianceRank";
CREATE INDEX "AllianceRank_allianceId_weight_idx" ON "AllianceRank"("allianceId", "weight");
CREATE UNIQUE INDEX "AllianceRank_allianceId_name_key" ON "AllianceRank"("allianceId", "name");
CREATE TABLE "new_AllianceThread" (
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
INSERT INTO "new_AllianceThread" ("allianceId", "authorMemberId", "boardId", "createdAt", "deletedAt", "id", "isPinned", "lastPostAt", "status", "tags", "title", "updatedAt") SELECT "allianceId", "authorMemberId", "boardId", "createdAt", "deletedAt", "id", "isPinned", "lastPostAt", "status", "tags", "title", "updatedAt" FROM "AllianceThread";
DROP TABLE "AllianceThread";
ALTER TABLE "new_AllianceThread" RENAME TO "AllianceThread";
CREATE INDEX "AllianceThread_boardId_status_idx" ON "AllianceThread"("boardId", "status");
CREATE INDEX "AllianceThread_allianceId_lastPostAt_idx" ON "AllianceThread"("allianceId", "lastPostAt");
CREATE TABLE "new_BuildQueueTask" (
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
INSERT INTO "new_BuildQueueTask" ("buildingId", "cancelledAt", "category", "completedAt", "createdAt", "createdBy", "entityKey", "finishesAt", "fromLevel", "id", "metadata", "position", "queuedAt", "slot", "speedSnapshot", "startedAt", "status", "toLevel", "updatedAt", "villageId") SELECT "buildingId", "cancelledAt", "category", "completedAt", "createdAt", "createdBy", "entityKey", "finishesAt", "fromLevel", "id", "metadata", "position", "queuedAt", "slot", "speedSnapshot", "startedAt", "status", "toLevel", "updatedAt", "villageId" FROM "BuildQueueTask";
DROP TABLE "BuildQueueTask";
ALTER TABLE "new_BuildQueueTask" RENAME TO "BuildQueueTask";
CREATE INDEX "BuildQueueTask_villageId_category_status_position_idx" ON "BuildQueueTask"("villageId", "category", "status", "position");
CREATE INDEX "BuildQueueTask_status_finishesAt_idx" ON "BuildQueueTask"("status", "finishesAt");
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
INSERT INTO "new_Building" ("completionAt", "constructionCostFood", "constructionCostGold", "constructionCostIron", "constructionCostStone", "constructionCostWood", "createdAt", "id", "isBuilding", "level", "queuePosition", "slot", "type", "updatedAt", "villageId") SELECT "completionAt", "constructionCostFood", "constructionCostGold", "constructionCostIron", "constructionCostStone", "constructionCostWood", "createdAt", "id", "isBuilding", "level", "queuePosition", "slot", "type", "updatedAt", "villageId" FROM "Building";
DROP TABLE "Building";
ALTER TABLE "new_Building" RENAME TO "Building";
CREATE INDEX "Building_villageId_slot_idx" ON "Building"("villageId", "slot");
CREATE INDEX "Building_villageId_idx" ON "Building"("villageId");
CREATE INDEX "Building_villageId_queuePosition_idx" ON "Building"("villageId", "queuePosition");
CREATE INDEX "Building_isBuilding_completionAt_idx" ON "Building"("isBuilding", "completionAt");
CREATE INDEX "Building_completionAt_idx" ON "Building"("completionAt");
CREATE INDEX "Building_type_level_idx" ON "Building"("type", "level");
CREATE UNIQUE INDEX "Building_villageId_type_key" ON "Building"("villageId", "type");
CREATE TABLE "new_BuildingBlueprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL,
    "prerequisites" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BuildingBlueprint" ("category", "createdAt", "displayName", "effects", "id", "maxLevel", "prerequisites", "updatedAt") SELECT "category", "createdAt", "displayName", "effects", "id", "maxLevel", "prerequisites", "updatedAt" FROM "BuildingBlueprint";
DROP TABLE "BuildingBlueprint";
ALTER TABLE "new_BuildingBlueprint" RENAME TO "BuildingBlueprint";
CREATE TABLE "new_BuildingLevel" (
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
INSERT INTO "new_BuildingLevel" ("blueprintId", "buildTimeSeconds", "costClay", "costCrop", "costIron", "costWood", "cpPerHour", "createdAt", "effects", "id", "level", "updatedAt") SELECT "blueprintId", "buildTimeSeconds", "costClay", "costCrop", "costIron", "costWood", "cpPerHour", "createdAt", "effects", "id", "level", "updatedAt" FROM "BuildingLevel";
DROP TABLE "BuildingLevel";
ALTER TABLE "new_BuildingLevel" RENAME TO "BuildingLevel";
CREATE INDEX "BuildingLevel_blueprintId_level_idx" ON "BuildingLevel"("blueprintId", "level");
CREATE UNIQUE INDEX "BuildingLevel_blueprintId_level_key" ON "BuildingLevel"("blueprintId", "level");
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
INSERT INTO "new_Movement" ("arrivalAt", "cancelledAt", "currentStep", "fromVillageId", "fromX", "fromY", "id", "kind", "path", "payload", "startedAt", "status", "toVillageId", "toX", "toY", "totalSteps", "troopId") SELECT "arrivalAt", "cancelledAt", "currentStep", "fromVillageId", "fromX", "fromY", "id", "kind", "path", "payload", "startedAt", "status", "toVillageId", "toX", "toY", "totalSteps", "troopId" FROM "Movement";
DROP TABLE "Movement";
ALTER TABLE "new_Movement" RENAME TO "Movement";
CREATE INDEX "Movement_troopId_idx" ON "Movement"("troopId");
CREATE INDEX "Movement_arrivalAt_idx" ON "Movement"("arrivalAt");
CREATE INDEX "Movement_status_idx" ON "Movement"("status");
CREATE INDEX "Movement_status_arrivalAt_idx" ON "Movement"("status", "arrivalAt");
CREATE INDEX "Movement_kind_idx" ON "Movement"("kind");
CREATE INDEX "Movement_fromVillageId_idx" ON "Movement"("fromVillageId");
CREATE INDEX "Movement_toVillageId_idx" ON "Movement"("toVillageId");
CREATE TABLE "new_RallyPoint" (
    "villageId" TEXT NOT NULL PRIMARY KEY,
    "level" INTEGER NOT NULL DEFAULT 1,
    "waveWindowMs" INTEGER NOT NULL DEFAULT 150,
    "optionsJson" TEXT NOT NULL DEFAULT '{}' ,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RallyPoint_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RallyPoint" ("createdAt", "level", "optionsJson", "updatedAt", "villageId", "waveWindowMs") SELECT "createdAt", "level", "optionsJson", "updatedAt", "villageId", "waveWindowMs" FROM "RallyPoint";
DROP TABLE "RallyPoint";
ALTER TABLE "new_RallyPoint" RENAME TO "RallyPoint";
CREATE TABLE "new_RallyPointMovement" (
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
INSERT INTO "new_RallyPointMovement" ("arriveAt", "createdAt", "createdBy", "departAt", "fromVillageId", "id", "idempotencyKey", "mission", "ownerAccountId", "payload", "status", "toTileX", "toTileY", "toVillageId", "updatedAt", "waveGroupId", "waveMemberId") SELECT "arriveAt", "createdAt", "createdBy", "departAt", "fromVillageId", "id", "idempotencyKey", "mission", "ownerAccountId", "payload", "status", "toTileX", "toTileY", "toVillageId", "updatedAt", "waveGroupId", "waveMemberId" FROM "RallyPointMovement";
DROP TABLE "RallyPointMovement";
ALTER TABLE "new_RallyPointMovement" RENAME TO "RallyPointMovement";
CREATE INDEX "RallyPointMovement_arriveAt_status_idx" ON "RallyPointMovement"("arriveAt", "status");
CREATE INDEX "RallyPointMovement_fromVillageId_idx" ON "RallyPointMovement"("fromVillageId");
CREATE INDEX "RallyPointMovement_toTileX_toTileY_status_idx" ON "RallyPointMovement"("toTileX", "toTileY", "status");
CREATE INDEX "RallyPointMovement_status_arriveAt_idx" ON "RallyPointMovement"("status", "arriveAt");
CREATE INDEX "RallyPointMovement_idempotencyKey_idx" ON "RallyPointMovement"("idempotencyKey");
CREATE TABLE "new_RallyPointMovementReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movementId" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RallyPointMovementReport_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "RallyPointMovement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RallyPointMovementReport" ("createdAt", "id", "mission", "movementId", "summary") SELECT "createdAt", "id", "mission", "movementId", "summary" FROM "RallyPointMovementReport";
DROP TABLE "RallyPointMovementReport";
ALTER TABLE "new_RallyPointMovementReport" RENAME TO "RallyPointMovementReport";
CREATE INDEX "RallyPointMovementReport_movementId_idx" ON "RallyPointMovementReport"("movementId");
CREATE TABLE "new_RallyPointPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RallyPointPreset_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RallyPointPreset" ("createdAt", "id", "name", "unitsJson", "villageId") SELECT "createdAt", "id", "name", "unitsJson", "villageId" FROM "RallyPointPreset";
DROP TABLE "RallyPointPreset";
ALTER TABLE "new_RallyPointPreset" RENAME TO "RallyPointPreset";
CREATE INDEX "RallyPointPreset_villageId_idx" ON "RallyPointPreset"("villageId");
CREATE TABLE "new_RallyPointWaveMember" (
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
INSERT INTO "new_RallyPointWaveMember" ("arriveAt", "catapultTargetsJson", "createdAt", "departAt", "id", "idempotencyKey", "mission", "status", "targetVillageId", "targetX", "targetY", "unitsJson", "waveGroupId") SELECT "arriveAt", "catapultTargetsJson", "createdAt", "departAt", "id", "idempotencyKey", "mission", "status", "targetVillageId", "targetX", "targetY", "unitsJson", "waveGroupId" FROM "RallyPointWaveMember";
DROP TABLE "RallyPointWaveMember";
ALTER TABLE "new_RallyPointWaveMember" RENAME TO "RallyPointWaveMember";
CREATE INDEX "RallyPointWaveMember_waveGroupId_idx" ON "RallyPointWaveMember"("waveGroupId");
CREATE INDEX "RallyPointWaveMember_arriveAt_idx" ON "RallyPointWaveMember"("arriveAt");
CREATE INDEX "RallyPointWaveMember_status_idx" ON "RallyPointWaveMember"("status");
CREATE TABLE "new_UnitType" (
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
INSERT INTO "new_UnitType" ("attack", "buildingReqJson", "carry", "costClay", "costCrop", "costIron", "costWood", "createdAt", "defCav", "defInf", "id", "popCost", "researchReqJson", "role", "speedTilesPerHour", "trainTimeSec", "updatedAt", "upkeepCropPerHour") SELECT "attack", "buildingReqJson", "carry", "costClay", "costCrop", "costIron", "costWood", "createdAt", "defCav", "defInf", "id", "popCost", "researchReqJson", "role", "speedTilesPerHour", "trainTimeSec", "updatedAt", "upkeepCropPerHour" FROM "UnitType";
DROP TABLE "UnitType";
ALTER TABLE "new_UnitType" RENAME TO "UnitType";
CREATE INDEX "UnitType_role_idx" ON "UnitType"("role");
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
    "scoutingConfig" TEXT DEFAULT '{}' ,
    "nightPolicyConfig" TEXT DEFAULT '{}' ,
    "siegeRulesConfig" TEXT DEFAULT '{}' ,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldConfig_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorldConfig" ("beginnerProtectionEnabled", "beginnerProtectionHours", "constructionQueueLimit", "createdAt", "gameWorldId", "id", "isRunning", "maxX", "maxY", "nightBonusMultiplier", "nightPolicyConfig", "productionMultiplier", "resourcePerTick", "scoutingConfig", "siegeRulesConfig", "startedAt", "tickIntervalMinutes", "unitSpeed", "updatedAt") SELECT "beginnerProtectionEnabled", "beginnerProtectionHours", "constructionQueueLimit", "createdAt", "gameWorldId", "id", "isRunning", "maxX", "maxY", "nightBonusMultiplier", "nightPolicyConfig", "productionMultiplier", "resourcePerTick", "scoutingConfig", "siegeRulesConfig", "startedAt", "tickIntervalMinutes", "unitSpeed", "updatedAt" FROM "WorldConfig";
DROP TABLE "WorldConfig";
ALTER TABLE "new_WorldConfig" RENAME TO "WorldConfig";
CREATE UNIQUE INDEX "WorldConfig_gameWorldId_key" ON "WorldConfig"("gameWorldId");
CREATE INDEX "WorldConfig_gameWorldId_idx" ON "WorldConfig"("gameWorldId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
