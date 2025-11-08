PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AttackPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "villageId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "requiresGoldClub" BOOLEAN NOT NULL DEFAULT false,
    "mission" TEXT NOT NULL DEFAULT 'ATTACK',
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

INSERT INTO "new_AttackPreset" (
    "id", "playerId", "villageId", "name", "type", "requiresGoldClub", "mission", "targetVillageId", "targetX", "targetY", "preferredArrival", "waveWindowMs", "catapultTargets", "createdAt", "updatedAt"
) SELECT
    "id", "playerId", "villageId", "name", "type", "requiresGoldClub", 'ATTACK', "targetVillageId", "targetX", "targetY", "preferredArrival", "waveWindowMs", "catapultTargets", "createdAt", "updatedAt"
FROM "AttackPreset";

DROP TABLE "AttackPreset";
ALTER TABLE "new_AttackPreset" RENAME TO "AttackPreset";

CREATE INDEX "AttackPreset_playerId_idx" ON "AttackPreset"("playerId");
CREATE INDEX "AttackPreset_villageId_idx" ON "AttackPreset"("villageId");
CREATE INDEX "AttackPreset_targetVillageId_idx" ON "AttackPreset"("targetVillageId");
CREATE INDEX "AttackPreset_type_idx" ON "AttackPreset"("type");
CREATE INDEX "AttackPreset_mission_idx" ON "AttackPreset"("mission");

PRAGMA foreign_keys=ON;
