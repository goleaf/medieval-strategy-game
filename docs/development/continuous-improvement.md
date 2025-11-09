# Continuous Improvement Plan

A practical loop to ensure fixes don’t break existing features and that we improve the game based on live data and player feedback.

## 1) Don’t Break Existing Features
- Gate changes with tests:
  - Unit: `npm run test:unit` (Vitest)
  - Smoke: `npm run build && npm run test:smoke` (requires dev server)
  - Full quick pass: `npm run test:all`
- Add a unit test when fixing a bug; reproduce first, then assert the fix.
- Prefer narrow, surgical changes in `lib/` and keep App Router handlers thin.

## 2) Performance Monitoring
- Backend instrumentation
  - Use `withMetrics(label, handler)` from `lib/utils/metrics` to wrap API route handlers.
  - Tracks per-route durations and error rates in-memory (last 500 samples).
  - Example:
    ```ts
    export const GET = withMetrics("GET /api/stats/world", async (req) => { /* ... */ })
    ```
  - Response headers:
    - `X-Trace-Id` for correlation, `X-Response-Time` with total ms, and `Server-Timing: total;dur=<ms>` for DevTools.
- Metrics endpoints
  - Admin performance snapshot: `GET /api/admin/perf`
  - Admin operational stats: `GET /api/admin/stats`
- Load testing
  - Quick checks: `k6 run scripts/load/basic-k6.js`
  - Increase VUs/duration via `K6_VUS` and `K6_DURATION`.
- Actionable thresholds
  - Investigate if `p95` for a route exceeds 300ms for 5+ minutes or error rate > 1%.

## 3) Player Feedback Collection & Triage
- Player submission endpoint: `POST /api/feedback`
  - Body: `{ category, severity: 'low'|'medium'|'high', summary, details?, contact? }`
  - Auth is optional; attaches `playerId` if logged in.
- Admin review endpoint: `GET /api/admin/feedback`
  - Returns the last 500 feedback entries (in-memory).
- Status updates: `PATCH /api/admin/feedback` with `{ id, status: 'open'|'triaged'|'resolved' }`.
- Prioritization rubric
  - High severity issues affecting core loops (build/train/attack) trump feature requests.
  - Use frequency × severity to sort; link top items to tickets.

## 4) Iteration Based on Data & Feedback
- Weekly cycle
  - Review `/api/admin/perf` for top slow/error-prone routes.
  - Sample player feedback; close out resolved items and communicate changes.
  - Tune configs (`config/*`) and combat when balance harness flags regression.
- Balance regression checks
  - Run `npx tsx scripts/balance/simulate-combat.ts` before merging combat changes.
  - Include summary JSON in PR description to document impact.

## 5) Future Enhancements
- Persist metrics & feedback in the database (Prisma models + migrations).
- Export metrics to an APM (OpenTelemetry) and visualize in dashboards.
- Add an admin UI tab for feedback triage and per-route latency charts.

### Optional persistence (no migrations required)
- Set `METRICS_PERSIST=true` to append API samples to a lightweight `ApiMetricSample` table (auto-created with `CREATE TABLE IF NOT EXISTS`).
- Set `FEEDBACK_PERSIST=true` to mirror feedback submissions to a `FeedbackEntry` table.
- Both features are best-effort and silently skip writes if the table is missing or the DB denies writes.

*** Keep this doc updated as the tooling evolves. ***
