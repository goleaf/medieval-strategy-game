-- Add Gold Club membership tracking to players
ALTER TABLE "Player" ADD COLUMN "hasGoldClubMembership" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Player" ADD COLUMN "goldClubExpiresAt" DATETIME;

-- Create attack preset tables
CREATE TABLE "AttackPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "villageId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "requiresGoldClub" BOOLEAN NOT NULL DEFAULT false,
    "targetVillageId" TEXT,
    "targetX" INTEGER,
    "targetY" INTEGER,
    "preferredArrival" DATETIME,
    "waveWindowMs" INTEGER,
    "catapultTargets" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttackPreset_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttackPreset_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AttackPreset_targetVillageId_fkey" FOREIGN KEY ("targetVillageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AttackPresetUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presetId" TEXT NOT NULL,
    "troopType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "AttackPresetUnit_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "AttackPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AttackPreset_playerId_idx" ON "AttackPreset"("playerId");
CREATE INDEX "AttackPreset_villageId_idx" ON "AttackPreset"("villageId");
CREATE INDEX "AttackPreset_targetVillageId_idx" ON "AttackPreset"("targetVillageId");
CREATE INDEX "AttackPreset_type_idx" ON "AttackPreset"("type");
CREATE INDEX "AttackPresetUnit_presetId_idx" ON "AttackPresetUnit"("presetId");
CREATE INDEX "AttackPresetUnit_troopType_idx" ON "AttackPresetUnit"("troopType");
