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
  - You are about to alter the column `metadata` on the `TrapperPrisoner` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `buildingReqJson` on the `UnitType` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `researchReqJson` on the `UnitType` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `nightPolicyConfig` on the `WorldConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `scoutingConfig` on the `WorldConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `siegeRulesConfig` on the `WorldConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - Added the required column `merchantsRequired` to the `MarketOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memberDefaultPermissions` to the `Tribe` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "AchievementDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "progressMode" TEXT NOT NULL DEFAULT 'METRIC',
    "targetValue" INTEGER NOT NULL DEFAULT 1,
    "rewardPremiumPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardBadgeKey" TEXT,
    "rewardTitle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "bestProgress" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" DATETIME,
    "claimedAt" DATETIME,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "AchievementDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameWorldId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'PLAYER',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "rewards" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldEvent_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldEventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventScore_worldEventId_fkey" FOREIGN KEY ("worldEventId") REFERENCES "WorldEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventReward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldEventId" TEXT NOT NULL,
    "placementFrom" INTEGER NOT NULL DEFAULT 1,
    "placementTo" INTEGER NOT NULL DEFAULT 1,
    "rewardPremiumPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardTitle" TEXT,
    "rewardBadgeKey" TEXT,
    "rewardItems" JSONB,
    CONSTRAINT "EventReward_worldEventId_fkey" FOREIGN KEY ("worldEventId") REFERENCES "WorldEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "answerHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SecurityQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaptchaChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answerHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "identifier" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionLabel" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceTokenHash" TEXT NOT NULL,
    "label" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TwoFactorSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsPhoneNumber" TEXT,
    "backupCodes" JSONB,
    "lastBackupCodesAt" DATETIME,
    "pendingTotpSecret" TEXT,
    "pendingTotpCreatedAt" DATETIME,
    "pendingSmsPhoneNumber" TEXT,
    "pendingSmsCodeHash" TEXT,
    "pendingSmsExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TwoFactorSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TwoFactorChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "method" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB,
    CONSTRAINT "TwoFactorChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountRecoveryRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "proof" JSONB,
    "securityQuestionId" TEXT,
    "securityQuestionPassed" BOOLEAN NOT NULL DEFAULT false,
    "verifiedOwnership" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountRecoveryRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountRecoveryRequest_securityQuestionId_fkey" FOREIGN KEY ("securityQuestionId") REFERENCES "SecurityQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountLinkEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userIdA" TEXT NOT NULL,
    "userIdB" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "score" REAL NOT NULL DEFAULT 0,
    "evidence" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ModerationReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "involvedUserIds" JSONB,
    "involvedPlayerIds" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EnforcementAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "startAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" TEXT,
    CONSTRAINT "EnforcementAction_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "Admin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MultiAccountAllowlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceTokenHash" TEXT,
    "userIdA" TEXT,
    "userIdB" TEXT,
    "note" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IpBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ModerationAppeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "playerId" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Sitter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "canSendRaids" BOOLEAN NOT NULL DEFAULT false,
    "canUseResources" BOOLEAN NOT NULL DEFAULT false,
    "canBuyAndSpendGold" BOOLEAN NOT NULL DEFAULT false,
    "canDemolishBuildings" BOOLEAN NOT NULL DEFAULT false,
    "canRecallReinforcements" BOOLEAN NOT NULL DEFAULT false,
    "canLaunchConquest" BOOLEAN NOT NULL DEFAULT false,
    "canDismissTroops" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "Sitter_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sitter_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SitterSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sitterRelId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sitterId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "endReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissionSnapshot" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SitterSession_sitterRelId_fkey" FOREIGN KEY ("sitterRelId") REFERENCES "Sitter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorPlayerId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountActionLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "lobbyUserId" TEXT NOT NULL,
    "lobbyUsername" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
    CONSTRAINT "Dual_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "awardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "PlayerBadge_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerFriendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "lastInteractionAt" DATETIME,
    "note" TEXT,
    "metadata" JSONB,
    CONSTRAINT "PlayerFriendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerFriendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerContactNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "stance" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "note" TEXT NOT NULL,
    "tags" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerContactNote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerContactNote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "blockedPlayerId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "PlayerBlock_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerBlock_blockedPlayerId_fkey" FOREIGN KEY ("blockedPlayerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerEndorsement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endorserId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "strength" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerEndorsement_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerEndorsement_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerMentorship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mentorId" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "mentorBonusGranted" INTEGER NOT NULL DEFAULT 0,
    "menteeBonusGranted" INTEGER NOT NULL DEFAULT 0,
    "notes" JSONB,
    CONSTRAINT "PlayerMentorship_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerMentorship_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerSocialActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "actorId" TEXT,
    "activityType" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerSocialActivity_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerSocialActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EndgameConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldConfigId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DOMINATION',
    "dominanceThreshold" REAL NOT NULL DEFAULT 0.7,
    "dominanceHoldHours" INTEGER NOT NULL DEFAULT 0,
    "dominanceBaseline" TEXT NOT NULL DEFAULT 'PLAYER_OWNED',
    "dominanceWarningDistance" REAL NOT NULL DEFAULT 0.05,
    "earliestStart" DATETIME,
    "runeRequirement" INTEGER NOT NULL DEFAULT 0,
    "runeHoldHours" INTEGER NOT NULL DEFAULT 0,
    "runeTimerBehavior" TEXT NOT NULL DEFAULT 'RESET_ON_LOSS',
    "runeWarningDistance" REAL NOT NULL DEFAULT 0.1,
    "relicsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "relicPlacementLimit" INTEGER NOT NULL DEFAULT 10,
    "relicCooldownHours" INTEGER NOT NULL DEFAULT 24,
    "relicStackCap" REAL NOT NULL DEFAULT 0.1,
    "relicSubstatCap" REAL NOT NULL DEFAULT 0.05,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EndgameConfig_worldConfigId_fkey" FOREIGN KEY ("worldConfigId") REFERENCES "WorldConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EndgameState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endgameConfigId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "leadingTribeId" TEXT,
    "leadingPercent" REAL NOT NULL DEFAULT 0,
    "countedVillages" INTEGER NOT NULL DEFAULT 0,
    "runeControlCount" INTEGER NOT NULL DEFAULT 0,
    "warningEmittedAt" DATETIME,
    "holdStartedAt" DATETIME,
    "holdEndsAt" DATETIME,
    "completedAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EndgameState_endgameConfigId_fkey" FOREIGN KEY ("endgameConfigId") REFERENCES "EndgameConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EndgameState_leadingTribeId_fkey" FOREIGN KEY ("leadingTribeId") REFERENCES "Tribe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EndgameRuneVillage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endgameConfigId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "runeType" TEXT NOT NULL DEFAULT 'WAR',
    "defenseMultiplier" REAL NOT NULL DEFAULT 0.5,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "holdRequirementHours" INTEGER NOT NULL DEFAULT 0,
    "holdStartedAt" DATETIME,
    "holdEndsAt" DATETIME,
    "controllingTribeId" TEXT,
    "lastContestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EndgameRuneVillage_endgameConfigId_fkey" FOREIGN KEY ("endgameConfigId") REFERENCES "EndgameConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EndgameRuneVillage_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EndgameRuneVillage_controllingTribeId_fkey" FOREIGN KEY ("controllingTribeId") REFERENCES "Tribe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Relic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "relicType" TEXT NOT NULL DEFAULT 'OFFENSE',
    "relicClass" TEXT NOT NULL DEFAULT 'SHODDY',
    "mainValue" REAL NOT NULL DEFAULT 0,
    "subValue" REAL,
    "name" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMergedAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Relic_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RelicPlacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "relicId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "placedById" TEXT NOT NULL,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removableAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mainBonus" REAL NOT NULL,
    "subBonus" REAL,
    "radius" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RelicPlacement_relicId_fkey" FOREIGN KEY ("relicId") REFERENCES "Relic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RelicPlacement_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RelicPlacement_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events_queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" DATETIME NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "dedupeKey" TEXT,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" DATETIME,
    "lockedAt" DATETIME,
    "lockedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Technology" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "costWood" INTEGER NOT NULL DEFAULT 0,
    "costStone" INTEGER NOT NULL DEFAULT 0,
    "costIron" INTEGER NOT NULL DEFAULT 0,
    "costGold" INTEGER NOT NULL DEFAULT 0,
    "costFood" INTEGER NOT NULL DEFAULT 0,
    "baseTimeSeconds" INTEGER NOT NULL DEFAULT 3600,
    "academyLevelRequired" INTEGER NOT NULL DEFAULT 1,
    "prerequisites" JSONB NOT NULL,
    "effects" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerTechnology" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerTechnology_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerTechnology_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchJob_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchJob_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchJob_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchJob_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SmithyUpgradeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SmithyUpgradeJob_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SmithyUpgradeJob_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SmithyUpgradeJob_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SmithyUpgradeJob_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TribeApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tribeId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewResponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TribeApplication_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "Tribe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TribeApplication_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TribeApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "channels" JSONB,
    "sourceId" TEXT,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "dismissedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerNotification_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "globalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "doNotDisturbEnabled" BOOLEAN NOT NULL DEFAULT false,
    "importanceThreshold" TEXT NOT NULL DEFAULT 'MEDIUM',
    "desktopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mobilePushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailFrequency" TEXT NOT NULL DEFAULT 'disabled',
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "suppressNonCriticalDuringQuietHours" BOOLEAN NOT NULL DEFAULT true,
    "groupSimilar" BOOLEAN NOT NULL DEFAULT true,
    "groupingWindowMinutes" INTEGER NOT NULL DEFAULT 60,
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "typeSettings" JSONB NOT NULL,
    "soundProfiles" JSONB NOT NULL,
    "channelPreferences" JSONB,
    "lastDigestAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationPreference_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "appVersion" TEXT,
    "deviceLabel" TEXT,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PushDevice_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "language" TEXT,
    "timeZone" TEXT,
    "dateTimeFormat" TEXT,
    "numberFormat" TEXT NOT NULL DEFAULT 'COMMA_DECIMAL',
    "theme" TEXT,
    "defaultAttackType" TEXT,
    "unitFormationTemplates" JSONB NOT NULL,
    "enableAutoComplete" BOOLEAN NOT NULL DEFAULT true,
    "confirmDialogs" JSONB NOT NULL,
    "onlineStatusVisible" BOOLEAN NOT NULL DEFAULT true,
    "contactPreferences" JSONB NOT NULL,
    "dataSharingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "mapQuality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "animationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoRefreshSeconds" INTEGER NOT NULL DEFAULT 60,
    "bandwidthSaver" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerSettings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailNotificationSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" DATETIME,
    "verificationTokenHash" TEXT,
    "verificationSentAt" DATETIME,
    "verificationExpiresAt" DATETIME,
    "unsubscribeTokenHash" TEXT,
    "unsubscribedAt" DATETIME,
    "deliverySchedule" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "language" TEXT NOT NULL DEFAULT 'EN',
    "preferences" JSONB NOT NULL,
    "dailyDigestHour" INTEGER NOT NULL DEFAULT 8,
    "lastDigestSentAt" DATETIME,
    "rateLimitWindowStart" DATETIME,
    "rateLimitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailNotificationSetting_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailNotificationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "messageId" TEXT,
    "settingId" TEXT,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "linkTarget" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "readyAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "digestHash" TEXT,
    "forceSend" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailNotificationEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailNotificationEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailNotificationEvent_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "EmailNotificationSetting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailNotificationDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT,
    "playerId" TEXT NOT NULL,
    "settingId" TEXT,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailNotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "EmailNotificationEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailNotificationDelivery_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailNotificationDelivery_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "EmailNotificationSetting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reporterPlayerId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "targetUserId" TEXT,
    "targetPlayerId" TEXT,
    "targetVillageId" TEXT,
    "targetMessageId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "occurredAt" DATETIME,
    "adminNotes" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TutorialQuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TutorialTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "reward" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TutorialTask_questId_fkey" FOREIGN KEY ("questId") REFERENCES "TutorialQuest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerTaskProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerTaskProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerTaskProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TutorialTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportMetadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerAccountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportMetadata_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportFolder_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportFolderEntry" (
    "folderId" TEXT NOT NULL,
    "ownerAccountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("folderId", "ownerAccountId", "kind", "refId"),
    CONSTRAINT "ReportFolderEntry_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ReportFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportFolderEntry_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerAccountId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportTag_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportTagEntry" (
    "tagId" TEXT NOT NULL,
    "ownerAccountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("tagId", "ownerAccountId", "kind", "refId"),
    CONSTRAINT "ReportTagEntry_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ReportTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportTagEntry_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportShareToken" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "ownerAccountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportShareToken_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "targetingFilters" JSONB,
    "localizedPayload" JSONB NOT NULL,
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
    "decision" JSONB,
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
    "answers" JSONB,
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
    "beforeState" JSONB,
    "afterState" JSONB,
    "confirmationToken" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" JSONB,
    "metadata" JSONB,
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
    "visibilityConfig" JSONB,
    "postingRules" JSONB,
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
    "postingRules" JSONB,
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
    "auditHotspots" JSONB,
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
    "tags" JSONB,
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
    "snapshot" JSONB NOT NULL,
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
    "attachments" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "moderationLog" JSONB,
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
    "questions" JSONB NOT NULL,
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
    "permissionsJson" JSONB,
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
    "tags" JSONB,
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
    "speedSnapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'PLAYER',
    "metadata" JSONB,
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
    "prerequisites" JSONB NOT NULL,
    "effects" JSONB NOT NULL,
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
    "effects" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BuildingLevel_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "BuildingBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BuildingLevel" ("blueprintId", "buildTimeSeconds", "costClay", "costCrop", "costIron", "costWood", "cpPerHour", "createdAt", "effects", "id", "level", "updatedAt") SELECT "blueprintId", "buildTimeSeconds", "costClay", "costCrop", "costIron", "costWood", "cpPerHour", "createdAt", "effects", "id", "level", "updatedAt" FROM "BuildingLevel";
DROP TABLE "BuildingLevel";
ALTER TABLE "new_BuildingLevel" RENAME TO "BuildingLevel";
CREATE INDEX "BuildingLevel_blueprintId_level_idx" ON "BuildingLevel"("blueprintId", "level");
CREATE UNIQUE INDEX "BuildingLevel_blueprintId_level_key" ON "BuildingLevel"("blueprintId", "level");
CREATE TABLE "new_GameWorld" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldName" TEXT NOT NULL,
    "worldCode" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "speed" INTEGER NOT NULL DEFAULT 1,
    "registrationClosesAfterDays" INTEGER NOT NULL DEFAULT 70,
    "artefactsIntroducedAfterDays" INTEGER NOT NULL DEFAULT 90,
    "constructionPlansAfterDays" INTEGER NOT NULL DEFAULT 180,
    "natarWonderFinishesAfterDays" INTEGER NOT NULL DEFAULT 250,
    "annualSpecialDurationDays" INTEGER NOT NULL DEFAULT 180,
    "startingCulturePoints" INTEGER NOT NULL DEFAULT 500,
    "townhallCelebrationTimeDivisor" INTEGER NOT NULL DEFAULT 1,
    "townhallSmallCelebrationLimit" INTEGER NOT NULL DEFAULT 500,
    "townhallLargeCelebrationLimit" INTEGER NOT NULL DEFAULT 2000,
    "requirementForSecondVillage" INTEGER NOT NULL DEFAULT 2000,
    "artworkCpProductionDivisor" REAL NOT NULL DEFAULT 1.0,
    "artworkLimit" INTEGER NOT NULL DEFAULT 2000,
    "artworkUsageCooldownHours" INTEGER NOT NULL DEFAULT 24,
    "itemTier2AfterDays" INTEGER NOT NULL DEFAULT 70,
    "itemTier3AfterDays" INTEGER NOT NULL DEFAULT 140,
    "auctionDurationHours" REAL NOT NULL DEFAULT 24.0,
    "smeltingTimeHours" INTEGER NOT NULL DEFAULT 24,
    "heroAdventuresPerDay" INTEGER NOT NULL DEFAULT 6,
    "adventuresForAuctionHouse" INTEGER NOT NULL DEFAULT 20,
    "heroExperienceMultiplier" REAL NOT NULL DEFAULT 0.5,
    "heroLootFrequencyMultiplier" REAL NOT NULL DEFAULT 1.5,
    "beginnerProtectionDays" INTEGER NOT NULL DEFAULT 5,
    "travianPlusDurationDays" INTEGER NOT NULL DEFAULT 7,
    "resourceBonusDurationDays" INTEGER NOT NULL DEFAULT 7,
    "availableVacationDays" INTEGER NOT NULL DEFAULT 15,
    "upgradingToCityCooldownHours" INTEGER NOT NULL DEFAULT 24,
    "natarAttackDelayHours" INTEGER NOT NULL DEFAULT 24,
    "reignOfFireConstructionSpeed" REAL NOT NULL DEFAULT 0.75,
    "worldType" TEXT NOT NULL DEFAULT 'CLASSIC',
    "seasonType" TEXT,
    "seasonName" TEXT,
    "seasonDescription" TEXT,
    "estimatedDurationDays" INTEGER,
    "seasonFeatures" JSONB,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRegistrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GameWorld" ("adventuresForAuctionHouse", "annualSpecialDurationDays", "artefactsIntroducedAfterDays", "artworkCpProductionDivisor", "artworkLimit", "artworkUsageCooldownHours", "auctionDurationHours", "availableVacationDays", "beginnerProtectionDays", "constructionPlansAfterDays", "createdAt", "description", "heroAdventuresPerDay", "heroExperienceMultiplier", "heroLootFrequencyMultiplier", "id", "isActive", "isRegistrationOpen", "itemTier2AfterDays", "itemTier3AfterDays", "natarAttackDelayHours", "natarWonderFinishesAfterDays", "region", "registrationClosesAfterDays", "reignOfFireConstructionSpeed", "requirementForSecondVillage", "resourceBonusDurationDays", "smeltingTimeHours", "speed", "startedAt", "startingCulturePoints", "townhallCelebrationTimeDivisor", "townhallLargeCelebrationLimit", "townhallSmallCelebrationLimit", "travianPlusDurationDays", "updatedAt", "upgradingToCityCooldownHours", "version", "worldCode", "worldName") SELECT "adventuresForAuctionHouse", "annualSpecialDurationDays", "artefactsIntroducedAfterDays", "artworkCpProductionDivisor", "artworkLimit", "artworkUsageCooldownHours", "auctionDurationHours", "availableVacationDays", "beginnerProtectionDays", "constructionPlansAfterDays", "createdAt", "description", "heroAdventuresPerDay", "heroExperienceMultiplier", "heroLootFrequencyMultiplier", "id", "isActive", "isRegistrationOpen", "itemTier2AfterDays", "itemTier3AfterDays", "natarAttackDelayHours", "natarWonderFinishesAfterDays", "region", "registrationClosesAfterDays", "reignOfFireConstructionSpeed", "requirementForSecondVillage", "resourceBonusDurationDays", "smeltingTimeHours", "speed", "startedAt", "startingCulturePoints", "townhallCelebrationTimeDivisor", "townhallLargeCelebrationLimit", "townhallSmallCelebrationLimit", "travianPlusDurationDays", "updatedAt", "upgradingToCityCooldownHours", "version", "worldCode", "worldName" FROM "GameWorld";
DROP TABLE "GameWorld";
ALTER TABLE "new_GameWorld" RENAME TO "GameWorld";
CREATE UNIQUE INDEX "GameWorld_worldCode_key" ON "GameWorld"("worldCode");
CREATE INDEX "GameWorld_version_idx" ON "GameWorld"("version");
CREATE INDEX "GameWorld_region_idx" ON "GameWorld"("region");
CREATE INDEX "GameWorld_speed_idx" ON "GameWorld"("speed");
CREATE INDEX "GameWorld_isActive_idx" ON "GameWorld"("isActive");
CREATE INDEX "GameWorld_isRegistrationOpen_idx" ON "GameWorld"("isRegistrationOpen");
CREATE TABLE "new_MarketOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "offeringResource" TEXT NOT NULL,
    "offeringAmount" INTEGER NOT NULL,
    "requestResource" TEXT NOT NULL,
    "requestAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "acceptedById" TEXT,
    "acceptedAt" DATETIME,
    "merchantsRequired" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "MarketOrder_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketOrder_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MarketOrder" ("acceptedAt", "acceptedById", "createdAt", "expiresAt", "id", "offeringAmount", "offeringResource", "playerId", "requestAmount", "requestResource", "status", "type", "villageId") SELECT "acceptedAt", "acceptedById", "createdAt", "expiresAt", "id", "offeringAmount", "offeringResource", "playerId", "requestAmount", "requestResource", "status", "type", "villageId" FROM "MarketOrder";
DROP TABLE "MarketOrder";
ALTER TABLE "new_MarketOrder" RENAME TO "MarketOrder";
CREATE INDEX "MarketOrder_villageId_idx" ON "MarketOrder"("villageId");
CREATE INDEX "MarketOrder_playerId_idx" ON "MarketOrder"("playerId");
CREATE INDEX "MarketOrder_status_idx" ON "MarketOrder"("status");
CREATE INDEX "MarketOrder_expiresAt_idx" ON "MarketOrder"("expiresAt");
CREATE INDEX "MarketOrder_status_expiresAt_idx" ON "MarketOrder"("status", "expiresAt");
CREATE INDEX "MarketOrder_type_status_idx" ON "MarketOrder"("type", "status");
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
    "payload" JSONB,
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
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameWorldId" TEXT,
    "gameTribe" TEXT,
    "playerName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileHeadline" TEXT,
    "profileBio" TEXT,
    "countryCode" TEXT,
    "preferredLanguage" TEXT,
    "profileVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "allowFriendRequests" BOOLEAN NOT NULL DEFAULT true,
    "allowMentorship" BOOLEAN NOT NULL DEFAULT true,
    "socialFeedOptIn" BOOLEAN NOT NULL DEFAULT false,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "wavesSurvived" INTEGER NOT NULL DEFAULT 0,
    "troopsKilled" INTEGER NOT NULL DEFAULT 0,
    "troopsLost" INTEGER NOT NULL DEFAULT 0,
    "odAttacking" INTEGER NOT NULL DEFAULT 0,
    "odDefending" INTEGER NOT NULL DEFAULT 0,
    "odSupporting" INTEGER NOT NULL DEFAULT 0,
    "culturePoints" INTEGER NOT NULL DEFAULT 0,
    "cpTotal" INTEGER NOT NULL DEFAULT 0,
    "villagesAllowed" INTEGER NOT NULL DEFAULT 1,
    "villagesUsed" INTEGER NOT NULL DEFAULT 1,
    "inactivityAllowanceDays" INTEGER NOT NULL DEFAULT 14,
    "lastOwnerActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "banReason" TEXT,
    "beginnerProtectionUntil" DATETIME,
    "hasExtendedProtection" BOOLEAN NOT NULL DEFAULT false,
    "hasGoldClubMembership" BOOLEAN NOT NULL DEFAULT false,
    "goldClubExpiresAt" DATETIME,
    "premiumPoints" INTEGER NOT NULL DEFAULT 0,
    "tribeRole" TEXT,
    "tribePermissions" JSONB,
    "tribeJoinedAt" DATETIME,
    "tribeRejoinAvailableAt" DATETIME,
    "attackRestrictedUntil" DATETIME,
    "tradeRestrictedUntil" DATETIME,
    "suspendedUntil" DATETIME,
    "tribeId" TEXT,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Player_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Player_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "Tribe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("banReason", "beginnerProtectionUntil", "cpTotal", "createdAt", "culturePoints", "deletedAt", "gameTribe", "gameWorldId", "goldClubExpiresAt", "hasGoldClubMembership", "id", "isDeleted", "lastActiveAt", "playerName", "rank", "totalPoints", "tribeId", "troopsKilled", "troopsLost", "updatedAt", "userId", "villagesAllowed", "villagesUsed", "wavesSurvived") SELECT "banReason", "beginnerProtectionUntil", "cpTotal", "createdAt", "culturePoints", "deletedAt", "gameTribe", "gameWorldId", "goldClubExpiresAt", "hasGoldClubMembership", "id", "isDeleted", "lastActiveAt", "playerName", "rank", "totalPoints", "tribeId", "troopsKilled", "troopsLost", "updatedAt", "userId", "villagesAllowed", "villagesUsed", "wavesSurvived" FROM "Player";
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
CREATE INDEX "Player_attackRestrictedUntil_idx" ON "Player"("attackRestrictedUntil");
CREATE INDEX "Player_tradeRestrictedUntil_idx" ON "Player"("tradeRestrictedUntil");
CREATE INDEX "Player_suspendedUntil_idx" ON "Player"("suspendedUntil");
CREATE TABLE "new_RallyPoint" (
    "villageId" TEXT NOT NULL PRIMARY KEY,
    "level" INTEGER NOT NULL DEFAULT 1,
    "waveWindowMs" INTEGER NOT NULL DEFAULT 150,
    "optionsJson" JSONB NOT NULL,
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
    "payload" JSONB NOT NULL,
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
    "summary" JSONB NOT NULL,
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
    "unitsJson" JSONB NOT NULL,
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
    "unitsJson" JSONB NOT NULL,
    "catapultTargetsJson" JSONB,
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
CREATE TABLE "new_ResourceReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "wood" INTEGER NOT NULL DEFAULT 0,
    "stone" INTEGER NOT NULL DEFAULT 0,
    "iron" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "food" INTEGER NOT NULL DEFAULT 0,
    "reservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "fulfilledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResourceReservation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceReservation_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ResourceReservation" ("createdAt", "expiresAt", "food", "fulfilledAt", "gold", "id", "iron", "label", "playerId", "reservedAt", "stone", "updatedAt", "villageId", "wood") SELECT "createdAt", "expiresAt", "food", "fulfilledAt", "gold", "id", "iron", "label", "playerId", "reservedAt", "stone", "updatedAt", "villageId", "wood" FROM "ResourceReservation";
DROP TABLE "ResourceReservation";
ALTER TABLE "new_ResourceReservation" RENAME TO "ResourceReservation";
CREATE INDEX "ResourceReservation_playerId_idx" ON "ResourceReservation"("playerId");
CREATE INDEX "ResourceReservation_villageId_idx" ON "ResourceReservation"("villageId");
CREATE INDEX "ResourceReservation_playerId_villageId_idx" ON "ResourceReservation"("playerId", "villageId");
CREATE TABLE "new_TrainingQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startAt" DATETIME NOT NULL,
    "finishAt" DATETIME NOT NULL,
    "unitDurationSeconds" REAL NOT NULL DEFAULT 0,
    "totalDurationSeconds" REAL NOT NULL DEFAULT 0,
    "buildingLevel" INTEGER NOT NULL DEFAULT 1,
    "costWood" INTEGER NOT NULL DEFAULT 0,
    "costClay" INTEGER NOT NULL DEFAULT 0,
    "costIron" INTEGER NOT NULL DEFAULT 0,
    "costCrop" INTEGER NOT NULL DEFAULT 0,
    "costGold" INTEGER NOT NULL DEFAULT 0,
    "populationCost" INTEGER NOT NULL DEFAULT 0,
    "worldSpeedApplied" REAL NOT NULL DEFAULT 1,
    "cancelledAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingQueueItem_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingQueueItem_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TrainingQueueItem" ("building", "buildingLevel", "cancelledAt", "costClay", "costCrop", "costIron", "costWood", "count", "createdAt", "finishAt", "id", "populationCost", "queuedAt", "startAt", "status", "totalDurationSeconds", "unitDurationSeconds", "unitTypeId", "updatedAt", "villageId", "worldSpeedApplied") SELECT "building", "buildingLevel", "cancelledAt", "costClay", "costCrop", "costIron", "costWood", "count", "createdAt", "finishAt", "id", "populationCost", "queuedAt", "startAt", "status", "totalDurationSeconds", "unitDurationSeconds", "unitTypeId", "updatedAt", "villageId", "worldSpeedApplied" FROM "TrainingQueueItem";
DROP TABLE "TrainingQueueItem";
ALTER TABLE "new_TrainingQueueItem" RENAME TO "TrainingQueueItem";
CREATE INDEX "TrainingQueueItem_villageId_status_finishAt_idx" ON "TrainingQueueItem"("villageId", "status", "finishAt");
CREATE INDEX "TrainingQueueItem_villageId_building_status_idx" ON "TrainingQueueItem"("villageId", "building", "status");
CREATE INDEX "TrainingQueueItem_unitTypeId_idx" ON "TrainingQueueItem"("unitTypeId");
CREATE TABLE "new_TrapperPrisoner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defenderVillageId" TEXT NOT NULL,
    "attackerVillageId" TEXT NOT NULL,
    "attackerAccountId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceMovementId" TEXT,
    "metadata" JSONB,
    CONSTRAINT "TrapperPrisoner_defenderVillageId_fkey" FOREIGN KEY ("defenderVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrapperPrisoner_attackerVillageId_fkey" FOREIGN KEY ("attackerVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TrapperPrisoner" ("attackerAccountId", "attackerVillageId", "capturedAt", "count", "defenderVillageId", "id", "metadata", "sourceMovementId", "unitTypeId") SELECT "attackerAccountId", "attackerVillageId", "capturedAt", "count", "defenderVillageId", "id", "metadata", "sourceMovementId", "unitTypeId" FROM "TrapperPrisoner";
DROP TABLE "TrapperPrisoner";
ALTER TABLE "new_TrapperPrisoner" RENAME TO "TrapperPrisoner";
CREATE INDEX "TrapperPrisoner_defenderVillageId_idx" ON "TrapperPrisoner"("defenderVillageId");
CREATE INDEX "TrapperPrisoner_defenderVillageId_capturedAt_idx" ON "TrapperPrisoner"("defenderVillageId", "capturedAt");
CREATE INDEX "TrapperPrisoner_attackerAccountId_idx" ON "TrapperPrisoner"("attackerAccountId");
CREATE TABLE "new_Tribe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT,
    "motd" TEXT,
    "profileBody" TEXT,
    "leaderId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "joinPolicy" TEXT NOT NULL DEFAULT 'INVITE_ONLY',
    "memberDefaultPermissions" JSONB NOT NULL,
    "diplomacySettings" JSONB,
    "forumSettings" JSONB,
    "settings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tribe_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tribe" ("createdAt", "description", "id", "joinPolicy", "leaderId", "memberCount", "motd", "name", "tag", "totalPoints", "updatedAt") SELECT "createdAt", "description", "id", "joinPolicy", "leaderId", "memberCount", "motd", "name", "tag", "totalPoints", "updatedAt" FROM "Tribe";
DROP TABLE "Tribe";
ALTER TABLE "new_Tribe" RENAME TO "Tribe";
CREATE UNIQUE INDEX "Tribe_name_key" ON "Tribe"("name");
CREATE UNIQUE INDEX "Tribe_tag_key" ON "Tribe"("tag");
CREATE UNIQUE INDEX "Tribe_leaderId_key" ON "Tribe"("leaderId");
CREATE INDEX "Tribe_name_idx" ON "Tribe"("name");
CREATE INDEX "Tribe_tag_idx" ON "Tribe"("tag");
CREATE INDEX "Tribe_leaderId_idx" ON "Tribe"("leaderId");
CREATE INDEX "Tribe_totalPoints_idx" ON "Tribe"("totalPoints");
CREATE INDEX "Tribe_memberCount_idx" ON "Tribe"("memberCount");
CREATE INDEX "Tribe_joinPolicy_idx" ON "Tribe"("joinPolicy");
CREATE INDEX "Tribe_totalPoints_memberCount_idx" ON "Tribe"("totalPoints", "memberCount");
CREATE TABLE "new_TribeInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tribeId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "invitedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "TribeInvite_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "Tribe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TribeInvite_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TribeInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TribeInvite" ("createdAt", "expiresAt", "id", "playerId", "status", "tribeId") SELECT "createdAt", "expiresAt", "id", "playerId", "status", "tribeId" FROM "TribeInvite";
DROP TABLE "TribeInvite";
ALTER TABLE "new_TribeInvite" RENAME TO "TribeInvite";
CREATE INDEX "TribeInvite_tribeId_idx" ON "TribeInvite"("tribeId");
CREATE INDEX "TribeInvite_playerId_idx" ON "TribeInvite"("playerId");
CREATE INDEX "TribeInvite_invitedById_idx" ON "TribeInvite"("invitedById");
CREATE INDEX "TribeInvite_status_idx" ON "TribeInvite"("status");
CREATE INDEX "TribeInvite_expiresAt_idx" ON "TribeInvite"("expiresAt");
CREATE INDEX "TribeInvite_status_expiresAt_idx" ON "TribeInvite"("status", "expiresAt");
CREATE UNIQUE INDEX "TribeInvite_tribeId_playerId_key" ON "TribeInvite"("tribeId", "playerId");
CREATE TABLE "new_UnitType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "attack" INTEGER NOT NULL,
    "defInf" INTEGER NOT NULL,
    "defCav" INTEGER NOT NULL,
    "defArch" INTEGER NOT NULL DEFAULT 0,
    "speedTilesPerHour" REAL NOT NULL,
    "carry" INTEGER NOT NULL,
    "upkeepCropPerHour" REAL NOT NULL,
    "popCost" INTEGER NOT NULL,
    "trainTimeSec" INTEGER NOT NULL,
    "costWood" INTEGER NOT NULL,
    "costClay" INTEGER NOT NULL,
    "costIron" INTEGER NOT NULL,
    "costCrop" INTEGER NOT NULL,
    "buildingReqJson" JSONB NOT NULL,
    "researchReqJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_UnitType" ("attack", "buildingReqJson", "carry", "costClay", "costCrop", "costIron", "costWood", "createdAt", "defArch", "defCav", "defInf", "id", "popCost", "researchReqJson", "role", "speedTilesPerHour", "trainTimeSec", "updatedAt", "upkeepCropPerHour") SELECT "attack", "buildingReqJson", "carry", "costClay", "costCrop", "costIron", "costWood", "createdAt", "defArch", "defCav", "defInf", "id", "popCost", "researchReqJson", "role", "speedTilesPerHour", "trainTimeSec", "updatedAt", "upkeepCropPerHour" FROM "UnitType";
DROP TABLE "UnitType";
ALTER TABLE "new_UnitType" RENAME TO "UnitType";
CREATE INDEX "UnitType_role_idx" ON "UnitType"("role");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerifiedAt" DATETIME,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutExpiresAt" DATETIME,
    "lastLoginAt" DATETIME,
    "lastLoginIp" TEXT,
    "lastSecurityAlertAt" DATETIME,
    "suspendedUntil" DATETIME,
    "ipBanUntil" DATETIME,
    "suspicionScore" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("createdAt", "displayName", "email", "id", "lastActiveAt", "password", "updatedAt", "username") SELECT "createdAt", "displayName", "email", "id", "lastActiveAt", "password", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_suspendedUntil_idx" ON "User"("suspendedUntil");
CREATE INDEX "User_ipBanUntil_idx" ON "User"("ipBanUntil");
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
    "woodFractional" REAL NOT NULL DEFAULT 0,
    "stoneFractional" REAL NOT NULL DEFAULT 0,
    "ironFractional" REAL NOT NULL DEFAULT 0,
    "goldFractional" REAL NOT NULL DEFAULT 0,
    "foodFractional" REAL NOT NULL DEFAULT 0,
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
    "warehouseFullNotifiedAt" DATETIME,
    "granaryFullNotifiedAt" DATETIME,
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
INSERT INTO "new_Village" ("conqueredFromPlayerId", "continentId", "createdAt", "culturePointsPerHour", "expansionSlotsTotal", "expansionSlotsUsed", "food", "foodProduction", "foundedByVillageId", "gold", "goldProduction", "id", "iron", "ironProduction", "isCapital", "lastLoyaltyAttackAt", "lastTickAt", "loyalty", "loyaltyUpdatedAt", "maxLoyalty", "name", "playerId", "population", "regionId", "stone", "stoneProduction", "updatedAt", "wood", "woodProduction", "x", "y") SELECT "conqueredFromPlayerId", "continentId", "createdAt", "culturePointsPerHour", "expansionSlotsTotal", "expansionSlotsUsed", "food", "foodProduction", "foundedByVillageId", "gold", "goldProduction", "id", "iron", "ironProduction", "isCapital", "lastLoyaltyAttackAt", "lastTickAt", "loyalty", "loyaltyUpdatedAt", "maxLoyalty", "name", "playerId", "population", "regionId", "stone", "stoneProduction", "updatedAt", "wood", "woodProduction", "x", "y" FROM "Village";
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
    "scoutingConfig" JSONB,
    "nightPolicyConfig" JSONB,
    "siegeRulesConfig" JSONB,
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

-- CreateIndex
CREATE UNIQUE INDEX "AchievementDefinition_key_key" ON "AchievementDefinition"("key");

-- CreateIndex
CREATE INDEX "AchievementDefinition_category_idx" ON "AchievementDefinition"("category");

-- CreateIndex
CREATE INDEX "PlayerAchievement_playerId_status_idx" ON "PlayerAchievement"("playerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_playerId_achievementId_key" ON "PlayerAchievement"("playerId", "achievementId");

-- CreateIndex
CREATE INDEX "WorldEvent_gameWorldId_status_idx" ON "WorldEvent"("gameWorldId", "status");

-- CreateIndex
CREATE INDEX "WorldEvent_startsAt_idx" ON "WorldEvent"("startsAt");

-- CreateIndex
CREATE INDEX "WorldEvent_endsAt_idx" ON "WorldEvent"("endsAt");

-- CreateIndex
CREATE INDEX "EventScore_worldEventId_score_idx" ON "EventScore"("worldEventId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "EventScore_worldEventId_participantId_key" ON "EventScore"("worldEventId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityQuestion_userId_questionKey_key" ON "SecurityQuestion"("userId", "questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "CaptchaChallenge_expiresAt_idx" ON "CaptchaChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_userId_idx" ON "LoginAttempt"("userId");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedDevice_deviceTokenHash_key" ON "TrustedDevice"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "TrustedDevice_userId_idx" ON "TrustedDevice"("userId");

-- CreateIndex
CREATE INDEX "TrustedDevice_expiresAt_idx" ON "TrustedDevice"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorSettings_userId_key" ON "TwoFactorSettings"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_userId_idx" ON "TwoFactorChallenge"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_expiresAt_idx" ON "TwoFactorChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetRequest_token_key" ON "PasswordResetRequest"("token");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_email_idx" ON "PasswordResetRequest"("email");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_expiresAt_idx" ON "PasswordResetRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "AccountRecoveryRequest_email_idx" ON "AccountRecoveryRequest"("email");

-- CreateIndex
CREATE INDEX "AccountRecoveryRequest_status_idx" ON "AccountRecoveryRequest"("status");

-- CreateIndex
CREATE INDEX "AccountLinkEvidence_userIdA_idx" ON "AccountLinkEvidence"("userIdA");

-- CreateIndex
CREATE INDEX "AccountLinkEvidence_userIdB_idx" ON "AccountLinkEvidence"("userIdB");

-- CreateIndex
CREATE INDEX "AccountLinkEvidence_linkType_idx" ON "AccountLinkEvidence"("linkType");

-- CreateIndex
CREATE INDEX "AccountLinkEvidence_createdAt_idx" ON "AccountLinkEvidence"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountLinkEvidence_userIdA_userIdB_linkType_key" ON "AccountLinkEvidence"("userIdA", "userIdB", "linkType");

-- CreateIndex
CREATE INDEX "ModerationReport_type_status_idx" ON "ModerationReport"("type", "status");

-- CreateIndex
CREATE INDEX "ModerationReport_severity_createdAt_idx" ON "ModerationReport"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReport_createdAt_idx" ON "ModerationReport"("createdAt");

-- CreateIndex
CREATE INDEX "EnforcementAction_targetType_targetId_idx" ON "EnforcementAction"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "EnforcementAction_action_startAt_idx" ON "EnforcementAction"("action", "startAt");

-- CreateIndex
CREATE INDEX "EnforcementAction_endAt_idx" ON "EnforcementAction"("endAt");

-- CreateIndex
CREATE INDEX "MultiAccountAllowlist_type_idx" ON "MultiAccountAllowlist"("type");

-- CreateIndex
CREATE INDEX "MultiAccountAllowlist_ipAddress_idx" ON "MultiAccountAllowlist"("ipAddress");

-- CreateIndex
CREATE INDEX "MultiAccountAllowlist_deviceTokenHash_idx" ON "MultiAccountAllowlist"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "MultiAccountAllowlist_userIdA_idx" ON "MultiAccountAllowlist"("userIdA");

-- CreateIndex
CREATE INDEX "MultiAccountAllowlist_userIdB_idx" ON "MultiAccountAllowlist"("userIdB");

-- CreateIndex
CREATE INDEX "MultiAccountAllowlist_expiresAt_idx" ON "MultiAccountAllowlist"("expiresAt");

-- CreateIndex
CREATE INDEX "IpBan_expiresAt_idx" ON "IpBan"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IpBan_ipAddress_key" ON "IpBan"("ipAddress");

-- CreateIndex
CREATE INDEX "ModerationAppeal_userId_idx" ON "ModerationAppeal"("userId");

-- CreateIndex
CREATE INDEX "ModerationAppeal_playerId_idx" ON "ModerationAppeal"("playerId");

-- CreateIndex
CREATE INDEX "ModerationAppeal_status_idx" ON "ModerationAppeal"("status");

-- CreateIndex
CREATE INDEX "ModerationAppeal_createdAt_idx" ON "ModerationAppeal"("createdAt");

-- CreateIndex
CREATE INDEX "Sitter_ownerId_isActive_idx" ON "Sitter"("ownerId", "isActive");

-- CreateIndex
CREATE INDEX "Sitter_sitterId_isActive_idx" ON "Sitter"("sitterId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Sitter_ownerId_sitterId_key" ON "Sitter"("ownerId", "sitterId");

-- CreateIndex
CREATE INDEX "SitterSession_ownerId_isActive_idx" ON "SitterSession"("ownerId", "isActive");

-- CreateIndex
CREATE INDEX "SitterSession_sitterId_isActive_idx" ON "SitterSession"("sitterId", "isActive");

-- CreateIndex
CREATE INDEX "SitterSession_expiresAt_idx" ON "SitterSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AccountActionLog_playerId_createdAt_idx" ON "AccountActionLog"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "AccountActionLog_actorType_idx" ON "AccountActionLog"("actorType");

-- CreateIndex
CREATE INDEX "Dual_playerId_isActive_idx" ON "Dual"("playerId", "isActive");

-- CreateIndex
CREATE INDEX "Dual_lobbyUserId_isActive_idx" ON "Dual"("lobbyUserId", "isActive");

-- CreateIndex
CREATE INDEX "PlayerBadge_playerId_idx" ON "PlayerBadge"("playerId");

-- CreateIndex
CREATE INDEX "PlayerBadge_category_idx" ON "PlayerBadge"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBadge_playerId_badgeKey_key" ON "PlayerBadge"("playerId", "badgeKey");

-- CreateIndex
CREATE INDEX "PlayerFriendship_addresseeId_status_idx" ON "PlayerFriendship"("addresseeId", "status");

-- CreateIndex
CREATE INDEX "PlayerFriendship_requesterId_status_idx" ON "PlayerFriendship"("requesterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerFriendship_requesterId_addresseeId_key" ON "PlayerFriendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerContactNote_ownerId_targetId_key" ON "PlayerContactNote"("ownerId", "targetId");

-- CreateIndex
CREATE INDEX "PlayerBlock_blockedPlayerId_idx" ON "PlayerBlock"("blockedPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBlock_playerId_blockedPlayerId_key" ON "PlayerBlock"("playerId", "blockedPlayerId");

-- CreateIndex
CREATE INDEX "PlayerEndorsement_targetId_status_idx" ON "PlayerEndorsement"("targetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerEndorsement_endorserId_targetId_key" ON "PlayerEndorsement"("endorserId", "targetId");

-- CreateIndex
CREATE INDEX "PlayerMentorship_menteeId_status_idx" ON "PlayerMentorship"("menteeId", "status");

-- CreateIndex
CREATE INDEX "PlayerMentorship_mentorId_status_idx" ON "PlayerMentorship"("mentorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMentorship_mentorId_menteeId_key" ON "PlayerMentorship"("mentorId", "menteeId");

-- CreateIndex
CREATE INDEX "PlayerSocialActivity_playerId_createdAt_idx" ON "PlayerSocialActivity"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerSocialActivity_actorId_idx" ON "PlayerSocialActivity"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "EndgameConfig_worldConfigId_key" ON "EndgameConfig"("worldConfigId");

-- CreateIndex
CREATE INDEX "EndgameConfig_type_idx" ON "EndgameConfig"("type");

-- CreateIndex
CREATE INDEX "EndgameState_endgameConfigId_idx" ON "EndgameState"("endgameConfigId");

-- CreateIndex
CREATE INDEX "EndgameState_status_idx" ON "EndgameState"("status");

-- CreateIndex
CREATE INDEX "EndgameState_leadingTribeId_idx" ON "EndgameState"("leadingTribeId");

-- CreateIndex
CREATE UNIQUE INDEX "EndgameRuneVillage_villageId_key" ON "EndgameRuneVillage"("villageId");

-- CreateIndex
CREATE INDEX "EndgameRuneVillage_endgameConfigId_idx" ON "EndgameRuneVillage"("endgameConfigId");

-- CreateIndex
CREATE INDEX "EndgameRuneVillage_controllingTribeId_idx" ON "EndgameRuneVillage"("controllingTribeId");

-- CreateIndex
CREATE INDEX "EndgameRuneVillage_runeType_idx" ON "EndgameRuneVillage"("runeType");

-- CreateIndex
CREATE INDEX "Relic_ownerId_idx" ON "Relic"("ownerId");

-- CreateIndex
CREATE INDEX "Relic_relicType_idx" ON "Relic"("relicType");

-- CreateIndex
CREATE INDEX "Relic_relicClass_idx" ON "Relic"("relicClass");

-- CreateIndex
CREATE INDEX "RelicPlacement_villageId_isActive_idx" ON "RelicPlacement"("villageId", "isActive");

-- CreateIndex
CREATE INDEX "RelicPlacement_placedById_isActive_idx" ON "RelicPlacement"("placedById", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "events_queue_dedupeKey_key" ON "events_queue"("dedupeKey");

-- CreateIndex
CREATE INDEX "events_queue_status_scheduledAt_idx" ON "events_queue"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "events_queue_type_status_scheduledAt_idx" ON "events_queue"("type", "status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Technology_key_key" ON "Technology"("key");

-- CreateIndex
CREATE INDEX "PlayerTechnology_playerId_idx" ON "PlayerTechnology"("playerId");

-- CreateIndex
CREATE INDEX "PlayerTechnology_technologyId_idx" ON "PlayerTechnology"("technologyId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTechnology_playerId_technologyId_key" ON "PlayerTechnology"("playerId", "technologyId");

-- CreateIndex
CREATE INDEX "ResearchJob_playerId_idx" ON "ResearchJob"("playerId");

-- CreateIndex
CREATE INDEX "ResearchJob_villageId_idx" ON "ResearchJob"("villageId");

-- CreateIndex
CREATE INDEX "ResearchJob_buildingId_idx" ON "ResearchJob"("buildingId");

-- CreateIndex
CREATE INDEX "ResearchJob_completionAt_idx" ON "ResearchJob"("completionAt");

-- CreateIndex
CREATE INDEX "SmithyUpgradeJob_playerId_idx" ON "SmithyUpgradeJob"("playerId");

-- CreateIndex
CREATE INDEX "SmithyUpgradeJob_villageId_idx" ON "SmithyUpgradeJob"("villageId");

-- CreateIndex
CREATE INDEX "SmithyUpgradeJob_buildingId_idx" ON "SmithyUpgradeJob"("buildingId");

-- CreateIndex
CREATE INDEX "SmithyUpgradeJob_completionAt_idx" ON "SmithyUpgradeJob"("completionAt");

-- CreateIndex
CREATE INDEX "TribeApplication_tribeId_idx" ON "TribeApplication"("tribeId");

-- CreateIndex
CREATE INDEX "TribeApplication_playerId_idx" ON "TribeApplication"("playerId");

-- CreateIndex
CREATE INDEX "TribeApplication_status_idx" ON "TribeApplication"("status");

-- CreateIndex
CREATE INDEX "TribeApplication_reviewedById_idx" ON "TribeApplication"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "TribeApplication_tribeId_playerId_key" ON "TribeApplication"("tribeId", "playerId");

-- CreateIndex
CREATE INDEX "PlayerNotification_playerId_isRead_idx" ON "PlayerNotification"("playerId", "isRead");

-- CreateIndex
CREATE INDEX "PlayerNotification_playerId_priority_isRead_idx" ON "PlayerNotification"("playerId", "priority", "isRead");

-- CreateIndex
CREATE INDEX "PlayerNotification_playerId_createdAt_idx" ON "PlayerNotification"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerNotification_playerId_type_sourceId_idx" ON "PlayerNotification"("playerId", "type", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_playerId_key" ON "NotificationPreference"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");

-- CreateIndex
CREATE INDEX "PushDevice_playerId_idx" ON "PushDevice"("playerId");

-- CreateIndex
CREATE INDEX "PushDevice_platform_idx" ON "PushDevice"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSettings_playerId_key" ON "PlayerSettings"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailNotificationSetting_playerId_key" ON "EmailNotificationSetting"("playerId");

-- CreateIndex
CREATE INDEX "EmailNotificationSetting_playerId_idx" ON "EmailNotificationSetting"("playerId");

-- CreateIndex
CREATE INDEX "EmailNotificationSetting_deliverySchedule_idx" ON "EmailNotificationSetting"("deliverySchedule");

-- CreateIndex
CREATE INDEX "EmailNotificationSetting_language_idx" ON "EmailNotificationSetting"("language");

-- CreateIndex
CREATE INDEX "EmailNotificationEvent_playerId_status_readyAt_idx" ON "EmailNotificationEvent"("playerId", "status", "readyAt");

-- CreateIndex
CREATE INDEX "EmailNotificationEvent_topic_idx" ON "EmailNotificationEvent"("topic");

-- CreateIndex
CREATE INDEX "EmailNotificationEvent_messageId_idx" ON "EmailNotificationEvent"("messageId");

-- CreateIndex
CREATE INDEX "EmailNotificationEvent_settingId_idx" ON "EmailNotificationEvent"("settingId");

-- CreateIndex
CREATE INDEX "EmailNotificationDelivery_playerId_sentAt_idx" ON "EmailNotificationDelivery"("playerId", "sentAt");

-- CreateIndex
CREATE INDEX "EmailNotificationDelivery_topic_sentAt_idx" ON "EmailNotificationDelivery"("topic", "sentAt");

-- CreateIndex
CREATE INDEX "EmailNotificationDelivery_settingId_idx" ON "EmailNotificationDelivery"("settingId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerReport_reference_key" ON "PlayerReport"("reference");

-- CreateIndex
CREATE INDEX "PlayerReport_type_status_idx" ON "PlayerReport"("type", "status");

-- CreateIndex
CREATE INDEX "PlayerReport_severity_status_idx" ON "PlayerReport"("severity", "status");

-- CreateIndex
CREATE INDEX "PlayerReport_reporterUserId_createdAt_idx" ON "PlayerReport"("reporterUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialQuest_key_key" ON "TutorialQuest"("key");

-- CreateIndex
CREATE INDEX "TutorialQuest_isActive_order_idx" ON "TutorialQuest"("isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialTask_key_key" ON "TutorialTask"("key");

-- CreateIndex
CREATE INDEX "TutorialTask_questId_order_idx" ON "TutorialTask"("questId", "order");

-- CreateIndex
CREATE INDEX "TutorialTask_isActive_idx" ON "TutorialTask"("isActive");

-- CreateIndex
CREATE INDEX "PlayerTaskProgress_playerId_status_idx" ON "PlayerTaskProgress"("playerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTaskProgress_playerId_taskId_key" ON "PlayerTaskProgress"("playerId", "taskId");

-- CreateIndex
CREATE INDEX "ReportMetadata_ownerAccountId_starred_idx" ON "ReportMetadata"("ownerAccountId", "starred");

-- CreateIndex
CREATE INDEX "ReportMetadata_ownerAccountId_archived_idx" ON "ReportMetadata"("ownerAccountId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "ReportMetadata_ownerAccountId_kind_refId_key" ON "ReportMetadata"("ownerAccountId", "kind", "refId");

-- CreateIndex
CREATE INDEX "ReportFolder_ownerAccountId_idx" ON "ReportFolder"("ownerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportFolder_ownerAccountId_name_key" ON "ReportFolder"("ownerAccountId", "name");

-- CreateIndex
CREATE INDEX "ReportFolderEntry_ownerAccountId_idx" ON "ReportFolderEntry"("ownerAccountId");

-- CreateIndex
CREATE INDEX "ReportTag_ownerAccountId_idx" ON "ReportTag"("ownerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTag_ownerAccountId_label_key" ON "ReportTag"("ownerAccountId", "label");

-- CreateIndex
CREATE INDEX "ReportTagEntry_ownerAccountId_idx" ON "ReportTagEntry"("ownerAccountId");

-- CreateIndex
CREATE INDEX "ReportShareToken_ownerAccountId_idx" ON "ReportShareToken"("ownerAccountId");

-- CreateIndex
CREATE INDEX "ReportShareToken_kind_refId_idx" ON "ReportShareToken"("kind", "refId");

-- CreateIndex
CREATE INDEX "ReportShareToken_expiresAt_idx" ON "ReportShareToken"("expiresAt");
