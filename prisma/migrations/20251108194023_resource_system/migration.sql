/*
  Warnings:

  - You are about to drop the column `demolitionAt` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionCost` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionMode` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `isDemolishing` on the `Building` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN "gameTribe" TEXT;

-- CreateTable
CREATE TABLE "StorageCapacityCurve" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buildingType" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CrannyProtectionCurve" (
    "level" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "protectedPerResource" INTEGER NOT NULL,
    "gaulBonusMultiplier" REAL NOT NULL DEFAULT 1.5,
    "teutonPenaltyPercent" REAL NOT NULL DEFAULT 0.8,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VillageStorageLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "woodDelta" INTEGER NOT NULL DEFAULT 0,
    "stoneDelta" INTEGER NOT NULL DEFAULT 0,
    "ironDelta" INTEGER NOT NULL DEFAULT 0,
    "goldDelta" INTEGER NOT NULL DEFAULT 0,
    "foodDelta" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VillageStorageLedger_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VillageResourceField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isUpgrading" BOOLEAN NOT NULL DEFAULT false,
    "upgradeCompletesAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VillageResourceField_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceFieldLevel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "resourceType" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "outputPerHour" REAL NOT NULL,
    "woodCost" INTEGER NOT NULL,
    "clayCost" INTEGER NOT NULL,
    "ironCost" INTEGER NOT NULL,
    "cropCost" INTEGER NOT NULL,
    "buildTimeSeconds" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VillageResourceLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "productionPerHour" REAL NOT NULL DEFAULT 0,
    "storageCapacity" INTEGER NOT NULL DEFAULT 2000,
    "netProductionPerHour" REAL NOT NULL DEFAULT 0,
    "lastTickAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VillageResourceLedger_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceProductionModifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'SINGLE_RESOURCE',
    "resourceType" TEXT,
    "percent" REAL NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceProductionModifier_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MerchantState" (
    "villageId" TEXT NOT NULL PRIMARY KEY,
    "merchantsBusy" INTEGER NOT NULL DEFAULT 0,
    "merchantsReserved" INTEGER NOT NULL DEFAULT 0,
    "lastReservationAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MerchantState_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceVillageId" TEXT NOT NULL,
    "targetVillageId" TEXT NOT NULL,
    "wood" INTEGER NOT NULL DEFAULT 0,
    "stone" INTEGER NOT NULL DEFAULT 0,
    "iron" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "food" INTEGER NOT NULL DEFAULT 0,
    "merchantsUsed" INTEGER NOT NULL,
    "departAt" DATETIME NOT NULL,
    "arriveAt" DATETIME NOT NULL,
    "returnAt" DATETIME NOT NULL,
    "deliveredAt" DATETIME,
    "returnedAt" DATETIME,
    "createdBy" TEXT NOT NULL DEFAULT 'PLAYER',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "reportId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_sourceVillageId_fkey" FOREIGN KEY ("sourceVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shipment_targetVillageId_fkey" FOREIGN KEY ("targetVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceVillageId" TEXT NOT NULL,
    "targetVillageId" TEXT NOT NULL,
    "wood" INTEGER NOT NULL DEFAULT 0,
    "stone" INTEGER NOT NULL DEFAULT 0,
    "iron" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "food" INTEGER NOT NULL DEFAULT 0,
    "scheduleJson" JSONB NOT NULL,
    "skipIfInsufficient" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nextRunAt" DATETIME,
    "lastRunAt" DATETIME,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TradeRoute_sourceVillageId_fkey" FOREIGN KEY ("sourceVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeRoute_targetVillageId_fkey" FOREIGN KEY ("targetVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeRouteLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeRouteId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "details" JSONB,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeRouteLog_tradeRouteId_fkey" FOREIGN KEY ("tradeRouteId") REFERENCES "TradeRoute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VillageDistanceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageAId" TEXT NOT NULL,
    "villageBId" TEXT NOT NULL,
    "distance" REAL NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VillageDistanceCache_villageAId_fkey" FOREIGN KEY ("villageAId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VillageDistanceCache_villageBId_fkey" FOREIGN KEY ("villageBId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE TABLE "new_Hero" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Hero',
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "attack" INTEGER NOT NULL DEFAULT 10,
    "defense" INTEGER NOT NULL DEFAULT 5,
    "speed" INTEGER NOT NULL DEFAULT 5,
    "woodBonusPercent" REAL NOT NULL DEFAULT 0,
    "clayBonusPercent" REAL NOT NULL DEFAULT 0,
    "ironBonusPercent" REAL NOT NULL DEFAULT 0,
    "cropBonusPercent" REAL NOT NULL DEFAULT 0,
    "allResourceBonus" REAL NOT NULL DEFAULT 0,
    "adventuresCompleted" INTEGER NOT NULL DEFAULT 0,
    "lastAdventureAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hero_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Hero" ("adventuresCompleted", "attack", "createdAt", "defense", "experience", "health", "id", "lastAdventureAt", "level", "name", "playerId", "speed", "updatedAt") SELECT "adventuresCompleted", "attack", "createdAt", "defense", "experience", "health", "id", "lastAdventureAt", "level", "name", "playerId", "speed", "updatedAt" FROM "Hero";
DROP TABLE "Hero";
ALTER TABLE "new_Hero" RENAME TO "Hero";
CREATE INDEX "Hero_playerId_idx" ON "Hero"("playerId");
CREATE INDEX "Hero_level_idx" ON "Hero"("level");
CREATE UNIQUE INDEX "Hero_playerId_key" ON "Hero"("playerId");
CREATE TABLE "new_TroopBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "troopType" TEXT NOT NULL,
    "costWood" INTEGER NOT NULL DEFAULT 0,
    "costStone" INTEGER NOT NULL DEFAULT 0,
    "costIron" INTEGER NOT NULL DEFAULT 0,
    "costGold" INTEGER NOT NULL DEFAULT 0,
    "costFood" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "attack" INTEGER NOT NULL DEFAULT 10,
    "defense" INTEGER NOT NULL DEFAULT 5,
    "speed" INTEGER NOT NULL DEFAULT 5,
    "cropUpkeep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TroopBalance" ("attack", "costFood", "costGold", "costIron", "costStone", "costWood", "createdAt", "defense", "health", "id", "speed", "troopType", "updatedAt") SELECT "attack", "costFood", "costGold", "costIron", "costStone", "costWood", "createdAt", "defense", "health", "id", "speed", "troopType", "updatedAt" FROM "TroopBalance";
DROP TABLE "TroopBalance";
ALTER TABLE "new_TroopBalance" RENAME TO "TroopBalance";
CREATE UNIQUE INDEX "TroopBalance_troopType_key" ON "TroopBalance"("troopType");
CREATE INDEX "TroopBalance_troopType_idx" ON "TroopBalance"("troopType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StorageCapacityCurve_buildingType_level_idx" ON "StorageCapacityCurve"("buildingType", "level");

-- CreateIndex
CREATE UNIQUE INDEX "StorageCapacityCurve_buildingType_level_key" ON "StorageCapacityCurve"("buildingType", "level");

-- CreateIndex
CREATE INDEX "VillageStorageLedger_villageId_createdAt_idx" ON "VillageStorageLedger"("villageId", "createdAt");

-- CreateIndex
CREATE INDEX "VillageResourceField_villageId_resourceType_idx" ON "VillageResourceField"("villageId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "VillageResourceField_villageId_resourceType_slot_key" ON "VillageResourceField"("villageId", "resourceType", "slot");

-- CreateIndex
CREATE INDEX "ResourceFieldLevel_resourceType_level_idx" ON "ResourceFieldLevel"("resourceType", "level");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceFieldLevel_resourceType_level_key" ON "ResourceFieldLevel"("resourceType", "level");

-- CreateIndex
CREATE INDEX "VillageResourceLedger_resourceType_idx" ON "VillageResourceLedger"("resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "VillageResourceLedger_villageId_resourceType_key" ON "VillageResourceLedger"("villageId", "resourceType");

-- CreateIndex
CREATE INDEX "ResourceProductionModifier_villageId_idx" ON "ResourceProductionModifier"("villageId");

-- CreateIndex
CREATE INDEX "ResourceProductionModifier_resourceType_idx" ON "ResourceProductionModifier"("resourceType");

-- CreateIndex
CREATE INDEX "ResourceProductionModifier_expiresAt_idx" ON "ResourceProductionModifier"("expiresAt");

-- CreateIndex
CREATE INDEX "MerchantState_updatedAt_idx" ON "MerchantState"("updatedAt");

-- CreateIndex
CREATE INDEX "Shipment_sourceVillageId_idx" ON "Shipment"("sourceVillageId");

-- CreateIndex
CREATE INDEX "Shipment_targetVillageId_idx" ON "Shipment"("targetVillageId");

-- CreateIndex
CREATE INDEX "Shipment_status_arriveAt_idx" ON "Shipment"("status", "arriveAt");

-- CreateIndex
CREATE INDEX "Shipment_status_returnAt_idx" ON "Shipment"("status", "returnAt");

-- CreateIndex
CREATE INDEX "TradeRoute_sourceVillageId_idx" ON "TradeRoute"("sourceVillageId");

-- CreateIndex
CREATE INDEX "TradeRoute_targetVillageId_idx" ON "TradeRoute"("targetVillageId");

-- CreateIndex
CREATE INDEX "TradeRoute_status_nextRunAt_idx" ON "TradeRoute"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "TradeRouteLog_tradeRouteId_executedAt_idx" ON "TradeRouteLog"("tradeRouteId", "executedAt");

-- CreateIndex
CREATE INDEX "VillageDistanceCache_villageBId_villageAId_idx" ON "VillageDistanceCache"("villageBId", "villageAId");

-- CreateIndex
CREATE UNIQUE INDEX "VillageDistanceCache_villageAId_villageBId_key" ON "VillageDistanceCache"("villageAId", "villageBId");
