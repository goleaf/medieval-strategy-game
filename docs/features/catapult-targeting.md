# Catapult Targeting & Damage Resolution

The rally-point mission pipeline now routes all post-combat catapult work through a dedicated resolver (`lib/combat/catapult`). This document outlines how players choose targets, how the resolver validates and damages structures/resource fields, and which knobs are world-tunable.

## Ordering in the Battle Pipeline
1. Combat resolution.
2. Ram damage vs. wall.
3. Catapult damage (this spec).
4. Administrator (loyalty) effects.
5. Loot.

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
- Each surviving catapult contributes one shot; smithy levels, artifacts, and events can boost shot power via percentage multipliers.
- Base costs per level follow a diminishing-return curve (levels 1–5 are cheap, 6–10 moderate, 11–20 expensive). Great buildings multiply the cost, resource fields use a discounted multiplier, and WW entries use a massive multiplier plus per-wave drop caps.
- Damage simulation subtracts level costs until power is depleted, the target hits its floor, or the wave hits its WW drop cap. Excess power/shots are marked as wasted.
- A deterministic ±5 % variance is applied per target using the movement seed components so repeated simulations remain reproducible.
- Stonemason (when present and allowed by the world rules) reduces incoming shot power by a configurable percentage.

## World Wonder Rules
- Eligible targets inside a WW village: the WW itself plus Great Warehouses/Granaries (other buildings depend on the world’s build list).
- Default per-wave drop cap: 1 level (tunable per world). Excess shots are wasted once the cap is reached.
- Stonemason is disabled in WW villages by default.

## Reporting & Persistence
- The resolver returns a structured report containing the player selection (if any), target label/type, level `before → after`, shots allocated/consumed/wasted, active modifiers (variance, stonemason, artifact/event bonuses), and notes (floor hits, WW cap, invalidation).
- `RallyPointEngine` now fetches a siege snapshot for defender villages, feeds it into the resolver, persists the resulting structure/resource-field levels inside the same transaction, and stores the full `catapultDamage` payload on the battle report.

## Configuration (`WorldConfig.siegeRulesConfig`)

`lib/combat/catapult/rules.ts` ships with `DEFAULT_CATAPULT_RULES` (classic preset). Override any subset per world by populating the `WorldConfig.siegeRulesConfig` JSON blob (see the new Prisma column + migration):

```json
{
  "targeting": {
    "fieldRule": {
      "enabled": true,
      "allowSlotSelection": false,
      "randomEligible": false,
      "selectionMode": "highest_first",
      "capitalProtection": { "mode": "floor", "floorLevel": 10 },
      "resilienceMultiplier": 0.85
    }
  },
  "resilience": {
    "worldWonderMultiplier": 30,
    "overrides": {
      "WORLD_WONDER": { "dropCap": 2 }
    }
  }
}
```

`WorldRulesService#getSiegeRules()` merges overrides with the defaults, so API callers and background jobs can consistently apply the same rule set without duplicating constants.

## Test Coverage
- `lib/combat/__tests__/catapult-engine.test.ts` exercises floors, resource-field targeting, random fallback, and WW caps.
- `lib/__tests__/rally-point-engine.test.ts` ensures RP gating, mission ordering, and cancellations all still hold with the new resolver in place.

Run the suite via:

```bash
npx vitest run lib/combat/__tests__/catapult-engine.test.ts
npx vitest run lib/__tests__/rally-point-engine.test.ts
```
