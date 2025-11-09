# Catapult Targeting & Damage Resolution

Catapult damage is now resolved inside `lib/troop-system/mission-engine.ts` immediately after `resolveBattle` returns an attacker victory. This document explains how targets are selected, how many shots the attackers get, and how the probabilistic damage model matches the in-game spec.

## Ordering in the Battle Pipeline
1. Combat resolution.
2. Ram damage vs. wall.
3. Catapult damage (this document).
4. Administrator (loyalty) effects.
5. Loot / return scheduling.

All waves that share the same landing timestamp use the deterministic movement ordering described in `docs/features/rally-point.md`.

## Targeting Modes (Rally Point Gates)

| RP Level | Mode | Behaviour |
| --- | --- | --- |
| 1–9 | Random | Engine selects a valid structure at resolution time. |
| 10–19 | Single | Player may lock one target (building or resource category if enabled). |
| 20+ | Dual | Player may lock two targets; shots split evenly (extra shot goes to the first pick). |

Selections are stored with the movement and re-validated at arrival. If the first pick is invalid but the second remains valid, all shots shift to the second target. If both picks are invalid, the wave degrades to random targeting.

## Target Eligibility & Protections
- Eligible: all inner buildings except walls, plus great warehouses/granaries in WW support villages.
- Ineligible: walls/oases/heroes.
- Floors: Palace, Residence, and Rally Point clamp to ≥1 by default. World presets may add more floors.
- If a target is already at its floor, the resolver consumes the allocated shots, reports a floor note, and wastes the volley (no spillover).

## Resource Field Targeting (Toggle)
- Disabled by default on “classic” worlds.
- When enabled, players can target `wood`, `clay`, `iron`, or `crop` categories (and optionally specific slot indices on hardcore presets).
- Shots always hit the highest-level tile within that category (ties broken by slot id). An optional “even-spread” variant rotates across tiles.
- Capital protections are data-driven: `immune`, `floor ≥ X`, or `none`.
- Production changes apply immediately after the catapult phase; starvation re-checks in the same tick.

## Damage Model
- Let `count` be the surviving catapults after combat.
- Compute the tech multiplier: `techMult = 1 + averageSmithyAttackLevel × siege.catapult.techPct / 100`.
- Effective catapults: `effectiveCats = floor(count × techMult)`.
- `totalShots = floor(effectiveCats / 3)` (3 catapults = one shot). Values below three cats produce zero shots.
- Shots are distributed via `distributeShots` (half/half for dual targeting, extra shot goes to the first target).
- Each shot performs a Bernoulli trial whose success chance depends on the remaining catapults:

| Surviving catapults | Success chance per shot |
| --- | --- |
| 3–5 | 30% |
| 6–8 | 50% |
| 9+ | 90% |

- Every success reduces the current target by exactly one level (never below 0). Failures consume the shot.
- RNG pulls from a hash of `battleReport.luck.seed`, making battle reports, replay tools, and post-processing fully deterministic.

## World Wonder Rules
World Wonder (WW) support is data-driven. If the siege snapshot supplies WW or great-building targets, they are treated like any other target: shots can land as long as the structure level is above zero. Per-world drop caps or stonemason reductions can be layered on top by adjusting the snapshot or by wrapping the `applyCatapultDamage` result before persistence.

## Reporting & Persistence
- `applyCatapultDamage` returns `CatapultResolution` summarising shots, per-target drops, and remaining levels.
- The rally-point engine fetches the defender’s siege snapshot, supplies it via `SiegeContext.targets`, persists the new levels if drops occur, and stores the same payload inside the battle report (`battle.catapultResolution` and movement report history).

## Configuration

- `config/unit-system.json > siege.catapult` controls the smithy tech multiplier (`techPct`) and the threshold for shot creation.
- Rally-point world settings still decide whether dual targeting or resource-field targeting is allowed; the movement snapshot should only contain targets that are legal for the current world.
- Adjusting the success probabilities requires editing `applyCatapultDamage` so that combat reports, backend logic, and documentation remain in sync.

## Test Coverage
- `lib/__tests__/rally-point-engine.test.ts` checks RP gating, mission ordering, and cancellation handling.
- Add scenario tests near `lib/combat/__tests__/travian-resolver.test.ts` whenever you tweak shot chance tables so regression coverage stays realistic.

Run the suite via:

```bash
npx vitest run lib/__tests__/rally-point-engine.test.ts
npx vitest run lib/combat/__tests__/travian-resolver.test.ts
```
