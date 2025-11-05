/*
  Warnings:

  - You are about to drop the column `demolitionAt` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionCost` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionMode` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `isDemolishing` on the `Building` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "QuickLinkOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "requiresPremium" BOOLEAN NOT NULL DEFAULT false,
    "requiredBuildingType" TEXT,
    "requiredBuildingLevel" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerQuicklink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "quickLinkOptionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerQuicklink_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerQuicklink_quickLinkOptionId_fkey" FOREIGN KEY ("quickLinkOptionId") REFERENCES "QuickLinkOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VillageQuicklink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "quickLinkOptionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VillageQuicklink_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VillageQuicklink_quickLinkOptionId_fkey" FOREIGN KEY ("quickLinkOptionId") REFERENCES "QuickLinkOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "QuickLinkOption_type_key" ON "QuickLinkOption"("type");

-- CreateIndex
CREATE INDEX "QuickLinkOption_type_idx" ON "QuickLinkOption"("type");

-- CreateIndex
CREATE INDEX "QuickLinkOption_isActive_idx" ON "QuickLinkOption"("isActive");

-- CreateIndex
CREATE INDEX "QuickLinkOption_requiresPremium_idx" ON "QuickLinkOption"("requiresPremium");

-- CreateIndex
CREATE INDEX "QuickLinkOption_sortOrder_idx" ON "QuickLinkOption"("sortOrder");

-- CreateIndex
CREATE INDEX "PlayerQuicklink_playerId_idx" ON "PlayerQuicklink"("playerId");

-- CreateIndex
CREATE INDEX "PlayerQuicklink_quickLinkOptionId_idx" ON "PlayerQuicklink"("quickLinkOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerQuicklink_playerId_slotNumber_key" ON "PlayerQuicklink"("playerId", "slotNumber");

-- CreateIndex
CREATE INDEX "VillageQuicklink_villageId_idx" ON "VillageQuicklink"("villageId");

-- CreateIndex
CREATE INDEX "VillageQuicklink_quickLinkOptionId_idx" ON "VillageQuicklink"("quickLinkOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "VillageQuicklink_villageId_slotNumber_key" ON "VillageQuicklink"("villageId", "slotNumber");
