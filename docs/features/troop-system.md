# Troop System

This module implements the configurable troop/mission spec that powers infantry, cavalry, siege, settlers, and administrators. Balance lives inside `config/unit-system.json` while reusable math sits under `lib/troop-system`.

## Data Configuration

- `config/unit-system.json` stores global tuning (loss curves, smithy %, wall tables, siege curves, loot policy) and every unit definition. Anything that affects balance is editable here without touching code.
- `lib/troop-system/config.ts` exposes `getTroopSystemConfig`, `getUnitDefinition`, and `requireUnitDefinition` helpers so the rest of the codebase never needs to import JSON directly.

## Domain Helpers

| File | Responsibilities |
| --- | --- |
| `lib/troop-system/army.ts` | Builds `ArmyComposition` objects from raw stack counts + tech levels. |
| `lib/troop-system/movement.ts` | Calculates distances, stack speeds, and travel windows for any mission. |
| `lib/troop-system/training.ts` | Applies building multipliers, queue ordering, and resource costs when creating training jobs. |
| `lib/troop-system/mission-engine.ts` | Wraps the Travian-style resolver with siege, loot, loyalty, and return scheduling logic. |
| `lib/troop-system/settlement.ts` | Validates preconditions, handles tile races, and returns settlement outcomes + costs. |
| `lib/troop-system/scouting.ts` | Resolves scouting success, intel depth, and scout losses using smithy multipliers. |
| `lib/troop-system/upkeep.ts` | Computes net crop and enforces starvation policy when villages run negative. |

## Combat Pipeline

1. Build attacker/defender armies via `buildArmyComposition`.
2. Call `resolveCombatMission` with wall info, mission type (`attack`, `raid`, `siege`, or `admin_attack`), and optional siege/loot/loyalty contexts.
3. The resolver:
   - Delegates casualty math to `lib/combat/travian-resolver` with per-mission loss curves from the unit config.
   - Applies ram and catapult damage using the log-shaped and divisor-based curves defined in JSON.
   - Computes loot respecting cranny protection + loot priority and plans return movements with the same travel time as the outbound trip.
   - Applies loyalty hits when administrators survive on `admin_attack` missions.

Outputs contain full survivor breakdowns, siege effects, loot payloads, loyalty deltas, and a ready-to-schedule return plan.

## Training & Upkeep

- `enqueueTraining` enforces building/tech requirements, calculates per-unit training time (`base_time / (server_speed * building_multiplier)`), returns the scheduled window, and reports the aggregate resource bill for immediate deduction.
- `computeUpkeep` + `resolveStarvation` enforce hourly crop consumption. Policies can be toggled between `oldest_first` and `highest_upkeep_first` in the config.

## Movement & Missions

- `computeTravel` implements `distance / slowest_speed / server_speed` for any mission, including scout-only handling.
- `resolveSettlerRace` makes tile races deterministic by sorting arrivals; `resolveSettlementOutcome` applies expansion/culture checks and returns loyalty on success.
- `resolveScoutMission` reports intel depth tiers and losses; callers can inject deterministic RNGs for repeatable tests.

## Schema Reference

The following Prisma/SQL tables fit the runtime expectations. They intentionally mirror the SQL-ish spec:

```sql
CREATE TABLE unit_types (...);
CREATE TABLE unit_tech (...);
CREATE TABLE unit_stacks (...);
CREATE TABLE training_queue (...);
CREATE TABLE movements (...);
```

See §1 of the inline spec for full column listings. Update `prisma/schema.prisma` alongside the config when bringing this schema online.

## Testing Hooks

The new `lib/__tests__/troop-system.test.ts` suite (added with this change) exercises:

- Movement/training calculations (speed + queueing).
- Combat mission outcomes including ram and catapult damage.
- Loyalty drops and settlement validation.
- Starvation + scouting edge cases.

Run it with `npx vitest run lib/__tests__/troop-system.test.ts` after seeding the unit config if you tweak balance.
