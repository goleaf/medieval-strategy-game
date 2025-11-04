-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "wavesSurvived" INTEGER NOT NULL DEFAULT 0,
    "troopsKilled" INTEGER NOT NULL DEFAULT 0,
    "troopsLost" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "banReason" TEXT,
    "beginnerProtectionUntil" DATETIME,
    "tribeId" TEXT,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Player_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "Tribe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldName" TEXT NOT NULL DEFAULT 'Medieval World',
    "maxX" INTEGER NOT NULL DEFAULT 100,
    "maxY" INTEGER NOT NULL DEFAULT 100,
    "speed" INTEGER NOT NULL DEFAULT 1,
    "unitSpeed" REAL NOT NULL DEFAULT 1.0,
    "isRunning" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resourcePerTick" INTEGER NOT NULL DEFAULT 10,
    "productionMultiplier" REAL NOT NULL DEFAULT 1.0,
    "tickIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "constructionQueueLimit" INTEGER NOT NULL DEFAULT 3,
    "nightBonusMultiplier" REAL NOT NULL DEFAULT 1.2,
    "beginnerProtectionHours" INTEGER NOT NULL DEFAULT 72,
    "beginnerProtectionEnabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Continent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Barbarian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "villageId" TEXT,
    "warriors" INTEGER NOT NULL DEFAULT 100,
    "spearmen" INTEGER NOT NULL DEFAULT 50,
    "bowmen" INTEGER NOT NULL DEFAULT 30,
    "horsemen" INTEGER NOT NULL DEFAULT 10,
    "spawnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttackAt" DATETIME,
    CONSTRAINT "Barbarian_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "continentId" TEXT NOT NULL,
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
    "loyalty" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastTickAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Village_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Village_continentId_fkey" FOREIGN KEY ("continentId") REFERENCES "Continent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Troop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "attack" INTEGER NOT NULL DEFAULT 10,
    "defense" INTEGER NOT NULL DEFAULT 5,
    "speed" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Troop_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TroopProduction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "troopType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "completionAt" DATETIME NOT NULL,
    CONSTRAINT "TroopProduction_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "troopId" TEXT NOT NULL,
    "fromX" INTEGER NOT NULL,
    "fromY" INTEGER NOT NULL,
    "toX" INTEGER NOT NULL,
    "toY" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivalAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "cancelledAt" DATETIME,
    CONSTRAINT "Movement_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromVillageId" TEXT NOT NULL,
    "toVillageId" TEXT,
    "movementId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetWood" INTEGER NOT NULL DEFAULT 0,
    "targetStone" INTEGER NOT NULL DEFAULT 0,
    "targetIron" INTEGER NOT NULL DEFAULT 0,
    "targetGold" INTEGER NOT NULL DEFAULT 0,
    "targetFood" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "arrivalAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "attackerWon" BOOLEAN,
    "lootWood" INTEGER NOT NULL DEFAULT 0,
    "lootStone" INTEGER NOT NULL DEFAULT 0,
    "lootIron" INTEGER NOT NULL DEFAULT 0,
    "lootGold" INTEGER NOT NULL DEFAULT 0,
    "lootFood" INTEGER NOT NULL DEFAULT 0,
    "scoutingData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attack_fromVillageId_fkey" FOREIGN KEY ("fromVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attack_toVillageId_fkey" FOREIGN KEY ("toVillageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attack_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttackUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attackId" TEXT NOT NULL,
    "troopId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "AttackUnit_attackId_fkey" FOREIGN KEY ("attackId") REFERENCES "Attack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttackUnit_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DefenseUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attackId" TEXT NOT NULL,
    "troopId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "DefenseUnit_attackId_fkey" FOREIGN KEY ("attackId") REFERENCES "Attack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DefenseUnit_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Defense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "wallLevel" INTEGER NOT NULL DEFAULT 0,
    "archers" INTEGER NOT NULL DEFAULT 0,
    "catapults" INTEGER NOT NULL DEFAULT 0,
    "bonusAgainstRaid" INTEGER NOT NULL DEFAULT 0,
    "bonusAgainstConquest" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Defense_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Research" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isResearching" BOOLEAN NOT NULL DEFAULT false,
    "completionAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Research_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tribe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT,
    "motd" TEXT,
    "leaderId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "joinPolicy" TEXT NOT NULL DEFAULT 'INVITE_ONLY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tribe_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TribeInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tribeId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "TribeInvite_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "Tribe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TribeInvite_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alliance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tribe1Id" TEXT NOT NULL,
    "tribe2Id" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alliance_tribe1Id_fkey" FOREIGN KEY ("tribe1Id") REFERENCES "Tribe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "War" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attackerTribeId" TEXT NOT NULL,
    "defenderTribeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    CONSTRAINT "War_attackerTribeId_fkey" FOREIGN KEY ("attackerTribeId") REFERENCES "Tribe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "War_defenderTribeId_fkey" FOREIGN KEY ("defenderTribeId") REFERENCES "Tribe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketOrder" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "MarketOrder_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketOrder_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "villageId" TEXT,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MODERATOR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderboardCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Player_playerName_key" ON "Player"("playerName");

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "Player"("userId");

-- CreateIndex
CREATE INDEX "Player_playerName_idx" ON "Player"("playerName");

-- CreateIndex
CREATE INDEX "Player_totalPoints_idx" ON "Player"("totalPoints");

-- CreateIndex
CREATE INDEX "Player_rank_idx" ON "Player"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "WorldConfig_id_key" ON "WorldConfig"("id");

-- CreateIndex
CREATE INDEX "Continent_name_idx" ON "Continent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Continent_x_y_key" ON "Continent"("x", "y");

-- CreateIndex
CREATE INDEX "Barbarian_x_y_idx" ON "Barbarian"("x", "y");

-- CreateIndex
CREATE INDEX "Barbarian_villageId_idx" ON "Barbarian"("villageId");

-- CreateIndex
CREATE INDEX "Village_playerId_idx" ON "Village"("playerId");

-- CreateIndex
CREATE INDEX "Village_continentId_idx" ON "Village"("continentId");

-- CreateIndex
CREATE INDEX "Village_isCapital_idx" ON "Village"("isCapital");

-- CreateIndex
CREATE UNIQUE INDEX "Village_x_y_key" ON "Village"("x", "y");

-- CreateIndex
CREATE INDEX "Building_villageId_idx" ON "Building"("villageId");

-- CreateIndex
CREATE INDEX "Building_villageId_queuePosition_idx" ON "Building"("villageId", "queuePosition");

-- CreateIndex
CREATE UNIQUE INDEX "Building_villageId_type_key" ON "Building"("villageId", "type");

-- CreateIndex
CREATE INDEX "Troop_villageId_idx" ON "Troop"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "Troop_villageId_type_key" ON "Troop"("villageId", "type");

-- CreateIndex
CREATE INDEX "TroopProduction_buildingId_idx" ON "TroopProduction"("buildingId");

-- CreateIndex
CREATE INDEX "TroopProduction_completionAt_idx" ON "TroopProduction"("completionAt");

-- CreateIndex
CREATE INDEX "Movement_troopId_idx" ON "Movement"("troopId");

-- CreateIndex
CREATE INDEX "Movement_arrivalAt_idx" ON "Movement"("arrivalAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attack_movementId_key" ON "Attack"("movementId");

-- CreateIndex
CREATE INDEX "Attack_fromVillageId_idx" ON "Attack"("fromVillageId");

-- CreateIndex
CREATE INDEX "Attack_toVillageId_idx" ON "Attack"("toVillageId");

-- CreateIndex
CREATE INDEX "Attack_status_idx" ON "Attack"("status");

-- CreateIndex
CREATE INDEX "Attack_arrivalAt_idx" ON "Attack"("arrivalAt");

-- CreateIndex
CREATE INDEX "AttackUnit_attackId_idx" ON "AttackUnit"("attackId");

-- CreateIndex
CREATE INDEX "AttackUnit_troopId_idx" ON "AttackUnit"("troopId");

-- CreateIndex
CREATE INDEX "DefenseUnit_attackId_idx" ON "DefenseUnit"("attackId");

-- CreateIndex
CREATE INDEX "DefenseUnit_troopId_idx" ON "DefenseUnit"("troopId");

-- CreateIndex
CREATE INDEX "Defense_villageId_idx" ON "Defense"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "Defense_villageId_key" ON "Defense"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "Research_buildingId_key" ON "Research"("buildingId");

-- CreateIndex
CREATE INDEX "Research_buildingId_idx" ON "Research"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Tribe_name_key" ON "Tribe"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tribe_tag_key" ON "Tribe"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "Tribe_leaderId_key" ON "Tribe"("leaderId");

-- CreateIndex
CREATE INDEX "Tribe_name_idx" ON "Tribe"("name");

-- CreateIndex
CREATE INDEX "Tribe_leaderId_idx" ON "Tribe"("leaderId");

-- CreateIndex
CREATE INDEX "TribeInvite_tribeId_idx" ON "TribeInvite"("tribeId");

-- CreateIndex
CREATE INDEX "TribeInvite_playerId_idx" ON "TribeInvite"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TribeInvite_tribeId_playerId_key" ON "TribeInvite"("tribeId", "playerId");

-- CreateIndex
CREATE INDEX "Alliance_tribe1Id_idx" ON "Alliance"("tribe1Id");

-- CreateIndex
CREATE UNIQUE INDEX "Alliance_tribe1Id_tribe2Id_key" ON "Alliance"("tribe1Id", "tribe2Id");

-- CreateIndex
CREATE INDEX "War_attackerTribeId_idx" ON "War"("attackerTribeId");

-- CreateIndex
CREATE INDEX "War_defenderTribeId_idx" ON "War"("defenderTribeId");

-- CreateIndex
CREATE UNIQUE INDEX "War_attackerTribeId_defenderTribeId_key" ON "War"("attackerTribeId", "defenderTribeId");

-- CreateIndex
CREATE INDEX "MarketOrder_villageId_idx" ON "MarketOrder"("villageId");

-- CreateIndex
CREATE INDEX "MarketOrder_playerId_idx" ON "MarketOrder"("playerId");

-- CreateIndex
CREATE INDEX "MarketOrder_status_idx" ON "MarketOrder"("status");

-- CreateIndex
CREATE INDEX "Message_villageId_idx" ON "Message"("villageId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_isRead_idx" ON "Message"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE INDEX "Admin_userId_idx" ON "Admin"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "LeaderboardCache_type_idx" ON "LeaderboardCache"("type");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardCache_type_key" ON "LeaderboardCache"("type");
