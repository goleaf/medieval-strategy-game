-- Map & Fog-of-War Vision foundations
CREATE TABLE "MapTile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameWorldId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "tileType" TEXT NOT NULL DEFAULT 'EMPTY',
    "tags" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapTile_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MapTile_gameWorldId_x_y_key" ON "MapTile"("gameWorldId", "x", "y");
CREATE INDEX "MapTile_gameWorldId_tileType_idx" ON "MapTile"("gameWorldId", "tileType");

CREATE TABLE "TileVisionState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tileId" TEXT NOT NULL,
    "viewerPlayerId" TEXT,
    "viewerAllianceId" TEXT,
    "state" TEXT NOT NULL,
    "lastSeenAt" DATETIME,
    "freshUntil" DATETIME,
    "memoryExpiresAt" DATETIME,
    "attributeFreshness" JSONB,
    "sharingScope" TEXT NOT NULL DEFAULT 'PERSONAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TileVisionState_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "MapTile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TileVisionState_viewerPlayerId_fkey" FOREIGN KEY ("viewerPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TileVisionState_viewerAllianceId_fkey" FOREIGN KEY ("viewerAllianceId") REFERENCES "Alliance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "TileVisionState_viewerPlayerId_tileId_idx" ON "TileVisionState"("viewerPlayerId", "tileId");
CREATE INDEX "TileVisionState_viewerAllianceId_tileId_idx" ON "TileVisionState"("viewerAllianceId", "tileId");
CREATE INDEX "TileVisionState_state_idx" ON "TileVisionState"("state");

CREATE TABLE "VisionSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameWorldId" TEXT NOT NULL,
    "ownerPlayerId" TEXT,
    "ownerAllianceId" TEXT,
    "sourceType" TEXT NOT NULL,
    "centerX" INTEGER NOT NULL,
    "centerY" INTEGER NOT NULL,
    "radius" INTEGER NOT NULL,
    "freshUntil" DATETIME,
    "sharingScope" TEXT NOT NULL DEFAULT 'PERSONAL',
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisionSource_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VisionSource_ownerPlayerId_fkey" FOREIGN KEY ("ownerPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VisionSource_ownerAllianceId_fkey" FOREIGN KEY ("ownerAllianceId") REFERENCES "Alliance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "VisionSource_gameWorldId_sourceType_idx" ON "VisionSource"("gameWorldId", "sourceType");
CREATE INDEX "VisionSource_ownerPlayerId_idx" ON "VisionSource"("ownerPlayerId");
CREATE INDEX "VisionSource_ownerAllianceId_idx" ON "VisionSource"("ownerAllianceId");
CREATE INDEX "VisionSource_freshUntil_idx" ON "VisionSource"("freshUntil");

CREATE TABLE "ReconMission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameWorldId" TEXT NOT NULL,
    "ownerPlayerId" TEXT,
    "ownerAllianceId" TEXT,
    "missionType" TEXT NOT NULL,
    "originX" INTEGER NOT NULL,
    "originY" INTEGER NOT NULL,
    "destinationX" INTEGER NOT NULL,
    "destinationY" INTEGER NOT NULL,
    "path" JSONB NOT NULL,
    "launchAt" DATETIME NOT NULL,
    "arrivalAt" DATETIME NOT NULL,
    "burstRadius" INTEGER NOT NULL,
    "trailTTLSeconds" INTEGER NOT NULL,
    "burstTTLSeconds" INTEGER NOT NULL,
    "sharingScope" TEXT NOT NULL DEFAULT 'PERSONAL',
    "cooldownEndsAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReconMission_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReconMission_ownerPlayerId_fkey" FOREIGN KEY ("ownerPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReconMission_ownerAllianceId_fkey" FOREIGN KEY ("ownerAllianceId") REFERENCES "Alliance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ReconMission_gameWorldId_missionType_idx" ON "ReconMission"("gameWorldId", "missionType");
CREATE INDEX "ReconMission_launchAt_idx" ON "ReconMission"("launchAt");
CREATE INDEX "ReconMission_arrivalAt_idx" ON "ReconMission"("arrivalAt");

CREATE TABLE "ContactLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameWorldId" TEXT NOT NULL,
    "viewerPlayerId" TEXT,
    "viewerAllianceId" TEXT,
    "detectedAt" DATETIME NOT NULL,
    "locationX" INTEGER NOT NULL,
    "locationY" INTEGER NOT NULL,
    "directionVector" JSONB NOT NULL,
    "speedBand" TEXT NOT NULL,
    "stackBand" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "sourceClass" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "signatureRoll" REAL NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactLogEntry_gameWorldId_fkey" FOREIGN KEY ("gameWorldId") REFERENCES "GameWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactLogEntry_viewerPlayerId_fkey" FOREIGN KEY ("viewerPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContactLogEntry_viewerAllianceId_fkey" FOREIGN KEY ("viewerAllianceId") REFERENCES "Alliance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ContactLogEntry_viewerPlayerId_idx" ON "ContactLogEntry"("viewerPlayerId");
CREATE INDEX "ContactLogEntry_viewerAllianceId_idx" ON "ContactLogEntry"("viewerAllianceId");
CREATE INDEX "ContactLogEntry_expiresAt_idx" ON "ContactLogEntry"("expiresAt");

CREATE TABLE "VisionTTLTracker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "decayAction" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "VisionTTLTracker_entityType_expiresAt_idx" ON "VisionTTLTracker"("entityType", "expiresAt");
