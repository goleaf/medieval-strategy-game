/*
  Warnings:

  - You are about to drop the column `demolitionAt` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionCost` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionMode` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `isDemolishing` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `speed` on the `WorldConfig` table. All the data in the column will be lost.
  - You are about to drop the column `worldName` on the `WorldConfig` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `WorldConfig` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "GameWorld" (
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRegistrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GameWorldTribe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameWorldId" TEXT NOT NULL,
    "tribe" TEXT NOT NULL,
    CONSTRAINT "GameWorldTribe_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "qualityTier" INTEGER NOT NULL,
    "rarity" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Hero" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Hero',
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "attack" INTEGER NOT NULL DEFAULT 10,
    "defense" INTEGER NOT NULL DEFAULT 5,
    "speed" INTEGER NOT NULL DEFAULT 5,
    "adventuresCompleted" INTEGER NOT NULL DEFAULT 0,
    "lastAdventureAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hero_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HeroItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "heroId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "quality" INTEGER NOT NULL DEFAULT 1,
    "attackBonus" INTEGER NOT NULL DEFAULT 0,
    "defenseBonus" INTEGER NOT NULL DEFAULT 0,
    "healthBonus" INTEGER NOT NULL DEFAULT 0,
    "speedBonus" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'CRAFTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeroItem_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HeroItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ItemTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HeroEquipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "heroId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "equippedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeroEquipment_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HeroEquipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HeroItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Material_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CraftingAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "itemId" TEXT,
    "materialRarity" TEXT,
    "materialCount" INTEGER DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationHours" INTEGER NOT NULL,
    "resultItemId" TEXT,
    "materialGained" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    CONSTRAINT "CraftingAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CraftingAction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HeroItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CraftingAction_resultItemId_fkey" FOREIGN KEY ("resultItemId") REFERENCES "HeroItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FooterSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FooterMenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "iconName" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FooterMenuItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FooterSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FooterContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Building" (
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
INSERT INTO "new_Building" ("completionAt", "constructionCostFood", "constructionCostGold", "constructionCostIron", "constructionCostStone", "constructionCostWood", "createdAt", "id", "isBuilding", "level", "queuePosition", "type", "updatedAt", "villageId") SELECT "completionAt", "constructionCostFood", "constructionCostGold", "constructionCostIron", "constructionCostStone", "constructionCostWood", "createdAt", "id", "isBuilding", "level", "queuePosition", "type", "updatedAt", "villageId" FROM "Building";
DROP TABLE "Building";
ALTER TABLE "new_Building" RENAME TO "Building";
CREATE INDEX "Building_villageId_idx" ON "Building"("villageId");
CREATE INDEX "Building_villageId_queuePosition_idx" ON "Building"("villageId", "queuePosition");
CREATE INDEX "Building_isBuilding_completionAt_idx" ON "Building"("isBuilding", "completionAt");
CREATE INDEX "Building_completionAt_idx" ON "Building"("completionAt");
CREATE INDEX "Building_type_level_idx" ON "Building"("type", "level");
CREATE UNIQUE INDEX "Building_villageId_type_key" ON "Building"("villageId", "type");
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameWorldId" TEXT,
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
    CONSTRAINT "Player_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Player_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "Tribe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("banReason", "beginnerProtectionUntil", "createdAt", "deletedAt", "id", "isDeleted", "lastActiveAt", "playerName", "rank", "totalPoints", "tribeId", "troopsKilled", "troopsLost", "updatedAt", "userId", "wavesSurvived") SELECT "banReason", "beginnerProtectionUntil", "createdAt", "deletedAt", "id", "isDeleted", "lastActiveAt", "playerName", "rank", "totalPoints", "tribeId", "troopsKilled", "troopsLost", "updatedAt", "userId", "wavesSurvived" FROM "Player";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldConfig_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorldConfig" ("beginnerProtectionEnabled", "beginnerProtectionHours", "constructionQueueLimit", "id", "isRunning", "maxX", "maxY", "nightBonusMultiplier", "productionMultiplier", "resourcePerTick", "startedAt", "tickIntervalMinutes", "unitSpeed") SELECT "beginnerProtectionEnabled", "beginnerProtectionHours", "constructionQueueLimit", "id", "isRunning", "maxX", "maxY", "nightBonusMultiplier", "productionMultiplier", "resourcePerTick", "startedAt", "tickIntervalMinutes", "unitSpeed" FROM "WorldConfig";
DROP TABLE "WorldConfig";
ALTER TABLE "new_WorldConfig" RENAME TO "WorldConfig";
CREATE UNIQUE INDEX "WorldConfig_gameWorldId_key" ON "WorldConfig"("gameWorldId");
CREATE INDEX "WorldConfig_gameWorldId_idx" ON "WorldConfig"("gameWorldId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GameWorld_worldCode_key" ON "GameWorld"("worldCode");

-- CreateIndex
CREATE INDEX "GameWorld_version_idx" ON "GameWorld"("version");

-- CreateIndex
CREATE INDEX "GameWorld_region_idx" ON "GameWorld"("region");

-- CreateIndex
CREATE INDEX "GameWorld_speed_idx" ON "GameWorld"("speed");

-- CreateIndex
CREATE INDEX "GameWorld_isActive_idx" ON "GameWorld"("isActive");

-- CreateIndex
CREATE INDEX "GameWorld_isRegistrationOpen_idx" ON "GameWorld"("isRegistrationOpen");

-- CreateIndex
CREATE INDEX "GameWorldTribe_gameWorldId_idx" ON "GameWorldTribe"("gameWorldId");

-- CreateIndex
CREATE UNIQUE INDEX "GameWorldTribe_gameWorldId_tribe_key" ON "GameWorldTribe"("gameWorldId", "tribe");

-- CreateIndex
CREATE INDEX "ItemTemplate_category_idx" ON "ItemTemplate"("category");

-- CreateIndex
CREATE INDEX "ItemTemplate_slot_idx" ON "ItemTemplate"("slot");

-- CreateIndex
CREATE INDEX "ItemTemplate_rarity_idx" ON "ItemTemplate"("rarity");

-- CreateIndex
CREATE INDEX "ItemTemplate_qualityTier_idx" ON "ItemTemplate"("qualityTier");

-- CreateIndex
CREATE UNIQUE INDEX "ItemTemplate_name_rarity_qualityTier_key" ON "ItemTemplate"("name", "rarity", "qualityTier");

-- CreateIndex
CREATE INDEX "Hero_playerId_idx" ON "Hero"("playerId");

-- CreateIndex
CREATE INDEX "Hero_level_idx" ON "Hero"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Hero_playerId_key" ON "Hero"("playerId");

-- CreateIndex
CREATE INDEX "HeroItem_heroId_idx" ON "HeroItem"("heroId");

-- CreateIndex
CREATE INDEX "HeroItem_templateId_idx" ON "HeroItem"("templateId");

-- CreateIndex
CREATE INDEX "HeroItem_slot_idx" ON "HeroItem"("slot");

-- CreateIndex
CREATE INDEX "HeroItem_rarity_idx" ON "HeroItem"("rarity");

-- CreateIndex
CREATE INDEX "HeroItem_source_idx" ON "HeroItem"("source");

-- CreateIndex
CREATE UNIQUE INDEX "HeroEquipment_slot_key" ON "HeroEquipment"("slot");

-- CreateIndex
CREATE INDEX "HeroEquipment_heroId_idx" ON "HeroEquipment"("heroId");

-- CreateIndex
CREATE INDEX "HeroEquipment_itemId_idx" ON "HeroEquipment"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "HeroEquipment_heroId_slot_key" ON "HeroEquipment"("heroId", "slot");

-- CreateIndex
CREATE INDEX "Material_playerId_idx" ON "Material"("playerId");

-- CreateIndex
CREATE INDEX "Material_rarity_idx" ON "Material"("rarity");

-- CreateIndex
CREATE UNIQUE INDEX "Material_playerId_rarity_key" ON "Material"("playerId", "rarity");

-- CreateIndex
CREATE INDEX "CraftingAction_playerId_idx" ON "CraftingAction"("playerId");

-- CreateIndex
CREATE INDEX "CraftingAction_actionType_idx" ON "CraftingAction"("actionType");

-- CreateIndex
CREATE INDEX "CraftingAction_status_idx" ON "CraftingAction"("status");

-- CreateIndex
CREATE INDEX "CraftingAction_completedAt_idx" ON "CraftingAction"("completedAt");

-- CreateIndex
CREATE INDEX "CraftingAction_status_completedAt_idx" ON "CraftingAction"("status", "completedAt");

-- CreateIndex
CREATE INDEX "FooterSection_order_idx" ON "FooterSection"("order");

-- CreateIndex
CREATE INDEX "FooterSection_isActive_idx" ON "FooterSection"("isActive");

-- CreateIndex
CREATE INDEX "FooterMenuItem_sectionId_idx" ON "FooterMenuItem"("sectionId");

-- CreateIndex
CREATE INDEX "FooterMenuItem_order_idx" ON "FooterMenuItem"("order");

-- CreateIndex
CREATE INDEX "FooterMenuItem_isActive_idx" ON "FooterMenuItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FooterContent_key_key" ON "FooterContent"("key");

-- CreateIndex
CREATE INDEX "FooterContent_key_idx" ON "FooterContent"("key");

-- CreateIndex
CREATE INDEX "FooterContent_isActive_idx" ON "FooterContent"("isActive");
