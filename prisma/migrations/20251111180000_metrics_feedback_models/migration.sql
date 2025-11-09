-- Create tables for metrics and feedback (SQLite)
CREATE TABLE IF NOT EXISTS "ApiMetricSample" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "route" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "status" INTEGER NOT NULL,
    "traceId" TEXT
);

CREATE INDEX IF NOT EXISTS "ApiMetricSample_createdAt_idx" ON "ApiMetricSample" ("createdAt");
CREATE INDEX IF NOT EXISTS "ApiMetricSample_route_createdAt_idx" ON "ApiMetricSample" ("route", "createdAt");

CREATE TABLE IF NOT EXISTS "FeedbackEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" TEXT,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "contact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open'
);
CREATE INDEX IF NOT EXISTS "FeedbackEntry_createdAt_idx" ON "FeedbackEntry" ("createdAt");
CREATE INDEX IF NOT EXISTS "FeedbackEntry_status_idx" ON "FeedbackEntry" ("status");

