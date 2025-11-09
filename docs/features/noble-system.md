# Noble System

Gold coin nobles mirror the late‑game loop from Tribal Wars: players rush a specialized noble building (aka Snob) that mints coins, converts them into nobles, then send trains to conquer villages. This doc captures the production, training, and construction rules so backend services, UI, and balancing tables stay in sync.

## Gold Coin Production

- **Source building:** Coins are produced only inside the noble building. Each village tracks its own ledger; coins can never be transferred or merged across villages.
- **Base timing:** World‐speed 1 defaults to 24–48 hours per coin depending on building level. Faster worlds divide the timer, while speed <1 worlds multiply it. Levels shave the base duration by a fixed percentage per tier.
- **Storage cap:** Early levels hold 3 coins, scaling to 4 or 5 at higher tiers. Production auto-pauses when the cap is hit and resumes once a coin is spent.
- **Inputs:** Coins cost no resources beyond the construction cost of the building itself. Mints run continuously after the building finishes; there is no queue management beyond respecting storage.
- **Progress display:** The noble building detail screen shows a live countdown, expected completion timestamp, and percentage bar for the active coin. When storage is full the UI flips to a warning state and encourages players to spend coins.
- **Data model:** Villages store `coinProductionStartedAt`, `coinProductionDurationSeconds`, `coinStorage`, and `coinStorageMax`. Duration is recomputed whenever the building level changes or a global speed modifier updates. A derived `coinsReady` count drives UI badges.
- **Notifications:** Reaching storage cap or finishing the final required coin for a queued noble emits push/toast notifications so players know they can train.

## Nobleman Training

- **Hard requirements:** Academy research complete, noble building constructed and actively minting, enough gold coins (configurable 1–3 per noble), massive resources (40k+ each resource at speed 1 tuning), 100 population, and an open training slot (only one noble per building concurrently).
- **Flow:**
  1. Player opens the noble building > Training tab.
  2. UI shows coin balance, required coins per noble, total resource bundle, population hit, and training time (6–8 hours baseline at world speed 1).
  3. When the player confirms, the backend validates all inputs, immediately deducts resources + coins, reserves 100 population, and schedules a `UnitTrainingTask` with type `NOBLEMAN`.
  4. Training cannot be canceled; API surfaces this constraint so the UI disables the cancel action.
  5. Completion delivers the noble to the village rally point and frees the population slot.
- **Progress emphasis:** Noble training is always visible in the global queue widget (accent color + noble icon) and the building screen shows the countdown, start/finish timestamps, and the coin consumption summary.
- **Coin bookkeeping:** Starting training consumes coins instantly and logs a `coinTransaction` entry for admin review. If the task fails (server crash, etc.) a compensating transaction re-credits the coins.

## Noble Building Construction

- **Prerequisites:** Academy research unlocked, HQ ≥ 20, Smithy ≥ 20, Market ≥ 10, and any world/tribe-specific tech gates. Only one noble building per village.
- **Cost curve:** Construction is intentionally punishing—costs jump sharply per level (massive wood/clay/iron/crop bundles) and build times rival a maxed HQ. `lib/config/construction.ts` should model escalating costs and additive effects per level.
- **Effects per level:**
  - Reduces coin production time by a set percentage (e.g., −10% duration per level up to a floor).
  - Increases coin storage cap at milestone levels (3 → 4 → 5).
  - Unlocks additional noble slots if the world rules limit simultaneous nobles per village.
- **Tech path UI:** Building tooltip lists every prerequisite (with current level status), estimated time/resources to reach them, and an ETA for when the first noble can realistically begin training (sum of finish times, coin minting, and training duration). This sets player expectations for late-game pacing.
- **Milestone messaging:** Completing level 1 triggers a tutorial card explaining the coin loop and conquest mechanics. Subsequent upgrades remind players about reduced mint times/storage bumps.

## Loyalty System

- **Range and defaults:** Every village tracks `loyalty` between 0 and 100. Newly founded villages start at 100; freshly conquered villages respawn at a configurable 25–35 to reflect unrest.
- **Reduction:** Each successful noble hit rolls a random loyalty loss between 20 and 35 (respecting world presets). Reductions apply only if the noble survives; simultaneous nobles stack their individual rolls.
- **Regeneration:** Villages regenerate +1 loyalty per hour by default (scaled by world speed modifiers). Regeneration pauses during active combat windows if desired; otherwise it ticks continuously until reaching the building-specific max (Residence/Palace modifiers still apply if implemented).
- **Ownership transfer:** When loyalty drops to 0 or below, the attacker immediately gains control. All defending troops are cleared, queued builds/research/training cancel, and the conquering noble stays stationed in the village.
- **UI hooks:** Village overview surfaces current loyalty with inline regen ETA, battle reports show the exact loyalty delta per noble hit, and players receive warnings when any owned village dips below 50 loyalty (toast + push). Conquest reports highlight the final drop to 0 and the new owner baseline.
- **Data model:** Persist `loyalty`, `maxLoyalty`, `loyaltyLastTickedAt`, and per-event `loyaltyChangeLog` so reports and analytics can reconstruct the timeline. Hooks in combat resolution should pass the rolled value and final total for transparency.

## Conquest Attack Process

- **Preparation phase:** Players typically need 2–4 nobles plus thousands of escort troops. They should scout the target to confirm troop counts, coordinate fake/support waves with their tribe, and schedule arrivals relative to world speed. UI should coach users about resource requirements, coin availability, and expected loyalty hits.
- **Clearing phase:** Send one or more standard attacks without nobles to wipe defending armies and crush the wall (catapults prioritized on wall + defensive buildings). Scouts confirm whether additional clears are necessary before nobles depart.
- **Noble attacks:** Nobles travel with protective escorts and are often spaced 2–4 hours apart to avoid all failing to the same rebuilt defense. Each successful noble subtracts 20–35 loyalty, so conquering a fresh 100-loyalty village usually demands 3–4 nobles. Backend must enforce “one noble per wave” and record the exact roll per wave.
- **Conquest completion:** On loyalty ≤ 0, the game transfers ownership instantly, deletes defender troops, cancels local queues, leaves building levels untouched, moves current resources to the new owner, and leaves the final noble stationed inside. Expansion service should log `CONQUER` links plus attacker/defender ids.
- **Post-conquest security:** UI nudges attackers to send reinforcements, rebuild walls, and rename/configure the village. Loyalty regen panel shows how long it will take to reach safe thresholds given the 1/hr baseline.
- **Reporting & notifications:** Generate a dedicated conquest report summarizing each wave’s loyalty change, the decisive hit, and ownership change. Notify both players and their tribes via inbox + push so coordinators know the outcome.

## Multiple Noble Coordination

- **Attack planner:** Provide a noble-specific planner that sequences waves, shows planned arrival timestamps, and visualizes the loyalty trajectory (current loyalty, expected drop per wave, projected conquest time). Integrate coin/queue status so players cannot schedule more nobles than exist.
- **Loyalty calculator:** Given the current loyalty and number of nobles, display min/avg/max expected remaining loyalty. Highlight the probability of success to help decide if an extra noble is needed.
- **Cooldown guidance:** Enforce or recommend a cooldown between nobles launched from the same village (configurable, e.g., 15 minutes real time) to prevent overscheduling. Display warnings if nobles are queued too close together, reminding players that defenders might rebuild walls between hits.
- **Tribe-wide coordination:** Tribe dashboards list all scheduled noble trains (target, owner, arrival window, nobles remaining) to avoid double-booking. Alerts fire if two members target the same coordinates within a short window, prompting coordination.
- **Timeline visualization:** Render a horizontal timeline of all planned waves (clears, nobles, fakes) with drag-and-drop adjustments. Lock icons denote non-cancelable noble trainings so planners know the earliest departure times.

## Loyalty Management

- **Defender advantage:** The higher the loyalty, the more nobles the attacker must commit (100 loyalty needs at least three successful nobles, often four). Design surfaces this up front so defenders understand why topping off loyalty matters.
- **Regeneration visibility:** Village overview shows the regen rate (e.g., `+1 loyalty/hour`, modifier icons for artifacts/items) and an ETA until 100. Tooltip explains how world speed, Residence, and consumables alter the rate.
- **Spacing impact:** When attackers spread nobles hours apart, regeneration ticks in-between, effectively adding extra nobles to the requirement. Combat planner should visualize this regeneration curve so both sides can make informed decisions.
- **Accelerators:** Some worlds unlock artifacts, items, or premium boosts that increase regeneration. These stack multiplicatively with world speed and must reflect in UI/analytics.
- **Notifications:** Any loyalty loss immediately triggers inbox/toast/push alerts to the village owner and sitters, plus tribe pings if loyalty <50. Daily summary emails highlight villages that took loyalty damage in the last 24 hours.

## Anti-Conquest Strategies

- **Troop rebuilding:** Fast-train presets (e.g., “wall rebuild” or “anti-noble squad”) let defenders restock crucial units between noble waves. Queue UI highlights the earliest completion time vs. expected next noble arrival.
- **Support calling:** High-priority “Request Reinforcements” action pings tribe mates with arrival timers, target coords, and current loyalty so they can dispatch defense in time.
- **Noble sniping:** Rally-point planner supports “snipe” templates—defenders schedule a counter-attack/return timed to hit nobles precisely. Combat simulator estimates noble survival odds given planned defense.
- **Counter-nobles:** Tribe coordinators can plan retaliatory nobles (noble the attacker back). Planner links to the attacker’s coordinates and suggests coin/training readiness steps.
- **Village sitting:** Sitting UI shows loyalty alerts, upcoming noble arrivals, and recommended responses so trusted allies can step in during vulnerable windows.
- **Loyalty retention items:** Premium consumables can temporarily halt loyalty loss or double regen. Tooltips list duration, cooldowns, and stacking rules; balance tables track availability per world.
- **Warning systems:** Incoming noble waves surface in global alerts with unique sound + badge. Dashboard lists ETA, source village, and estimated loyalty damage so defenders can prioritize.
- **Simulation upgrades:** Combat sim factors noble survival probability (wall level, troop mix, morale) and flags scenarios where nobles likely die, enabling defenders to tune their snipes/support waves.

## Implementation Notes

- **Backend services:** Extend `VillageEconomyService` (or equivalent) with coin ticking tied to cron/polling as well as a deterministic formula for production duration: `baseDurationSeconds / worldSpeed / levelMultiplier`. Persist a snapshot on each tick to survive restarts.
- **API surface:** `/api/villages/[id]/noble-building` returns coin state, timers, storage cap, and the active noble training task. POST endpoints for starting production are unnecessary because coins auto mint; only noble training needs a mutation.
- **UI:** The building overview tiles show “Coins: X/Y” and a thin timer bar. Global header includes a nobles badge when any noble is training or ready. Timer tooltips expose precise finish timestamps for coin batches and training.
- **Bottleneck emphasis:** Coins intentionally throttle expansion, so analytics should log mint durations and idle-cap time to ensure balancing remains tight when tweaking world speeds or building bonuses.

## Outstanding Questions

1. How do tribe-specific or artifact bonuses interact with coin duration/storage (flat vs. percentage)?
2. Should premium currency accelerate coin minting or only the training queue?
3. Do conquered villages keep their existing coins or are they reset on takeover?

Document any answers in this file so engineering, design, and live-ops teams stay synchronized.
