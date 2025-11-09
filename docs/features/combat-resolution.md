# Combat Resolution Engine

This document describes the full battle pipeline that now powers the game. The implementation lives in `lib/combat/travian-resolver.ts` (core strength/casualty math) and `lib/troop-system/mission-engine.ts` (siege, loot, loyalty, and travel side-effects).

## High-Level Flow

1. **Build armies** – Each stack carries its base stats, role, smithy levels, and optional metadata such as `unitType` (used for paladin detection).
2. **Pre-combat modifiers** – Apply smithy upgrades, morale, hero/night modifiers, paladin bonuses, wall bonus, and luck.
3. **Ram step** – Surviving rams get a 2% roll each to chip away at the wall before the first combat round.
4. **Iterative rounds** – The resolver repeatedly compares attacker/defender strength, computes proportional losses, and removes casualties until one side is gone or the round cap is hit.
5. **Post-combat handling** – Loot, catapult shots, loyalty hits, and return commands are resolved once the winner is known.
6. **Reporting** – Every battle stores round-by-round details, multipliers, luck seeds, siege outcomes, and survivor totals for downstream UI and analytics.

## Pre-Combat Phase

| Step | Details |
| --- | --- |
| **Smithy bonuses** | Attack/defense stats are multiplied by `1 + (level × 1.5%)` (configurable via `config/combat.json`). |
| **Paladin aura** | If a stack’s `unitType` contains “paladin” _or_ the caller passes `paladinBonuses`, the entire army receives attack/defense multipliers (defaults: +10% each). |
| **Morale** | `calculateMoraleMultiplier` compares attacker and defender account sizes, clamping between `min_att_mult` (0.3) and `max_att_mult` (1.0) with optional time floors. |
| **Luck** | A zero-sum swing in the range `[-0.25, +0.25]` is drawn from a deterministic Xorshift RNG seeded by `environment.seed`/`seedComponents`. |
| **Wall baseline** | The defender’s wall multiplier is computed from the post-ram level (`1 + level × wall.def_pct_per_level / 100`). |
| **Ram attacks** | Each surviving ram gets a 2% chance to drop the wall by one level (capped by the current level). The result is captured in `battleReport.preCombat`. |

## Combat Rounds

- The resolver recomputes attacker composition weights (`infantry`, `cavalry`, `mixed`) every round so defenders always defend against what is still alive.
- Strength calculations:
  - `attackerStrength = attackPower × morale × hero × paladin × luck`.
  - `defenderStrength = defensePower × wall × night × paladin × luck`.
- Casualty math:
  - Determine if attacker or defender currently has the higher strength (`strongerStrength` vs. `weakerStrength`).
  - Evaluate the ratio curve `shaped = (strongerStrength / weakerStrength) ^ curvature_k`.
  - Base loss rate defaults to 0.35. The weaker side’s loss rate grows with `shaped`, the stronger side’s loss rate shrinks by the same amount.
  - Apply the ±10% variance described in the spec (`1 ± 0.1`), clamp between `min_loss_rate` (0.02) and `1`, and scale by the raid lethality factor when applicable.
  - Casualties are removed proportionally to each stack’s share of the remaining army. A deterministic tie-breaker (seeded RNG) ensures the round totals match the computed loss rate.
- Rounds repeat until either army hits zero survivors or the `rounds.max_rounds` cap (default 12) is reached. Each round is recorded in `battleReport.rounds`.

## Outcomes

The resolver now exposes explicit outcomes:

| Outcome | Condition |
| --- | --- |
| `attacker_victory` | Defender wiped and attacker still has survivors. |
| `defender_victory` | Attacker wiped or both sides survive (defenders hold by default). |
| `mutual_destruction` | Both armies annihilated in the same round (rare). |

Loss rates reported at the top level are derived from total initial vs. total casualties so that downstream consumers no longer need to guess from the round log.

## Post-Combat Effects

### Loot Calculation

1. Compute surviving carry capacity (siege units are excluded).
2. Subtract cranny protection (`cranny.basePerLevel × level × tribeMultiplier × penetrationPct`).
3. Determine the total lootable stock after protection.
4. Split loot proportionally by each resource’s share of the lootable stock, then use the remaining capacity to honor the configured loot priority order.
5. The resolver returns the taken payload, remaining capacity, and a snapshot of the defender’s resources after pillage.

### Catapult Damage

- Only the winning attacker’s surviving catapults can fire.
- Smithy levels boost effective catapult count (`effectiveCats = floor(count × (1 + techLevel × techPct)))`).
- Every three effective catapults produce one shot (`totalShots = floor(effectiveCats / 3)`), minimum zero.
- Shots are distributed between 1–2 targets depending on rally point level (`allowDualTargets` mirrors RP 20+ worlds).
- Per-shot success chances:

| Surviving catapults | Chance per shot |
| --- | --- |
| 3–5 | 30% |
| 6–8 | 50% |
| 9+ | 90% |

- Each successful shot removes one level from the current target (no floors beyond “can’t go below 0”). Misses consume the shot with no effect.
- Randomness uses a hash derived from `battleReport.luck.seed` so reports and downstream builders always match what the resolver saw.

### Loyalty & Conquest

- Only `admin_attack` missions where the attacker actually won can apply loyalty hits.
- Every surviving administrator rolls independently within the configured window (default 20–35 points).
- If loyalty drops to 0 or below:
  - Successful captures reset the village loyalty to a random value between `captureFloor` (25) and `captureCeiling` (35).
  - Blocked captures clamp the village to `blockedFloor` (1).

### Returns & Travel

If any non-settler survivors remain, the mission engine schedules a return trip using the outbound travel duration and attaches the survivor manifest. This lets the movement system re-use the same ETA math without duplicating logic.

## Reporting & Determinism

- `BattleReport.preCombat` captures wall levels before/after ram rolls, total attempts, the applied wall/morale multipliers, and paladin modifiers.
- `BattleReport.rounds` stores per-round strengths, loss rates, casualties, and inferred attacker composition to help tooling visualize the fight.
- The RNG seed is always included (`battleReport.luck.seed`) so siege rolls, loot distributions, and replay simulations stay reproducible.

## Configuration Reference

| Setting | Location | Notes |
| --- | --- | --- |
| Smithy %, curves, and morale bounds | `config/combat.json` | Shared by every resolver caller; can be overridden via DB/world config. |
| Round cap/base/min loss rate | `config/combat.json > rounds` | Tunable per-world to make fights shorter or bloodier. |
| Catapult tech %, shot divisor, min shots | `config/unit-system.json > siege.catapult` | Affects effective shot count before the probability roll. |
| Loot order, penetration, cranny multipliers | `config/unit-system.json > missions` / `globals.cranny` | Controls how plunder is split and how much stays hidden. |
| Loyalty hit window & capture floors | `config/unit-system.json > administration` | Applies to every tribe-specific administrator description. |

Refer back to this document any time you modify combat constants, add new siege behavior, or expose the round log in UI so the feature crew stays aligned with the backend reality.
