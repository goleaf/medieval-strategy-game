# Resource System Overview

This project now supports Travian-style wood/clay/iron/crop fields alongside the legacy economy. The new system is fully data-driven, backed by Prisma models, and surfaces UI hints for storage pressure and starvation risks.

## Data model quick reference

- `VillageResourceField` — 10 rows per resource (`WOOD|CLAY|IRON|CROP`) that store slot + level.
- `ResourceFieldLevel` — shared lookup generated from `config/resource-fields.json` (levels 1–20 with costs, build times, and hourly output).
- `VillageResourceLedger` — authoritative balances, hourly/net production, and storage caps (Warehouse vs. Granary).
- `ResourceProductionModifier` — oasis, hero, artifact, or admin buffs; supports `ALL_RESOURCES`, `SINGLE_RESOURCE`, and `NET_CROP_CONSUMPTION`.
- `TroopBalance.cropUpkeep` — new Prisma column that drives upkeep math for the starvation loop.
- `BuildingService.calculatePopulationLimit` — reads the Farm blueprint so the crop-support cap mirrors the construction data.

Seed everything with:

```bash
npm run resource:seed        # Prisma bootstrap
sqlite3 prisma/dev.db < prisma/seeds/resource_field_levels.sql
```

## Tick + Starvation flow

`ResourceProductionService.processVillageTick` executes every game tick (wired into `lib/jobs/game-tick.ts`):

1. Bootstrap missing ledgers/fields for older villages.
2. Sum per-field output via the shared config, add +2/h baseline, scale by loyalty + world speed.
3. Apply hero, oasis, and artifact modifiers (multiplicative).
4. Update ledger amounts with storage caps and persist per-resource `productionPerHour` + `netProductionPerHour`.
5. Compute crop consumption (`troops.quantity × cropUpkeep`), apply Diet-style reductions, and resolve starvation if gross crop < consumption. Oldest troops die first until upkeep ≤ gross.
6. Log starvation summaries in the server output so admins can trace deficits quickly.

Helper functions live in `lib/game-services/resource-production-helpers.ts` and are covered by `npm run test:resources`.

## UI/UX guidelines

- **Header widget:** display `current | hourly | time-to-full` for each resource by reading `VillageResourceLedger`. Use warning colors when `timeToFull < 3h`.
- **Field screen cards:** include ROI text (`+X/h`, `Cost`, `Payback ~Yh`) using `getResourceLevelConfig()`.
- **Storage banner:** show “Warehouse full in 1h 12m” when projected capacity is below three hours for any material, and “Granary empty in 45m” when `netCrop < 0` but troops remain.
- **Starvation alert:** when `netProductionPerHour` for crop is negative, pin a red badge on the village list and surface casualty summaries from the server logs/admin panel.
- **Trade helpers:** offer a shortcut to the Marketplace or NPC modal when one resource is capped and another is starving.

## PHP/Laravel parity

Standalone services under `php/app/Services` mirror the same formulas so backend agents can run hourly jobs outside Node. Run `composer install && composer test` to execute the Pest tests that cover gross production, storage capping, and starvation order.
