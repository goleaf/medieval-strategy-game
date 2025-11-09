# Testing Strategy

This document operationalizes testing for the Medieval Strategy Game across unit, integration, load, security, UI, balance, and UAT layers. It maps to our repository structure and existing seeds.

## Overview
- Unit tests: Vitest for functions in `lib/` (combat, movement, economy, helpers).
- Integration & smoke: Node scripts (`test-*.js`) hitting live APIs once the dev server runs.
- Load testing: k6 scenarios simulating concurrent players.
- Security: dependency audit, Prisma schema validation, and active scanning guidance.
- UI testing: Cypress for critical flows (landing → login → dashboard → map).
- Balance testing: Monte Carlo combat harness for regression and tuning.
- UAT: structured beta cycles with checklists and exit criteria.

## Prerequisites
- Copy `.env.example` → `.env.local` and set `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_SECRET`.
- Seed deterministic data: `npm run db:setup` (or `npm run prisma:seed` if schema is already migrated).
- Run the dev server: `npm run dev` (default origin `http://localhost:3000`).

## Unit Tests (Vitest)
- Location: `tests/*.test.ts` and focused suites under `lib/**/__tests__`.
- Commands:
  - Run all: `npm run test:unit`
  - Single file: `npx vitest run tests/movement-utils.test.ts`
- Scope examples:
  - Combat maths: morale, siege, resolver curves.
  - Movement: distance, slowest stack speed, travel windows.
  - Economy: resource production helpers, merchant capacity.

## Integration & Smoke Tests (Node)
- Location: repository root `test-*.js` (existing examples: `test-combat-system.js`, `test-admin*.js`, `test-village.js`).
- Conventions:
  - Require server running on `APP_ORIGIN` (default `http://localhost:3000`).
  - Obtain Bearer tokens via `/api/admin/auth/login`; do not hardcode credentials—read from env, or rely on seeded defaults via scripts.
- Commands:
  - Example (combat): `node test-combat-system.js`
  - Batch (add your own script): `node scripts/run-smoke-tests.js` (optional aggregator).

## Load Testing (k6)
- Script: `scripts/load/basic-k6.js` (parameterized by `APP_ORIGIN`).
- Example command:
  - Local quick check (50 VU / 30s): `k6 run scripts/load/basic-k6.js`
  - Heavier (500 VU / 2m): `K6_VUS=500 K6_DURATION=2m APP_ORIGIN=http://localhost:3000 k6 run scripts/load/basic-k6.js`
- Guidance:
  - Start with read-heavy endpoints (`/api/stats/world`, `/api/villages`), then expand with authenticated flows.
  - Monitor server logs and DB for slow queries; tune indexes per `docs/development/performance-architecture.md`.

## Security Testing
- Static:
  - Lint rules: `npm run lint`
  - Dependency audit: `npm run test:security:audit`
  - Schema checks: `npm run test:security:prisma`
- Dynamic (guidance):
  - OWASP ZAP Baseline (Docker required): `scripts/security/zap-baseline.sh` against `APP_ORIGIN`.
  - Never commit secrets or `prisma/dev.db`; surface new env keys in `.env.example` and `docs/development`.

## UI Testing (Cypress)
- Config and example spec live under `cypress/`.
- Commands:
  - Open runner: `npm run test:ui:open`
  - Headless run: `npm run test:ui`
- Notes:
  - Ensure the dev server is running and `CYPRESS_BASE_URL` matches your origin (defaults to `http://localhost:3000`).
  - Extend specs to cover login, map interactions, building queues, and report navigation.

## Balance Testing (Combat Harness)
- Script: `scripts/balance/simulate-combat.ts` (npx tsx).
- Command examples:
  - Default sweep: `npx tsx scripts/balance/simulate-combat.ts`
  - Custom runs: `BATTLES=5000 SEED=1 npx tsx scripts/balance/simulate-combat.ts`
- Output: summary JSON to stdout (win rates, average casualties, wall impact). Use this in PRs that change `lib/combat/*` or `config/*`.

## User Acceptance Testing (UAT)
- Cadence: weekly beta drops with seeded worlds and expiring test accounts.
- Checklist per cycle:
  - Core loops (build → train → attack → report → recover) validated by non-engineers.
  - Admin workflows (world config, speed templates, bans, bulk ops) exercised.
  - UI plays well across devices and themes; accessibility spot checks.
  - Logs show no unhandled exceptions; error budget respected.
- Exit criteria: all P1/P2 issues closed; performance within SLOs; no schema changes pending migrations.

## CI Suggestions
- Recommended steps (can be mirrored in GitHub Actions/GitLab):
  1. Install + lint
  2. DB migrate + seed (SQLite)
  3. Unit tests: `npm run test:unit`
  4. Build: `npm run build`
  5. Start app → smoke tests: `node test-combat-system.js`
  6. Optional nightly: k6 scenarios + ZAP baseline

