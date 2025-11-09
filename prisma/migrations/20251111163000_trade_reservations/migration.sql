-- Add creator tracking for player-defined trade routes.
ALTER TABLE "TradeRoute" ADD COLUMN "createdByPlayerId" TEXT REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New table to track resource reservations per village.
CREATE TABLE "ResourceReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "wood" INTEGER NOT NULL DEFAULT 0,
    "stone" INTEGER NOT NULL DEFAULT 0,
    "iron" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "food" INTEGER NOT NULL DEFAULT 0,
    "reservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "fulfilledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceReservation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceReservation_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TradeRoute_createdByPlayerId_idx" ON "TradeRoute"("createdByPlayerId");
CREATE INDEX "ResourceReservation_playerId_idx" ON "ResourceReservation"("playerId");
CREATE INDEX "ResourceReservation_villageId_idx" ON "ResourceReservation"("villageId");
CREATE INDEX "ResourceReservation_playerId_villageId_idx" ON "ResourceReservation"("playerId","villageId");
