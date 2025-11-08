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
   - Catapult shots honor RP targeting rules, split shots within the wave window, and emit per-target level drops for downstream building services.

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
