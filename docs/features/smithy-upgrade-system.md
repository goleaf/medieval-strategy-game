# Smithy Upgrade System

## Unit Upgrade System

### Purpose
The smithy turns late-game resources into permanent combat upgrades. Every troop type owns two independent tracks:
- **Weapons** boost raw attack values.
- **Armor** boosts both infantry and cavalry defense ratings (or specialized defenses for hybrid units).

Upgrades apply **account-wide**: once a level completes, every current and future stack of that unit across all villages receives the bonus. Progress is shared between all smithies, but only one upgrade can run per smithy at a time.

### Level & Gating Rules
- Max level: 20 per track unless world presets override (`lib/config/tribal-wars-presets.ts`).
- Smithy level caps upgrade level (`smithyLevel >= desiredUpgradeLevel`). World presets can further clamp specific units (e.g., simplified tech worlds).
- Each troop track stores its own weapon/armor level. Example schema (to be persisted in Prisma):
  ```prisma
  model UnitUpgrade {
    playerId   String
    unitTypeId String
    track      UpgradeTrack // WEAPON or ARMOR
    level      Int          @default(0)
    @@unique([playerId, unitTypeId, track])
  }
  ```
  Active upgrades sit in the smithy’s `Research` relation (`Research.type === MILITARY_OFFENSE` for weapons, `MILITARY_DEFENSE` for armor) so existing queue processors, instant-complete logic, and cancellation rules already apply.

### Stat Formula
Let `baseStat` be the configured attack/defense value (`config/unit-system.json`). Let `level` be the weapon or armor level. Each level grants between 1% and 3% depending on balance knobs:
```
multiplier(level) = 1 + (level * perLevelPct / 100)
effectiveStat = baseStat * multiplier(level)
```
Default tuning uses 1.5% per level (matching the `smithy.perLevelPct` in `config/unit-system.json`), which yields:
- Level 10 ≈ +15%
- Level 20 ≈ +30%

For premium or special units we can override per-level percentages on a per-unit basis (e.g., siege units scaling slower to limit late-game artillery swarm power).

### Cost & Time Curves
- **Cost:** Exponential growth per level: `cost(level) = baseCost * pow(costGrowth, level - 1)`. Base costs align with training costs for that unit so heavy cavalry upgrades feel expensive compared to light infantry.
- **Time:** Similar exponential growth: early levels finish in under an hour, while levels 18–20 can span multiple days on speed-1 worlds. Final duration = `baseDuration / worldSpeed / smithySpeedMultiplier(level)` where the multiplier comes from `lib/config/construction.ts` smithy effects.
- Costs and durations are deducted upfront when the upgrade starts; no refunds or cancellations (consistent with `docs/features/canceling-actions.md`).

### Queues & Progress Tracking
- Each smithy can run **one** upgrade at a time, regardless of track. Multi-village accounts can run parallel upgrades in different smithies.
- `Research.isResearching` marks the active upgrade. `metadata` on the `Research` record stores `{ unitTypeId, track }`.
- Instant completion charges 2 Gold per active upgrade (shared with building tasks via `/api/villages/instant-complete`).
- Completion watchers poll `Research` rows with `completionAt <= now`, increment `UnitUpgrade.level`, emit toasts, and unlock the next level if the smithy still meets the building requirement.

### UI Requirements
- **Grid layout:** Columns = unit types, rows = `Weapon` & `Armor`. Each cell shows current level (e.g., `W10/A7`). Cells color-code statuses:
  - Green button when upgrade is available.
  - Red lock with tooltip listing missing smithy level or prerequisite tech.
  - Yellow progress pill showing percent + timer for the active upgrade.
  - Gray checkmark if at max level.
- **Detail panel:** Selecting a cell expands cost, duration, projected stat gain, and requirements. Include a historical log showing when each level finished.
- **Smithy header indicators:** Show current upgrade (unit, track, remaining time) plus a legend for offense vs defense.
- **Combat UI reflection:** Troup tooltips, rally-point previews, and combat simulator should display `effectiveStat` so players see real values after upgrades.

## Research Priority System

### Strategic Intent
Players cannot max every upgrade immediately; late levels cost massive resources and time. The priority system guides where to invest next based on playstyle, world settings, and actual troop composition.

### Recommendation Engine
1. **Data inputs:** Current unit counts (from `/api/villages/central-overview/troops`), upcoming trainings, world modifiers, tribe doctrines, and enemy scouting intel if available.
2. **Heuristics:** 
   - Offensive focus → prioritize weapon upgrades on main offensive units (axes, cavalry, siege escort).
   - Defensive focus → armor upgrades on spears/pikemen, archers, mixed-defense cav.
   - Balanced focus → keep both tracks within ±2 levels for core units.
   - Specialized prompts (e.g., “anti-cavalry” recommends spear armor before wall upgrades).
3. **Output:** For each track, compute `marginalPowerPerResource = (effectiveStat(level+1) - effectiveStat(level)) / cost(level+1)` and rank upgrades. Highlight top 3 suggestions with rationale (“+2.1% spear defense for 120k total resources; best for cavalry-heavy threats”).

### UI Surfaces
- **Priority sidebar:** Lives alongside the upgrade grid, listing recommended next steps, total cost, projected completion time, and expected stat gain.
- **Cost-benefit calculator:** Interactive widget where players drag a slider to simulate reaching level N; outputs resource bill, time, and total % gain. Can prefill with recommended targets (e.g., “Level 15 axe weapons will cost X and finish by Y”).
- **Playstyle presets:** Tabs for `Aggressive`, `Defensive`, `Balanced`, `Siege`, etc. Switching presets adjusts recommendations and highlights relevant cells on the grid.
- **Tribe officer dashboard:** Aggregates member upgrade progress (latest weapon/armor levels per key unit). Officers can set “tribe priorities” (e.g., “All members reach spear armor 12 before war start”) that the UI surfaces with badges.

### Implementation Notes
- Store priority settings per player (and per tribe for officer overrides). Schema example:
  ```prisma
  model UpgradePreference {
    playerId String @id
    playstyle UpgradePlaystyle @default(BALANCED)
    customWeights Json // map of unitTypeId → weight
    updatedAt DateTime @updatedAt
  }
  ```
- Backend computes recommendations whenever smithy data is requested, caching results for a short period (e.g., 5 minutes) since troop compositions shift slowly.
- Tribe dashboards aggregate upgrades via SQL views or cached materialized tables to avoid per-request heavy joins.
- Notification hooks remind players when a recommended upgrade becomes available (smithy idle + resources sufficient).

### Testing Checklist
- [ ] Verify smithy level gating per upgrade level (level cap matches building level).
- [ ] Ensure cost/time calculations grow exponentially and respect world speed + smithy multiplier.
- [ ] Confirm upgrades apply to combat calculations (simulate battles pre/post upgrade).
- [ ] Validate UI states for available/locked/researching/maxed cells.
- [ ] Test recommendation outputs for different playstyles and compositions.
- [ ] Confirm tribe dashboard permissions (officers view all, members see only their data).
- [ ] Ensure instant completion counts smithy upgrades and deducts correct Gold.
