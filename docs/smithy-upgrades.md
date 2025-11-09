Smithy Upgrade System

Summary
- Smithy provides permanent, account-wide unit upgrades in two tracks per unit: Weapons (attack) and Armor (defense).
- Each track has up to 20 levels. Smithy level gates the maximum upgrade level (e.g., Smithy 20 → level 20 upgrades).
- Upgrades are researched one at a time per village Smithy, cannot be canceled, and deduct resources immediately.
- Costs and durations grow exponentially; early levels take hours, late levels take days. World speed and Smithy level reduce durations.

Data Model
- UnitTech: per-player per-unit levels: `attackLevel`, `defenseLevel`.
- SmithyUpgradeJob: active upgrade per village Smithy with `kind` (ATTACK/DEFENSE), `unitTypeId`, `targetLevel`, `completionAt`.
- EventQueueType.SMITHY_UPGRADE_COMPLETION: event handler marks `UnitTech` to the new level and completes the job.

API
- GET `/api/villages/:id/smithy?playerId=...` → smithy grid with unit levels, next upgrade costs/times, active job, and simple recommendations.
- POST `/api/villages/:id/smithy` `{ playerId, unitTypeId, kind: "ATTACK"|"DEFENSE" }` → starts upgrade if available.
- GET `/api/tribes/:tribeId/smithy?requesterId=...` → officers can view member upgrade progress; returns per-member UnitTech and per-unit averages.

Formulas
- Cost: based on unit’s training costs with exponential growth: `cost(level) ≈ baseCost × (8 + level) × 1.25^(level-1)`.
- Time: base by unit role (inf 1h, cav 1.5h, siege 2.5h) × `1.25^(level-1)`; scaled by world speed and Smithy research speed multiplier (`max(0.5, 1-0.04×(smithyLevel-1))`).
- Combat: Each level multiplies base stats by `globals.smithy.perLevelPct` percent from `config/unit-system.json` (e.g., 1.5%/lvl), applied everywhere account-wide.

UI
- Page `/village/:id/smithy` renders a grid with current levels, next upgrade metadata, locked reasons, and an active progress bar.
- Buildings page links directly to Smithy upgrades for quick access.
- Presets: offense/defense/balanced tune recommendations (add `preset=offense|defense|balanced` to the GET request or switch via the UI control).
- Cost-benefit table: top recommendations list unit, path, +%/level, troops affected, total cost, duration, and score (value per resource unit).
