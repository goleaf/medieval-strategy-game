# Wall, Residence/Palace, Cranny, Hero & Oasis Effects

The balance pack for these subsystems lives in code and SQL so it can be reused by the API, worker jobs, or external scripts without pulling in any framework dependencies.

## Files

| Purpose | Path |
| --- | --- |
| JSON balance source | `config/subsystem-effects.json` |
| Typed loader | `lib/config/subsystem-effects.ts` |
| Pure helpers (TS) | `lib/balance/subsystem-effects.ts` |
| Tests | `tests/subsystem-effects.test.ts` |
| SQL reference seed | `prisma/seeds/subsystem-effects.sql` |

Run `npx vitest run tests/subsystem-effects.test.ts` to verify the helpers before wiring them into higher-level services.

## Helper highlights

- **Walls**: `getWallMultiplier`, `applyWallBonus`, `computeRamDrop`, and `computeWallLevelAfterAttack` use the JSON tunables (defense %/level, ram curve, resistance) so combat can stay data-driven.
- **Residence & Palace**: `recomputeMaxLoyalty` and `computeExpansionSlots` take the active building levels (and `isCapital`) to derive the cap and slots while enforcing the mutual-exclusivity rule.
- **Cranny**: `computeCrannyLoot` consumes current storage plus defender/attacker tribes and applies crop toggle + per-tribe multipliers before reporting protected vs. lootable amounts.
- **Hero & Oasis**: `computeVillageProduction` multiplies field output by stacked oasis %, hero allocation, refinery bonuses, and world speed, with optional flat hero production. `getAnnexSlotLimit`, `canAnnexMoreOases`, and `isWithinAnnexRadius` wrap the hero mansion thresholds and annex radius.

These helpers have zero Prisma/Next.js dependencies, so scripts in `scripts/`, workers, or Go/Node microservices can import them directly (or mirror the formulas in another language) while sharing the same JSON balance pack.

## SQL pack

`prisma/seeds/subsystem-effects.sql` ships schema + starter rows for:

- `building_effects` (wall/residence/palace/cranny lookups, slot unlock flags)
- `wall_profiles` (per-village wall type + ram resistance)
- `oases` (bonuses + fauna JSON payloads)
- `heroes` (eco/combat stats)
- `village_production_cache` (hourly snapshot)

Use it as a template when provisioning standalone simulators or tooling databases; adjust column names/types if your runtime ORM already defines these tables.
