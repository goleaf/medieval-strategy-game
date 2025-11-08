/*
  Warnings:

  - You are about to drop the column `demolitionAt` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionCost` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `demolitionMode` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `isDemolishing` on the `Building` table. All the data in the column will be lost.

*/
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
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "villageId" TEXT,
    "allianceRole" TEXT,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "createdAt", "id", "isRead", "senderId", "subject", "type", "villageId") SELECT "content", "createdAt", "id", "isRead", "senderId", "subject", "type", "villageId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_villageId_idx" ON "Message"("villageId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_isRead_idx" ON "Message"("isRead");
CREATE INDEX "Message_isRead_createdAt_idx" ON "Message"("isRead", "createdAt");
CREATE INDEX "Message_type_isRead_idx" ON "Message"("type", "isRead");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
