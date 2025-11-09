# Game Tick & Event Queue

This project runs a real‑time tick loop and a prioritized event queue to process all time‑based game systems.

## Real‑Time Tick

- Interval: 1s (real time)
- Entrypoint: `startScheduler()` in `lib/jobs/scheduler.ts` (started from `app/layout.tsx` on the server).
- On each tick, due events are pulled from the queue and processed in priority order.
- Two recurring events are always scheduled:
  - `RESOURCE_TICK` every second
  - `LOYALTY_TICK` every second

## Event Types

- `TROOP_MOVEMENT` (priority 100) — Handles arrivals; attacks resolve before other same‑second events.
- `BUILDING_COMPLETION` (priority 50) — Finishes active construction/demolition.
- `RESOURCE_TICK` (priority -10) — Batches per‑second updates (resource accrual, training sweep, logistics, etc.).
- `LOYALTY_TICK` (priority -10) — Loyalty regeneration.
- `NOTIFICATION` — Generic messages/notifications (low volume).

Ordering: within the same second, higher priority executes first. This ensures, for example, incoming attacks resolve before defender training completes.

## Speed Scaling

- Building and troop training times are divided by `GameWorld.speed`.
- Travel time is divided by `unitSpeed` from `WorldSettings`; by default this is equal to `GameWorld.speed` (see `lib/game-services/world-settings-service.ts`).
- Resource production accrual multiplies by world speed where applicable.

## Event Scheduling

- Buildings: `BuildingService` enqueues `BUILDING_COMPLETION` when a task starts; canceling removes the deduped event.
- Demolitions: scheduled as `BUILDING_COMPLETION` with a demolition flag.
- Movements: `MovementService` enqueues `TROOP_MOVEMENT` for each movement.
- Training: handled by `UnitSystemService`/`TroopService` sweep during `RESOURCE_TICK` (every 2s). Jobs are cancelable within 10% progress.
- Merchants/markets/trade routes: processed during the logistics sweep inside `RESOURCE_TICK`.

## Countdown Formatting

- UI component: `components/game/countdown-timer.tsx`
- Displays `Xd Yh Zm Ws remaining` with 1s updates.

## Relevant Files

- Scheduler: `lib/jobs/scheduler.ts`
- Tick loop + handlers: `lib/jobs/game-tick.ts`
- Event queue service: `lib/game-services/event-queue-service.ts`
- Building: `lib/game-services/building-service.ts`
- Movement: `lib/game-services/movement-service.ts`
- Training: `lib/game-services/unit-system-service.ts`, `lib/game-services/troop-service.ts`
- World settings/speeds: `lib/game-services/world-settings-service.ts`

## Notes

- The queue is SQL‑backed (`events_queue`) and resilient to crashes via stale lock release and deduped recurring events.
- Batch sizes and sweep intervals are tunable constants near the top of `lib/jobs/game-tick.ts`.
