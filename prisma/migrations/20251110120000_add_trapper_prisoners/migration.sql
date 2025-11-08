-- Track trapped attacker units per defender village
CREATE TABLE "TrapperPrisoner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defenderVillageId" TEXT NOT NULL,
    "attackerVillageId" TEXT NOT NULL,
    "attackerAccountId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceMovementId" TEXT,
    "metadata" TEXT,
    CONSTRAINT "TrapperPrisoner_defenderVillageId_fkey" FOREIGN KEY ("defenderVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrapperPrisoner_attackerVillageId_fkey" FOREIGN KEY ("attackerVillageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrapperPrisoner_attackerAccountId_fkey" FOREIGN KEY ("attackerAccountId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TrapperPrisoner_defenderVillageId_idx"
    ON "TrapperPrisoner" ("defenderVillageId");

CREATE INDEX "TrapperPrisoner_defenderVillageId_capturedAt_idx"
    ON "TrapperPrisoner" ("defenderVillageId", "capturedAt");

CREATE INDEX "TrapperPrisoner_attackerAccountId_idx"
    ON "TrapperPrisoner" ("attackerAccountId");
