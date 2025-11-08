/*
  Warnings:

  - You are about to drop the column `demolitionAt` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionCost` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionMode` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `isDemolishing` on the `Building` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "centerX" INTEGER NOT NULL,
    "centerY" INTEGER NOT NULL,
    "radius" INTEGER NOT NULL,
    "victoryPoints" INTEGER NOT NULL DEFAULT 0,
    "controllingPlayerId" TEXT,
    "regionType" TEXT NOT NULL DEFAULT 'NORMAL',
    "population" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Region_controllingPlayerId_fkey" FOREIGN KEY ("controllingPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reinforcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromVillageId" TEXT NOT NULL,
    "toVillageId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "arrivalAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reinforcement_fromVillageId_fkey" FOREIGN KEY ("fromVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reinforcement_toVillageId_fkey" FOREIGN KEY ("toVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reinforcement_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReinforcementUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reinforcementId" TEXT NOT NULL,
    "troopId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "ReinforcementUnit_reinforcementId_fkey" FOREIGN KEY ("reinforcementId") REFERENCES "Reinforcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReinforcementUnit_troopId_fkey" FOREIGN KEY ("troopId") REFERENCES "Troop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "loyalty" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastTickAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Village_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Village_continentId_fkey" FOREIGN KEY ("continentId") REFERENCES "Continent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Village_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Village" ("continentId", "createdAt", "food", "foodProduction", "gold", "goldProduction", "id", "iron", "ironProduction", "isCapital", "lastTickAt", "loyalty", "name", "playerId", "population", "stone", "stoneProduction", "updatedAt", "wood", "woodProduction", "x", "y") SELECT "continentId", "createdAt", "food", "foodProduction", "gold", "goldProduction", "id", "iron", "ironProduction", "isCapital", "lastTickAt", "loyalty", "name", "playerId", "population", "stone", "stoneProduction", "updatedAt", "wood", "woodProduction", "x", "y" FROM "Village";
DROP TABLE "Village";
ALTER TABLE "new_Village" RENAME TO "Village";
CREATE INDEX "Village_playerId_idx" ON "Village"("playerId");
CREATE INDEX "Village_continentId_idx" ON "Village"("continentId");
CREATE INDEX "Village_regionId_idx" ON "Village"("regionId");
CREATE INDEX "Village_isCapital_idx" ON "Village"("isCapital");
CREATE INDEX "Village_lastTickAt_idx" ON "Village"("lastTickAt");
CREATE INDEX "Village_playerId_isCapital_idx" ON "Village"("playerId", "isCapital");
CREATE INDEX "Village_continentId_playerId_idx" ON "Village"("continentId", "playerId");
CREATE UNIQUE INDEX "Village_x_y_key" ON "Village"("x", "y");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Region_regionCode_key" ON "Region"("regionCode");

-- CreateIndex
CREATE INDEX "Region_regionCode_idx" ON "Region"("regionCode");

-- CreateIndex
CREATE INDEX "Region_controllingPlayerId_idx" ON "Region"("controllingPlayerId");

-- CreateIndex
CREATE INDEX "Region_regionType_idx" ON "Region"("regionType");

-- CreateIndex
CREATE UNIQUE INDEX "Reinforcement_movementId_key" ON "Reinforcement"("movementId");

-- CreateIndex
CREATE INDEX "Reinforcement_fromVillageId_idx" ON "Reinforcement"("fromVillageId");

-- CreateIndex
CREATE INDEX "Reinforcement_toVillageId_idx" ON "Reinforcement"("toVillageId");

-- CreateIndex
CREATE INDEX "Reinforcement_arrivalAt_idx" ON "Reinforcement"("arrivalAt");

-- CreateIndex
CREATE INDEX "Reinforcement_status_arrivalAt_idx" ON "Reinforcement"("status", "arrivalAt");

-- CreateIndex
CREATE INDEX "Reinforcement_movementId_idx" ON "Reinforcement"("movementId");

-- CreateIndex
CREATE INDEX "ReinforcementUnit_reinforcementId_idx" ON "ReinforcementUnit"("reinforcementId");

-- CreateIndex
CREATE INDEX "ReinforcementUnit_troopId_idx" ON "ReinforcementUnit"("troopId");
