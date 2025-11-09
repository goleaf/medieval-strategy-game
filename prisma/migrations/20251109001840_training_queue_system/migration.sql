-- Training queue metadata expansion
ALTER TABLE "TrainingQueueItem" ADD COLUMN "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "unitDurationSeconds" REAL NOT NULL DEFAULT 0;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "totalDurationSeconds" REAL NOT NULL DEFAULT 0;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "buildingLevel" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "costWood" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "costClay" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "costIron" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "costCrop" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "populationCost" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "worldSpeedApplied" REAL NOT NULL DEFAULT 1;
ALTER TABLE "TrainingQueueItem" ADD COLUMN "cancelledAt" DATETIME;

CREATE INDEX IF NOT EXISTS "TrainingQueueItem_villageId_building_status_idx"
  ON "TrainingQueueItem"("villageId", "building", "status");
