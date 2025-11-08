# Tribal Wars World Types

This guide distills the canonical Tribal Wars world configurations so live-ops and systems designers can map the right preset to each launch. Use it alongside `docs/admin/world-configuration.md` and the speed template docs when crafting new events or calibrating persistent servers.

## Admin Switchboard UI

- The **Admin → Game Worlds → Tribal Wars Presets** tab now renders the one-pager checklist and preset summaries directly from `/api/admin/tribal-wars/world-presets`.
- Data flows from `lib/config/tribal-wars-presets.ts`, ensuring the UI, automation scripts, and this document stay in sync.
- Ops teams can rely on the UI to copy exact values into provisioning scripts without retyping tables from the docs.

## Switchboard Checklist (One-Pager)

Use this matrix as the fast preset builder when spinning up a new world. Tick columns that match the event you are crafting, then copy the checked settings directly into the admin form or provisioning script.

| Switch | Standard | Speed Round | High Performance | Classic | Casual | Notes |
|--------|----------|-------------|------------------|---------|--------|-------|
| World Speed | ☑️ 1.0–1.5 | ☑️ 10×–400× | ☑️ 6 | ☑️ 3.0–3.5 | ☑️ 1.0 | Drives build/recruit timers. |
| Unit Speed | ☑️ 0.7–1.0 | ☑️ 10×–400× | ☑️ 0.25–0.3 | ☑️ 0.3 | ☑️ 0.8–1.0 | Lower = slower marches. |
| Production Factor | ☑️ 1× | ☑️ 10×–400× | ☑️ 6× | ☑️ 3× | ☑️ 1× | Multiply resource ticks. |
| Beginner Protection | ☑️ ~7 days | ⬜ (0–24h) | ☑️ ~48h | ⬜ (0h) | ☑️ ~5 days | Keep cancel windows aligned. |
| Night Bonus | ☑️ Fixed / player 8h | ⬜ Off | ⬜ Off | ⬜ Off | ☑️ Player 8h +100% | Mark regional hours if fixed. |
| Morale | ☑️ Points + time | ⬜ Off | ⬜ Off | ⬜ Off | ☑️ Points-based | Pick scaling curve in config. |
| Fake Limit | ☑️ 1% target points | ☑️ Event-defined | ⬜ Off | ⬜ Off | ☑️ 1% | Helps manage spam. |
| Scavenging | ☑️ On | ☑️ On | ☑️ On | ⬜ Off | ☑️ On | Pair with hauls toggle. |
| Hauls | ☑️ On | ☑️ On | ☑️ On | ☑️ On | ☑️ On | Standard resource haul rules. |
| Flags | ☑️ On | ⬜ (round choice) | ⬜ Off | ⬜ Off | ☑️ On | Disable for hardcore metas. |
| Archers | ☑️ On | ☑️ Round-dependent | ⬜ Off | ⬜ Off | ☑️ On | Ensure research tree matches. |
| Paladin w/ Skills | ☑️ On | ☑️ Round-dependent | ⬜ Off | ⬜ Off | ☑️ On | Remove skills on HP/Classic. |
| Watchtower | ⬜ Optional | ⬜ Round-dependent | ⬜ Off | ⬜ Off | ☑️ On | Align with scouting vision. |
| Church | ⬜ Optional | ⬜ Round-dependent | ⬜ Off | ⬜ Off | ☑️ On | Required for Casual pacing. |
| Loyalty Drop | ☑️ 20–35 | ☑️ Accelerated | ☑️ 20–35 | ☑️ 20–35 | ☑️ 20–35 | Sync with regen rate. |
| Loyalty Regen (/h) | ☑️ 1–1.5 | ☑️ Fast (10×–400×) | ☑️ 6 | ☑️ 3.0 | ☑️ 1 | Multiply by world speed. |
| Noble Range (fields) | ☑️ 60–100 | ☑️ Event-defined | ☑️ 50 | ☑️ 100 | ☑️ 100 | Hard-cap ensures fair fights. |
| Tribe Cap | ☑️ 20–25 | ☑️ Event-defined | ☑️ 8 | ☑️ ~14 | ☑️ ~20 | Lock support to tribe. |
| Off-Tribe Support | ⬜ Disabled | ⬜ Event-defined | ⬜ Disabled | ⬜ Disabled | ⬜ Disabled | Pull support on tribe change. |
| Attack Block Ratio | ⬜ Off | ⬜ Off | ⬜ Off | ⬜ Off | ☑️ 20% | Protects casual worlds. |
| Win Condition | ☑️ Domination / Runes | ☑️ Round goal | ☑️ Stronghold | ☑️ Fast Domination | ☑️ Domination after relax | Document thresholds in launch brief. |

> **How to use:** Print this table for launch reviews or copy it into runbooks. Check the column that matches your event, then adjust only the highlighted rows when experimenting with hybrid presets.

## Standard (Persistent) Worlds

Default long-form servers that stretch across many months. They focus on conquest, tribe politics, and mid-tempo macro play.

- **Pace**
  - World speed ~1.0–1.5; unit speed slightly below 1.0 for more deliberate march timings.
  - Production factor 1×; beginner protection ≈7 days.
- **Economy Toggles**
  - Scavenging, hauls, flags, and millisecond timing enabled.
  - Barbarian growth commonly on (e.g., cap around 5k points).
  - Fake limit ~1% of target village score.
- **Safety Nets**
  - Morale based on points + account age.
  - Night bonus with fixed or player-selected 8h window; defense boost usually +100% (some regions +300%).
- **Tech & Roster**
  - Simplified research, nobles via coin system, paladin (with skills) and archers active; watchtower/church world-dependent.
  - Scout system reveals troops/buildings/resources when scouts survive.
- **Conquest Rules**
  - Loyalty hit per noble 20–35; regen scaled by world speed (≈1–1.5 loyalty/hour).
  - Noble travel range 60–100 fields; tribe support locked to tribe.
- **Win Paths**
  - Domination (hold ≥X% player villages for Y days) *or* Runes/Relics control requirement.

## Speed Rounds

Short, resettable rounds designed for intense bursts of competition.

- **Runtime**: Hours to a few weeks; worlds reset after each round.
- **Pace**: Extreme world/unit speeds (10×–400×). Loyalty, building, research, and marching all accelerate.
- **Rules**:
  - Event-specific goals (score race, capture-first, etc.).
  - Extra fair-play policies—no account switches, dual logins, or undeclared shared devices.
- **Meta Impact**: Precision timing dominates; noble trains and backtimes decide wins in single sessions.

## High Performance (HP)

Long-form ladder with strict competitive rule set.

- **Pace**: Game speed ~6; unit speed ≈0.25–0.3, making travel slow and stacking essential.
- **Core Toggles**
  - No morale, no night bonus, no watchtower/church; militia on.
  - Simplified research; archers/paladin off.
  - Hauls/scavenging on; flags off.
  - Beginner protection ~2 days; cancel window ~5 minutes.
- **Tribes & Logistics**
  - Tribe cap around 8; hard-lock around day 30 prevents roster churn.
  - Support outside tribe disabled; sitter access throttled with heavy use.
- **Conquest**
  - Coin nobles; max range ~50 fields; loyalty regen ~6/hour.
- **Victory**
  - Stronghold mode—hold districts for influence points until threshold hit.

## Classic Worlds

Throwback servers that mimic early Tribal Wars pacing.

- **Pace**: World speed ~3; unit speed ≈0.3 → fast account growth, slow marches.
- **Toggles**
  - No morale or night bonus.
  - No watchtower/church; simplified research.
  - Archers/paladin off; militia on.
  - Millisecond timing on; fake limit off; scavenging off; hauls on; flags off.
- **Nobles**
  - Resource-based nobles with escalating cost per noble; loyalty regen ~3/h; max range ~100.
- **Tribe Rules**
  - Tribe cap ≈14; support locked to tribe.
- **Win Condition**
  - Domination after fixed duration (e.g., ≥55% player villages after ~60 days).

## Casual Worlds

Protective long-term spaces for relaxed play or recovery.

- **Protection First**
  - Attack-block ratio (≈20% of lower account’s points) prevents bullying.
  - Player-select night bonus (8h, +100% defense) plus points-based morale.
  - Beginner protection ~5 days; fake limit ~1%.
- **Features Enabled**
  - Church, watchtower, archers, paladin, scavenging, hauls, flags all on.
  - Barbarian spawn extremely high (e.g., 3500%) with bonus villages.
- **Conquest**
  - Coin nobles, loyalty drop 20–35, regen +1/hour; range ~100.
- **Tribes**
  - Tribe cap around 20; off-tribe support stripped on tribe change.
- **Endgame**
  - Start with heavy restrictions, then shift toward domination once attack blocks relax.

## Quick Comparison

| World Type | Duration | Safety Tools | Pace Profile | Primary Win Path |
|------------|----------|--------------|--------------|------------------|
| Standard   | Months   | Morale, NB, tribe caps, fake limit | Moderate macro, flexible meta | Domination or Relics/Runes |
| Speed Round| Hours–Weeks | Strict fair-play rules | Extremely fast | Round-specific goals |
| HP         | Months   | Minimal (no morale/NB) | High macro speed, slow marches | District influence (Stronghold) |
| Classic    | ~2 Months| Minimal safety rails | Fast growth, slow travel | Domination (fixed timer) |
| Casual     | Long     | Attack-block, NB, morale, enabled helpers | Relaxed, protection-heavy | Domination after safeguards fall |

> **Tip:** Create admin presets mirroring these defaults inside your provisioning scripts. Pair speed/template data with the toggles above so QA can spin up representative servers quickly.
