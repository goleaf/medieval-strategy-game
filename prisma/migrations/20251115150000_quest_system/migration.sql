-- Create new quest definition table
CREATE TABLE "QuestDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "pane" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL DEFAULT 1,
    "rewardWood" INTEGER NOT NULL DEFAULT 0,
    "rewardStone" INTEGER NOT NULL DEFAULT 0,
    "rewardIron" INTEGER NOT NULL DEFAULT 0,
    "rewardGold" INTEGER NOT NULL DEFAULT 0,
    "rewardFood" INTEGER NOT NULL DEFAULT 0,
    "rewardHeroExperience" INTEGER NOT NULL DEFAULT 0,
    "isRepeatable" INTEGER NOT NULL DEFAULT 0,
    "isEventQuest" INTEGER NOT NULL DEFAULT 0,
    "eventKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "QuestDefinition_key_key" ON "QuestDefinition"("key");
CREATE INDEX "QuestDefinition_pane_sortOrder_idx" ON "QuestDefinition"("pane", "sortOrder");
CREATE INDEX "QuestDefinition_isEventQuest_eventKey_idx" ON "QuestDefinition"("isEventQuest", "eventKey");

-- Create quest progress table
CREATE TABLE "QuestProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "targetValue" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "QuestDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "QuestProgress_questId_playerId_key" ON "QuestProgress"("questId", "playerId");
CREATE INDEX "QuestProgress_playerId_completedAt_idx" ON "QuestProgress"("playerId", "completedAt");

-- Create quest reward table
CREATE TABLE "QuestReward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "questId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'QUEST',
    "sourceReference" TEXT,
    "wood" INTEGER NOT NULL DEFAULT 0,
    "stone" INTEGER NOT NULL DEFAULT 0,
    "iron" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "food" INTEGER NOT NULL DEFAULT 0,
    "heroExperience" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" DATETIME,
    CONSTRAINT "QuestReward_questId_fkey" FOREIGN KEY ("questId") REFERENCES "QuestDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuestReward_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "QuestReward_playerId_claimedAt_idx" ON "QuestReward"("playerId", "claimedAt");
CREATE INDEX "QuestReward_source_playerId_idx" ON "QuestReward"("source", "playerId");
CREATE INDEX "QuestReward_questId_playerId_idx" ON "QuestReward"("questId", "playerId");
CREATE UNIQUE INDEX "QuestReward_questId_playerId_source_key" ON "QuestReward"("questId", "playerId", "source");
CREATE UNIQUE INDEX "QuestReward_sourceReference_playerId_source_idx" ON "QuestReward"("sourceReference", "playerId", "source") WHERE "sourceReference" IS NOT NULL;

-- Add quest refund percentage to world config
ALTER TABLE "WorldConfig" ADD COLUMN "questRefundPercentage" REAL NOT NULL DEFAULT 0.1;
