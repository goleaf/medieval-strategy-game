# Rally Point Mission Pipeline

This document describes the standalone Rally Point engine that powers attack, raid, reinforce, siege, wave groups, cancellations, and recalls. The implementation lives in `lib/rally-point/` and is entirely data-driven via `config/rally-point.json` so balance changes do not require code edits.

## Data Pack

The JSON pack defines:

- `missions.*` – unit role gates, lethality factors, and siege toggles per mission type.
- `rallyPoint.catapultTargeting` – random/one/two-target unlock windows plus per-level wave precision caps.
- `rallyPoint.cancelGraceMs` – pre-departure cancel window in milliseconds.
- `travel.serverSpeed` – global modifier for travel time math.
- `siege.*` – lethality, ram/catapult tech multipliers, and diminishing-return curves.
- `walls.*` – defense and ram-resistance multipliers per wall archetype.

`lib/config/rally-point.ts` exposes typed helpers (mission config lookup, precision resolver, wall metadata, etc.) for the rest of the engine.

## Engine Responsibilities

`RallyPointEngine` orchestrates the full mission lifecycle:

1. **Send pipeline** (`sendMission` / `sendWaveGroup`)
   - Validates targets (self-hit guard, beginner protection), unit availability, role gates, siege requirements, and precision caps.
   - Computes travel time using Euclidean distance and the slowest unit speed multiplied by the server speed modifier.
   - Applies Rally Point–level catapult targeting, shaves multi-member wave offsets into the configured jitter window, and enforces idempotency per UUID.
   - Deducts garrison stacks atomically per owner, records `movements`, `rp_wave_groups`, and `rp_wave_members`, and attaches metadata for later cancellation/recall hooks.

2. **Cancellations & recalls**
   - `cancelMovement` refunds a movement if the caller still owns it, the status is `en_route`, and the cancel grace window has not elapsed.
   - `recallReinforcements` moves stationed stacks back to their home village with symmetric travel math and idempotent movement creation.

3. **Resolver** (`resolveDueMovements`)
   - Fetches due movements ordered by `(arrive_at, mission priority, id)`, ensuring reinforcements land before attacks on the same tick.
   - Applies reinforcement arrivals directly to the `garrisons` table (owner isolated), then resolves combat/raid/siege missions via a pluggable `CombatResolver` (default: `SimpleCombatResolver`).
   - Books wall/building drops, creates return legs for surviving attackers, persists battle reports, and transitions movements through `en_route → resolved/returning → done` states.

4. **Siege math**
   - Rams use the logarithmic curve + wall resistance multipliers from the data pack.
   - Catapult shots now pull a defender siege snapshot (buildings + resource fields), re-validate RP selections, fall back to deterministic random targets, clamp against capital floors/critical structures, enforce WW drop caps, and emit per-target before→after metadata (including wasted shots, modifiers, and structure ids) so the repository can persist level changes immediately.

## Repository Adapter

`RallyPointEngine` relies on the `RallyPointRepository` interface for storage, allowing us to plug into Prisma later. Tests use the `InMemoryRallyPointRepository` (`lib/rally-point/testing/…`) to simulate row locks, garrison snapshots, and movement ordering without needing a database.

Key transactional methods:

- `getOwnerGarrison`, `setOwnerGarrisonUnit`, `getAllGarrisons`
- `createMovement`, `updateMovement`, `findMovementsByIdempotency`
- `createWaveGroup`, `listWaveMembersByGroup`
- `saveBattleReport`

## Tests

`lib/__tests__/rally-point-engine.test.ts` covers the required matrix:

- Siege validation, catapult targeting gates, beginner protection
- Slowest-unit travel math
- Wave landing precision
- Reinforcements vs. attacks ordering at the same timestamp
- Cancel window refunds
- Reinforcement recall flows

Run them via `npx vitest run lib/__tests__/rally-point-engine.test.ts`.

## Server Integration

- **Prisma repository** — `lib/rally-point/prisma-repository.ts` implements the storage adapter over the new Prisma models (`RallyPoint`, `RallyPointWaveGroup`, `RallyPointMovement`, `GarrisonStack`, etc.) while keeping the in-memory adapter for tests.
- **Unit catalog** — `lib/rally-point/unit-catalog.ts` derives `UnitStats` from `config/unit-system.json`, ensuring the combat resolver shares the same balance knobs as the troop system.
- **Engine bootstrap** — `lib/rally-point/server.ts` exposes a singleton `getRallyPointEngine()` that wires the Prisma repository + catalog together for jobs and API routes.
- **Game tick hook** — `lib/jobs/game-tick.ts` calls `engine.resolveDueMovements()` every tick so arrivals, combat, and returns are processed deterministically alongside existing logistics.

## API Surface

All handlers live under `/api/rally-point/*` and accept/return JSON in UTC:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/rally-point/missions` | `POST` | Send a single mission (attack/raid/reinforce/siege) with idempotency + optional `arriveAt` |
| `/api/rally-point/waves` | `POST` | Schedule a wave group that lands at a common timestamp with ms jitter |
| `/api/rally-point/movements` | `GET` | List incoming/outgoing movements for a village, filtered by status/mission |
| `/api/rally-point/movements/:id/cancel` | `POST` | Cancel an outbound mission within the grace window |
| `/api/rally-point/reinforcements/recall` | `POST` | Recall stationed reinforcements back to their home village |

Each mutating endpoint requires a UUID `idempotencyKey` and the caller’s `ownerAccountId`. Responses include the raw movement payload plus any warnings emitted by the engine.
