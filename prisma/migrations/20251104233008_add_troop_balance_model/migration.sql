-- CreateTable
CREATE TABLE "TroopBalance" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TroopBalance_troopType_key" ON "TroopBalance"("troopType");

-- CreateIndex
CREATE INDEX "TroopBalance_troopType_idx" ON "TroopBalance"("troopType");
