# Resource Economy

This page describes the canonical implementation of the Travian-style resource
loop that powers village growth. The logic lives in
`lib/game-services/resource-economy.ts` and is covered by
`tests/resource-economy.test.ts`. The system models the three haulable
resources (wood, clay, iron), the Farm population cap, the Warehouse storage
limit, and the Hiding Place stash in a world-speed aware manner.

## 1. Core resource flow

### Resource buildings

- **Timber Camp**, **Clay Pit**, and **Iron Mine** drive hourly output.
- Each building has 10 plots per village. Level curves are defined in
  `config/resource-fields.json` and consumed via
  `calculateHourlyProduction()`.
- Output accrues continuously; the UI rounds down to whole units.

### Production calculation

1. Fetch the level data for each field using `getResourceLevelConfig()`.
2. Multiply base output by:
   - `gameSpeed` and `productionFactor` from the world.
   - `globalPercentBonus` plus `additionalPercentBonuses` (events, relics).
   - `perResourcePercentBonus` for flags/skins/quest rewards.
3. Add any `flatPerHour` bonuses for quest rewards or scripted grants.
4. The result is an hourly vector applied in `tickVillageResources()`.

### Secondary inflows

- **Plundering**: attackers steal from exposed stock produced via the same
  tick helpers.
- **Scavenging**: idle troops call back into `addInto()` to merge bundle
  returns.
- **Market trades** and **quests**: mutate the stock vector through
  `spendResources()` and `addInto()`.

### Spending & sinks

- Construction, recruitment, smithy research, noble coins/packages, and event
  crafting all spend via `spendResources()` to guarantee affordability checks.
- Admin tooling uses `canAfford()` in validation layers so UI flows report
  deficits before queueing work orders.

## 2. Warehouse (storage)

- Warehouse capacity is shared across wood, clay, and iron. The helper
  `getWarehouseCapacity(level)` uses a 1.2x growth curve seeded at 1200 units.
- `tickVillageResources()` caps each resource to the warehouse limit every
  tick and reports any waste for telemetry or alerts.
- Trades, quests, and troop returns should query the helper first and defer
  transfers if `warehouseCapacity` is already saturated.

## 3. Farm (population cap)

- The Farm controls how many buildings/units a village may support.
- `getFarmPopulationCap(level)` returns the static cap using a 1.17x growth
  curve starting at 60 population.
- Queue systems call `hasFarmCapacity()` with the current population usage and
  the pending cost; if it returns `false`, block the action.
- Catapult damage to the Farm reduces future capacity but does not delete
  existing troops/buildings. Players must rebuild before training more units.

## 4. Hiding Place (unlootable stash)

- Each Hiding Place level protects the same amount of wood, clay, and iron.
- `getHidingPlaceProtection(level)` mirrors classic Travian numbers: 150 at
  level 1 with 1.23x growth. The helper always returns an integer for clean UI
  presentation.
- `calculateLootableResources(stock, level)` subtracts the stash from current
  stock to produce the haulable payload that raid resolution uses.
- Scout reports can surface totals, but raiders only receive the exposed
  vector from the helper.

## 5. Operational guidance

- Keep `warehouseLevel` at least one step ahead of production bursts to avoid
  wasting ticks. The helper returns wasted production so admin dashboards can
  highlight stale villages.
- Align production ratios with your military plan by bumping specific field
  levels and attaching `perResourcePercentBonus` modifiers.
- Time Market shipments so arrivals land minutes before large build queues;
  otherwise `tickVillageResources()` will clip the returns at the warehouse cap.
- Lean on the Hiding Place early in hostile regions; stash sizes grow quickly
  enough to force attackers into inefficient hauls.
- Pair Farm upgrades with troop recruitment pushes—hitting the population cap
  is the fastest way to stall both economy and defense.
