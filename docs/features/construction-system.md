# Construction & Culture Point System

The Travian-style construction pipeline now mirrors the full specification shared by design:

- **Data model**
  - `BuildingBlueprint`/`BuildingLevel` describe upgrade curves, culture output, and effects. The starter dataset lives in `lib/config/construction.ts` and is hydrated via Prisma models for admin tooling.
  - `BuildQueueTask` records every upgrade (from `fromLevel` → `toLevel`) with status (`WAITING` / `BUILDING` / `PAUSED` / `DONE` / `CANCELLED`) plus modifier snapshots, slot category (inner vs. field), and queue ordering.
  - `VillageQueueLimit` stores per-village overrides for queue presets (max waiting tasks, parallel field slots, parallel inner slots). By default we use the `free` preset (single shared slot + one waiting item).
  - `AccountCulturePoint` replaces the ad-hoc `Player.culturePoints` field. It tracks the lazy-accrued CP total, current per-hour rate, and the number of villages allowed/used.

- **Queue lifecycle**
  - Players pay costs up front when queuing; refunds honour Travian rules (full refund for level 1, delta for higher levels, partial for mid-build cancels).
  - `BuildingService.upgradeBuilding` validates queue limits, computes modifier-aware build times (server speed + main building multiplier), and enqueues a `BuildQueueTask`. Tasks auto-start when concurrency slots free up.
  - `BuildQueueTask` is the source of truth for progress bars, start/finish timestamps, and queue ordering. Buildings keep a light-weight flag (`isBuilding`, `queuePosition`) for backwards compatibility, but UI pulls from task data now.
  - `BuildingService.completeBuilding` advances the task, bumps the building level, refreshes production, and triggers `CulturePointService.recalculateVillageContribution`. `startNextTasks` automatically launches the next waiting task per category.

- **Culture points**
  - Every building/resource field level contributes CP/hour as defined in `lib/config/construction.ts`. `CulturePointService.recalculateVillageContribution` recomputes the per-village rate whenever a building finishes (including initial village setup).
  - CP accrues lazily inside `AccountCulturePoint`: each refresh adds `perHour * Δt` before recomputing the new hourly rate and unlock count.
  - Expansion checks (`VillageService.createVillage`) now consult the account pool instead of the legacy `Player.culturePoints` field. Slots never decrease; once a threshold is unlocked it is permanent.

- **Surface changes**
  - `/api/villages` and `/api/villages/central-overview` include `buildQueueTasks` so dashboards, detail pages, and the instant-complete tooling can render the new queue data.
  - Front-end `BuildingQueue` renders queue entries directly from `BuildQueueTask` (status, order, countdown) and counts research items separately for instant-complete cost calculations.
  - `docs/features/instant-completion.md` references this doc for queue semantics.

The old `player.culturePoints` column is left for backwards compatibility but no longer drives gameplay. Future work: expose queue presets in admin UI, seed blueprint/level tables from `lib/config/construction.ts`, and hook resource-field upgrades into `CulturePointService` once that flow lands.
