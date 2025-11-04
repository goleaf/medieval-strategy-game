-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "estimatedEndTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Maintenance_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromAdminId" TEXT NOT NULL,
    "toPlayerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminMessage_fromAdminId_fkey" FOREIGN KEY ("fromAdminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdminMessage_toPlayerId_fkey" FOREIGN KEY ("toPlayerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Maintenance_isActive_idx" ON "Maintenance"("isActive");

-- CreateIndex
CREATE INDEX "Maintenance_createdAt_idx" ON "Maintenance"("createdAt");

-- CreateIndex
CREATE INDEX "AdminMessage_fromAdminId_idx" ON "AdminMessage"("fromAdminId");

-- CreateIndex
CREATE INDEX "AdminMessage_toPlayerId_idx" ON "AdminMessage"("toPlayerId");

-- CreateIndex
CREATE INDEX "AdminMessage_isRead_idx" ON "AdminMessage"("isRead");

-- CreateIndex
CREATE INDEX "AdminMessage_createdAt_idx" ON "AdminMessage"("createdAt");
